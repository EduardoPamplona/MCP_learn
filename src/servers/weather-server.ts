#!/usr/bin/env node

/**
 * Weather MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide weather information.
 * It exposes a 'getWeather' tool that can fetch current weather data for any location.
 * 
 * The MCP protocol allows AI assistants to interact with external tools and data sources
 * in a standardized way. This server acts as a bridge between the AI assistant and
 * weather APIs.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

/**
 * Weather data interface for type safety
 */
interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  timestamp: string;
}

/**
 * WeatherServer class implements the MCP server for weather functionality
 */
class WeatherServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'weather-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'getWeather',
            description: 'Get current weather information for a specific location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'The city and country/state for weather lookup (e.g., "New York, NY" or "London, UK")',
                },
              },
              required: ['location'],
            },
          } as Tool,
        ],
      };
    });

    // Handler for tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'getWeather') {
        return await this.handleGetWeather(args as { location: string });
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * Handle the getWeather tool call
   */
  private async handleGetWeather(args: { location: string }): Promise<CallToolResult> {
    try {
      const { location } = args;

      if (!location || location.trim() === '') {
        throw new Error('Location parameter is required and cannot be empty');
      }

      // For this learning example, we'll simulate weather data
      // In a real implementation, you would call an actual weather API like OpenWeatherMap
      const weatherData = await this.fetchWeatherData(location);

      const result: TextContent = {
        type: 'text',
        text: `Weather in ${weatherData.location}:
🌡️  Temperature: ${weatherData.temperature}°C
☁️  Conditions: ${weatherData.description}
💧 Humidity: ${weatherData.humidity}%
💨 Wind Speed: ${weatherData.windSpeed} km/h
🕐 Updated: ${weatherData.timestamp}`,
      };

      return {
        content: [result],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching weather data: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Simulate fetching weather data
   * In a real implementation, this would call an actual weather API
   */
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demonstration, generate realistic but random weather data
    const conditions = [
      'Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 
      'Heavy Rain', 'Snow', 'Foggy', 'Windy'
    ];
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const temperature = Math.round(Math.random() * 35 - 5); // -5°C to 30°C
    const humidity = Math.round(Math.random() * 100);
    const windSpeed = Math.round(Math.random() * 50);

    return {
      location: location,
      temperature,
      description: randomCondition,
      humidity,
      windSpeed,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP server running on stdio');
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new WeatherServer();
  server.start().catch(console.error);
}

export { WeatherServer };