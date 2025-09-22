/**
 * Shared types and interfaces for the MCP Learn project
 */

/**
 * Configuration for MCP servers
 */
export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Available MCP servers in our system
 */
export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  weather: {
    name: 'weather-server',
    command: 'tsx',
    args: ['src/servers/weather-server.ts'],
  },
  notes: {
    name: 'notes-server', 
    command: 'tsx',
    args: ['src/servers/notes-server.ts'],
  },
};

/**
 * AI agent configuration
 */
export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  mcpServers: string[];
}

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: 'MCP Learning Assistant',
  description: 'An AI assistant that can help with weather information and note management using MCP',
  systemPrompt: `You are a helpful AI assistant with access to weather information and personal note management capabilities through the Model Context Protocol (MCP).

Available tools:
- Weather: Use getWeather to fetch current weather information for any location
- Notes: Use saveNote to save personal notes, listNotes to view all notes, and getNoteById to retrieve specific notes

When users ask about weather, use the getWeather tool with the location they specify.
When users want to save information, use the saveNote tool with an appropriate title and content.
When users want to see their notes, use listNotes to show all notes or getNoteById for specific notes.

Always be helpful, informative, and explain what you're doing when using these tools.
Format responses in a clear, user-friendly way.`,
  mcpServers: ['weather', 'notes'],
};

/**
 * CLI Commands configuration
 */
export interface CLICommand {
  name: string;
  description: string;
  examples: string[];
}

export const CLI_COMMANDS: CLICommand[] = [
  {
    name: 'weather',
    description: 'Get weather information for a location',
    examples: [
      'What\'s the weather in New York?',
      'How\'s the weather in Tokyo today?',
      'Get me the weather for London, UK',
    ],
  },
  {
    name: 'notes',
    description: 'Manage your personal notes',
    examples: [
      'Save a note about my meeting tomorrow',
      'List all my notes',
      'Show me my shopping list note',
    ],
  },
  {
    name: 'help',
    description: 'Show available commands and examples',
    examples: [
      'help',
      'what can you do?',
      'show me the available commands',
    ],
  },
];