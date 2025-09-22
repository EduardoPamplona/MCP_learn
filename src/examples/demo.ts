#!/usr/bin/env node

/**
 * Demo Script for MCP Learning Assistant
 * 
 * This script demonstrates the key features of the MCP Learning Assistant
 * in a non-interactive way, perfect for testing and showcasing the capabilities.
 */

import { MCPHost } from '../agent/mcp-host.js';
import { AIAgent } from '../agent/ai-agent.js';

async function runDemo(): Promise<void> {
  console.log('🎭 MCP Learning Assistant - Demo');
  console.log('='.repeat(40));
  
  const mcpHost = new MCPHost();
  const agent = new AIAgent(mcpHost);
  
  try {
    // Initialize
    console.log('\n🚀 Initializing the system...');
    await agent.initialize();
    
    // Demo 1: Weather Query
    console.log('\n🌤️  DEMO 1: Weather Information');
    console.log('-'.repeat(30));
    console.log('User: "What\'s the weather in London?"');
    
    const weatherResponse = await agent.processRequest("What's the weather in London?");
    console.log('\n🤖 Assistant:');
    console.log(weatherResponse.content);
    
    // Demo 2: Save a Note  
    console.log('\n📝 DEMO 2: Saving a Note');
    console.log('-'.repeat(30));
    console.log('User: "Save a note about buying groceries: milk, bread, eggs"');
    
    const saveResponse = await agent.processRequest("Save a note about buying groceries: milk, bread, eggs");
    console.log('\n🤖 Assistant:');
    console.log(saveResponse.content);
    
    // Demo 3: List Notes
    console.log('\n📋 DEMO 3: Listing All Notes');
    console.log('-'.repeat(30));
    console.log('User: "Show me all my notes"');
    
    const listResponse = await agent.processRequest("Show me all my notes");
    console.log('\n🤖 Assistant:');
    console.log(listResponse.content);
    
    // Demo 4: Help
    console.log('\n❓ DEMO 4: Getting Help');
    console.log('-'.repeat(30));
    console.log('User: "What can you help me with?"');
    
    const helpResponse = await agent.processRequest("What can you help me with?");
    console.log('\n🤖 Assistant:');
    console.log(helpResponse.content);
    
    // Show system status
    console.log('\n📊 SYSTEM STATUS');
    console.log('-'.repeat(30));
    const status = agent.getStatus();
    console.log(`✅ Agent Status: ${status.initialized ? 'Ready' : 'Not Ready'}`);
    console.log(`🔧 Available Tools: ${status.toolCount}`);
    console.log(`🖥️  Connected Servers: ${status.servers.length}`);
    
    status.servers.forEach(server => {
      console.log(`   • ${server.name}: ${server.status} (${server.tools.length} tools)`);
    });
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nTo try the interactive CLI, run: npm run agent');
    console.log('To see more examples, run: npm run examples');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  } finally {
    // Cleanup
    await mcpHost.shutdown();
  }
}

// Run the demo
runDemo().catch(error => {
  console.error('Fatal error in demo:', error);
  process.exit(1);
});