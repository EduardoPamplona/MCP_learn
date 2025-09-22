/**
 * AI Agent Orchestrator
 * 
 * This class implements a simple AI agent that orchestrates requests between
 * user input, MCP tools, and responses. In a production environment, this would
 * integrate with an actual LLM service like OpenAI, Anthropic, or others.
 * 
 * For this learning project, we implement a rule-based system that demonstrates
 * the MCP integration patterns and can be easily extended with real LLM integration.
 */

import { MCPHost } from './mcp-host.js';
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_AGENT_CONFIG } from '../shared/config.js';

/**
 * Response from the AI agent
 */
export interface AgentResponse {
  content: string;
  toolsUsed: string[];
  success: boolean;
  error?: string;
}

/**
 * Intent classification for user requests
 */
interface Intent {
  type: 'weather' | 'notes' | 'help' | 'unknown';
  confidence: number;
  entities: Record<string, any>;
}

/**
 * AIAgent orchestrates user requests using MCP tools
 */
export class AIAgent {
  private mcpHost: MCPHost;
  private availableTools: Tool[] = [];

  constructor(mcpHost: MCPHost) {
    this.mcpHost = mcpHost;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (!this.mcpHost.initialized) {
      await this.mcpHost.initialize();
    }
    
    this.availableTools = await this.mcpHost.getAllTools();
    console.log(`🤖 AI Agent initialized with ${this.availableTools.length} tools`);
  }

