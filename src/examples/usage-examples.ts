/**
 * Example Usage of MCP Learning Assistant
 * 
 * This file demonstrates how to use the MCP Learning Assistant programmatically
 * without the CLI interface. Useful for integration into other applications
 * or for automated testing.
 */

import { MCPHost } from '../agent/mcp-host.js';
import { AIAgent } from '../agent/ai-agent.js';

/**
 * Example: Using the AI Agent programmatically
 */
async function basicUsageExample(): Promise<void> {
  console.log('🚀 Starting Basic Usage Example\n');

  // Initialize the MCP host and AI agent
  const mcpHost = new MCPHost();
  const agent = new AIAgent(mcpHost);
  
  try {
    // Initialize the agent (this starts the MCP servers)
    await agent.initialize();
    console.log('✅ Agent initialized successfully\n');

    // Example 1: Get weather information
    console.log('📋 Example 1: Weather Query');
    const weatherResponse = await agent.processRequest('What\'s the weather in Paris?');
    console.log('Response:', weatherResponse.content);
    console.log('Tools used:', weatherResponse.toolsUsed);
    console.log('Success:', weatherResponse.success, '\n');

    // Example 2: Save a note
    console.log('📋 Example 2: Save Note');
    const saveNoteResponse = await agent.processRequest('Save a note about my meeting with John tomorrow at 3 PM');
    console.log('Response:', saveNoteResponse.content);
    console.log('Tools used:', saveNoteResponse.toolsUsed);
    console.log('Success:', saveNoteResponse.success, '\n');

    // Example 3: List notes
    console.log('📋 Example 3: List Notes');
    const listNotesResponse = await agent.processRequest('Show me all my notes');
    console.log('Response:', listNotesResponse.content);
    console.log('Tools used:', listNotesResponse.toolsUsed);
    console.log('Success:', listNotesResponse.success, '\n');

    // Example 4: Get help
    console.log('📋 Example 4: Help Request');
    const helpResponse = await agent.processRequest('What can you help me with?');
    console.log('Response:', helpResponse.content);
    console.log('Tools used:', helpResponse.toolsUsed);
    console.log('Success:', helpResponse.success, '\n');

  } catch (error) {
    console.error('❌ Error in example:', error);
  } finally {
    // Always cleanup
    await mcpHost.shutdown();
    console.log('🛑 Cleanup complete');
  }
}

/**
 * Example: Direct MCP tool usage
 */
async function directMCPUsageExample(): Promise<void> {
  console.log('🔧 Starting Direct MCP Usage Example\n');

  const mcpHost = new MCPHost();
  
  try {
    // Initialize MCP host
    await mcpHost.initialize();
    console.log('✅ MCP Host initialized\n');

    // Get all available tools
    const tools = await mcpHost.getAllTools();
    console.log('📋 Available tools:');
    tools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Direct tool calls
    console.log('🌤️ Calling weather tool directly:');
    const weatherResult = await mcpHost.callTool('weather.getWeather', { 
      location: 'Tokyo, Japan' 
    });
    console.log('Weather result:', weatherResult.content?.[0]?.type === 'text' ? weatherResult.content[0].text : 'No content');
    console.log();

    console.log('📝 Calling notes tools directly:');
    
    // Save a note
    const saveResult = await mcpHost.callTool('notes.saveNote', {
      title: 'Direct API Example',
      content: 'This note was saved using the MCP API directly',
      tags: ['example', 'api']
    });
    console.log('Save result:', saveResult.content?.[0]?.type === 'text' ? saveResult.content[0].text : 'No content');

    // List notes
    const listResult = await mcpHost.callTool('notes.listNotes', {});
    console.log('List result:', listResult.content?.[0]?.type === 'text' ? listResult.content[0].text : 'No content');

  } catch (error) {
    console.error('❌ Error in direct MCP example:', error);
  } finally {
    await mcpHost.shutdown();
    console.log('🛑 Cleanup complete');
  }
}

/**
 * Example: Error handling patterns
 */
async function errorHandlingExample(): Promise<void> {
  console.log('⚠️ Starting Error Handling Example\n');

  const mcpHost = new MCPHost();
  const agent = new AIAgent(mcpHost);
  
  try {
    await agent.initialize();

    // Example 1: Invalid tool call
    console.log('📋 Example 1: Invalid tool call');
    try {
      await mcpHost.callTool('nonexistent-tool', {});
    } catch (error) {
      console.log('Expected error caught:', error instanceof Error ? error.message : error);
    }

    // Example 2: Missing required parameters
    console.log('\n📋 Example 2: Missing required parameters');
    try {
      await mcpHost.callTool('weather.getWeather', {});
    } catch (error) {
      console.log('Expected error caught:', error instanceof Error ? error.message : error);
    }

    // Example 3: Agent handles unknown request gracefully
    console.log('\n📋 Example 3: Unknown request handling');
    const unknownResponse = await agent.processRequest('Can you solve world peace?');
    console.log('Response:', unknownResponse.content);
    console.log('Success:', unknownResponse.success);
    console.log('Error:', unknownResponse.error);

  } catch (error) {
    console.error('❌ Error in error handling example:', error);
  } finally {
    await mcpHost.shutdown();
  }
}

/**
 * Run all examples
 */
async function runAllExamples(): Promise<void> {
  console.log('🎯 MCP Learning Assistant - Examples\n');
  console.log('====================================\n');

  // Run each example with a delay between them
  await basicUsageExample();
  
  console.log('\n' + '='.repeat(50) + '\n');
  await directMCPUsageExample();
  
  console.log('\n' + '='.repeat(50) + '\n');
  await errorHandlingExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(error => {
    console.error('❌ Fatal error in examples:', error);
    process.exit(1);
  });
}

export {
  basicUsageExample,
  directMCPUsageExample,
  errorHandlingExample,
  runAllExamples
};