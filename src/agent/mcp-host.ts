/**
 * MCP Host - Manages connections to MCP servers
 * 
 * This class implements the client side of the Model Context Protocol (MCP).
 * It manages connections to multiple MCP servers and provides a unified interface
 * for the AI agent to interact with all available tools.
 * 
 * The MCP Host:
 * - Spawns and manages MCP server processes
 * - Maintains connections to all servers
 * - Provides a unified interface for tool discovery and execution
 * - Handles server lifecycle (start, stop, restart)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { 
  Tool, 
  CallToolResult, 
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPServerConfig, MCP_SERVERS } from '../shared/config.js';

/**
 * Information about a connected MCP server
 */
interface ConnectedServer {
  name: string;
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  process: ChildProcess;
  tools: Tool[];
}

/**
 * MCPHost manages all MCP server connections and provides a unified interface
 */
export class MCPHost {
  private servers: Map<string, ConnectedServer> = new Map();
  private isInitialized = false;

  /**
   * Initialize the MCP host and connect to all configured servers
   */
  async initialize(serverNames: string[] = Object.keys(MCP_SERVERS)): Promise<void> {
    console.log('🚀 Initializing MCP Host...');
    
    for (const serverName of serverNames) {
      const config = MCP_SERVERS[serverName];
      if (!config) {
        console.warn(`⚠️  Unknown server: ${serverName}`);
        continue;
      }

      try {
        await this.connectToServer(serverName, config);
        console.log(`✅ Connected to ${serverName} server`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${serverName} server:`, error);
        throw error;
      }
    }

    this.isInitialized = true;
    console.log(`🎉 MCP Host initialized with ${this.servers.size} servers`);
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(name: string, config: MCPServerConfig): Promise<void> {
    // Create transport that will spawn the server process
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env ? Object.fromEntries(
        Object.entries({ ...process.env, ...config.env }).filter(([, v]) => v !== undefined)
      ) as Record<string, string> : undefined,
    });

    const client = new Client(
      {
        name: 'mcp-learning-host',
        version: '1.0.0',
      }
    );

    // Connect to the server (this automatically starts the transport)
    await client.connect(transport);

    // Get available tools
    const toolsResult = await client.listTools();
    const tools = toolsResult.tools || [];

    // Store the server connection
    this.servers.set(name, {
      name,
      config,
      client,
      transport,
      process: (transport as any)._process, // Access the internal process for cleanup
      tools,
    });
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<Tool[]> {
    if (!this.isInitialized) {
      throw new Error('MCP Host not initialized. Call initialize() first.');
    }

    const allTools: Tool[] = [];
    
    for (const [serverKey, server] of this.servers) {
      // Add server name as a prefix to avoid tool name conflicts
      const prefixedTools = server.tools.map(tool => ({
        ...tool,
        name: `${serverKey}.${tool.name}`,
        description: `[${serverKey}] ${tool.description}`,
      }));
      
      allTools.push(...prefixedTools);
    }

    return allTools;
  }

  /**
   * Execute a tool on the appropriate server
   */
  async callTool(toolName: string, args: any): Promise<CallToolResult> {
    if (!this.isInitialized) {
      throw new Error('MCP Host not initialized. Call initialize() first.');
    }

    // Parse the tool name to get server and tool
    const [serverName, actualToolName] = toolName.includes('.') 
      ? toolName.split('.', 2)
      : [this.findServerForTool(toolName), toolName];

    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server not found: ${serverName}`);
    }

    // Check if the tool exists on this server
    const tool = server.tools.find(t => t.name === actualToolName);
    if (!tool) {
      throw new Error(`Tool '${actualToolName}' not found on server '${serverName}'`);
    }

    try {
      const result = await server.client.callTool({
        name: actualToolName,
        arguments: args,
      });

      return result as CallToolResult;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Find which server provides a specific tool (for backward compatibility)
   */
  private findServerForTool(toolName: string): string {
    for (const [serverName, server] of this.servers) {
      if (server.tools.some(tool => tool.name === toolName)) {
        return serverName;
      }
    }
    throw new Error(`Tool '${toolName}' not found on any server`);
  }

  /**
   * Get information about all connected servers
   */
  getServerInfo(): { name: string; tools: string[]; status: string }[] {
    return Array.from(this.servers.values()).map(server => ({
      name: server.name,
      tools: server.tools.map(tool => tool.name),
      status: 'connected',
    }));
  }

  /**
   * Gracefully shutdown all server connections
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down MCP Host...');
    
    for (const [name, server] of this.servers) {
      try {
        await server.client.close();
        server.process.kill();
        console.log(`✅ Disconnected from ${name} server`);
      } catch (error) {
        console.error(`❌ Error disconnecting from ${name} server:`, error);
      }
    }

    this.servers.clear();
    this.isInitialized = false;
    console.log('🎯 MCP Host shutdown complete');
  }

  /**
   * Check if the host is properly initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the number of connected servers
   */
  get serverCount(): number {
    return this.servers.size;
  }
}