  /**
   * Process a user request and return a response
   */
  async processRequest(userInput: string): Promise<AgentResponse> {
    try {
      console.log(`🧠 Processing request: "${userInput}"`);
      
      // Classify the user's intent
      const intent = this.classifyIntent(userInput);
      console.log(`📋 Classified intent: ${intent.type} (confidence: ${intent.confidence})`);

      // Route the request based on intent
      switch (intent.type) {
        case 'weather':
          return await this.handleWeatherRequest(userInput, intent);
        
        case 'notes':
          return await this.handleNotesRequest(userInput, intent);
        
        case 'help':
          return this.handleHelpRequest();
        
        default:
          return this.handleUnknownRequest(userInput);
      }
    } catch (error) {
      console.error('❌ Error processing request:', error);
      return {
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Classify user intent using simple pattern matching
   * In a real implementation, this would use an NLU service or LLM
   */
  private classifyIntent(input: string): Intent {
    const lowercaseInput = input.toLowerCase();
    
    // Weather patterns
    const weatherPatterns = [
      /weather/i,
      /temperature/i,
      /forecast/i,
      /raining/i,
      /sunny/i,
      /cloudy/i,
      /how.*(hot|cold|warm)/i,
      /what.*(weather|temperature)/i,
    ];

    // Notes patterns
    const notesPatterns = [
      /save.*note/i,
      /create.*note/i,
      /write.*note/i,
      /remember/i,
      /list.*notes/i,
      /show.*notes/i,
      /my notes/i,
      /note.*about/i,
      /take.*note/i,
      /get.*note/i,
      /find.*note/i,
    ];

    // Help patterns
    const helpPatterns = [
      /help/i,
      /what.*can.*do/i,
      /commands/i,
      /how.*use/i,
      /capabilities/i,
    ];

    // Check for weather intent
    for (const pattern of weatherPatterns) {
      if (pattern.test(lowercaseInput)) {
        const location = this.extractLocation(input);
        return {
          type: 'weather',
          confidence: 0.8,
          entities: { location },
        };
      }
    }

    // Check for notes intent
    for (const pattern of notesPatterns) {
      if (pattern.test(lowercaseInput)) {
        const noteData = this.extractNoteData(input);
        return {
          type: 'notes',
          confidence: 0.8,
          entities: noteData,
        };
      }
    }

    // Check for help intent
    for (const pattern of helpPatterns) {
      if (pattern.test(lowercaseInput)) {
        return {
          type: 'help',
          confidence: 0.9,
          entities: {},
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 0.1,
      entities: {},
    };
  }

  /**
   * Extract location from weather requests
   */
  private extractLocation(input: string): string {
    // Simple pattern to extract location after "in", "for", "at"
    const locationMatch = input.match(/(?:in|for|at)\s+([^?.,!]+)/i);
    if (locationMatch) {
      return locationMatch[1].trim();
    }

    // Default to a common location if none specified
    return 'New York, NY';
  }

  /**
   * Extract note data from notes requests
   */
  private extractNoteData(input: string): { action: string; title?: string; content?: string; id?: string } {
    const lowercaseInput = input.toLowerCase();
    
    if (lowercaseInput.includes('list') || lowercaseInput.includes('show')) {
      return { action: 'list' };
    }
    
    if (lowercaseInput.includes('save') || lowercaseInput.includes('create') || lowercaseInput.includes('write')) {
      // Try to extract title and content
      const aboutMatch = input.match(/note about (.+)/i);
      if (aboutMatch) {
        const content = aboutMatch[1].trim();
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        return { action: 'save', title, content };
      }
      
      return { action: 'save', title: 'Quick Note', content: input };
    }

    if (lowercaseInput.includes('get') || lowercaseInput.includes('find')) {
      return { action: 'get' };
    }

    return { action: 'list' };
  }

  /**
   * Handle weather-related requests
   */
  private async handleWeatherRequest(input: string, intent: Intent): Promise<AgentResponse> {
    const location = intent.entities.location || 'New York, NY';
    
    try {
      const result = await this.mcpHost.callTool('weather.getWeather', { location });
      
      const content = result.content
        ?.map(c => c.type === 'text' ? c.text : '')
        .join('\n') || 'No weather data available';

      return {
        content: `Here's the current weather information:\n\n${content}`,
        toolsUsed: ['getWeather'],
        success: true,
      };
    } catch (error) {
      return {
        content: `Sorry, I couldn't get the weather information for ${location}. ${error instanceof Error ? error.message : ''}`,
        toolsUsed: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle notes-related requests
   */
  private async handleNotesRequest(input: string, intent: Intent): Promise<AgentResponse> {
    const { action, title, content, id } = intent.entities;
    
    try {
      let result: CallToolResult;
      let toolUsed: string;

      switch (action) {
        case 'save':
          if (!title || !content) {
            return {
              content: 'To save a note, please provide both a title and content. For example: "Save a note about my doctor appointment tomorrow at 3 PM"',
              toolsUsed: [],
              success: false,
              error: 'Missing title or content',
            };
          }
          result = await this.mcpHost.callTool('notes.saveNote', { title, content });
          toolUsed = 'saveNote';
          break;

        case 'list':
          result = await this.mcpHost.callTool('notes.listNotes', {});
          toolUsed = 'listNotes';
          break;

        case 'get':
          if (!id) {
            // If no ID provided, list notes first
            result = await this.mcpHost.callTool('notes.listNotes', {});
            toolUsed = 'listNotes';
          } else {
            result = await this.mcpHost.callTool('notes.getNoteById', { id });
            toolUsed = 'getNoteById';
          }
          break;

        default:
          result = await this.mcpHost.callTool('notes.listNotes', {});
          toolUsed = 'listNotes';
      }

      const responseContent = result.content
        ?.map(c => c.type === 'text' ? c.text : '')
        .join('\n') || 'No response from notes server';

      return {
        content: responseContent,
        toolsUsed: [toolUsed],
        success: true,
      };
    } catch (error) {
      return {
        content: `Sorry, I couldn't process your notes request. ${error instanceof Error ? error.message : ''}`,
        toolsUsed: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle help requests
   */
  private handleHelpRequest(): AgentResponse {
    const helpContent = `🤖 MCP Learning Assistant Help

I can help you with the following:

🌤️  **Weather Information**
   • "What's the weather in New York?"
   • "How's the weather in Tokyo today?"
   • "Get me the weather for London, UK"

📝 **Personal Notes Management**
   • "Save a note about my meeting tomorrow"
   • "List all my notes"
   • "Remember that I need to buy groceries"
   • "Show me my notes"

🔧 **Available Tools:**
${this.availableTools.map(tool => `   • ${tool.name}: ${tool.description}`).join('\n')}

💡 **Tips:**
   • Be specific with locations for weather requests
   • For notes, include both what you want to remember and a clear title
   • I can manage multiple notes and help you organize them

Type your request naturally - I'll understand what you want to do!`;

    return {
      content: helpContent,
      toolsUsed: [],
      success: true,
    };
  }

  /**
   * Handle unknown requests
   */
  private handleUnknownRequest(input: string): AgentResponse {
    return {
      content: `I'm not sure how to help with that request. I can help you with:

🌤️  Weather information - try "What's the weather in [location]?"
📝 Note management - try "Save a note about..." or "List my notes"
❓ Help - type "help" to see all available commands

Please rephrase your request, or type "help" for more information.`,
      toolsUsed: [],
      success: false,
      error: 'Unknown intent',
    };
  }

  /**
   * Get agent status and available tools
   */
  getStatus(): { initialized: boolean; toolCount: number; servers: any[] } {
    return {
      initialized: this.mcpHost.initialized,
      toolCount: this.availableTools.length,
      servers: this.mcpHost.getServerInfo(),
    };
  }
}