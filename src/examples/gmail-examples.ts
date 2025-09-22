#!/usr/bin/env node

/**
 * Gmail MCP Server Examples
 * 
 * This file demonstrates how to use the Gmail MCP server for email operations.
 * It shows both direct tool usage and agent-based interactions.
 */

import { MCPHost } from '../agent/mcp-host.js';
import { AIAgent } from '../agent/ai-agent.js';

/**
 * Example: Direct Gmail MCP tool usage
 */
async function directGmailUsageExample(): Promise<void> {
  console.log('📧 Starting Direct Gmail MCP Usage Example\n');

  const mcpHost = new MCPHost();
  
  try {
    // Initialize MCP host with Gmail server
    await mcpHost.initialize(['gmail']);
    console.log('✅ Gmail MCP Host initialized\n');

    // Get available Gmail tools
    const tools = await mcpHost.getAllTools();
    const gmailTools = tools.filter(tool => tool.name.startsWith('gmail.'));
    
    console.log('📋 Available Gmail tools:');
    gmailTools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Example 1: Setup Gmail Auth (mock example - would fail without real credentials)
    console.log('🔐 Example 1: Setup Gmail Authentication');
    try {
      const setupResult = await mcpHost.callTool('gmail.setupGmailAuth', {
        clientId: 'example_client_id',
        clientSecret: 'example_client_secret'
      });
      console.log('Setup result:', setupResult.content?.[0]?.type === 'text' ? setupResult.content[0].text : 'Setup initiated');
    } catch (error) {
      console.log('Expected: Setup requires real credentials for actual authentication');
    }
    console.log();

    // Example 2: List Emails (will fail without authentication, but shows the interface)
    console.log('📋 Example 2: List Emails');
    try {
      const listResult = await mcpHost.callTool('gmail.listEmails', {
        maxResults: 5,
        query: 'is:unread'
      });
      console.log('List result:', listResult.content?.[0]?.type === 'text' ? listResult.content[0].text : 'No content');
    } catch (error) {
      console.log('Expected: Requires Gmail authentication to be set up first');
    }
    console.log();

    // Example 3: Send Email (will fail without authentication, but shows the interface)
    console.log('📩 Example 3: Send Email');
    try {
      const sendResult = await mcpHost.callTool('gmail.sendEmail', {
        to: ['example@gmail.com'],
        subject: 'Test Email from MCP',
        body: 'This is a test email sent through the Gmail MCP server.',
        cc: ['cc@example.com']
      });
      console.log('Send result:', sendResult.content?.[0]?.type === 'text' ? sendResult.content[0].text : 'No content');
    } catch (error) {
      console.log('Expected: Requires Gmail authentication to be set up first');
    }
    console.log();

    // Example 4: Delete Email (will fail without authentication, but shows the interface)
    console.log('🗑️  Example 4: Delete Email');
    try {
      const deleteResult = await mcpHost.callTool('gmail.deleteEmail', {
        messageId: 'example_message_id_123'
      });
      console.log('Delete result:', deleteResult.content?.[0]?.type === 'text' ? deleteResult.content[0].text : 'No content');
    } catch (error) {
      console.log('Expected: Requires Gmail authentication and valid message ID');
    }

  } catch (error) {
    console.error('❌ Error in direct Gmail example:', error);
  } finally {
    await mcpHost.shutdown();
    console.log('🛑 Cleanup complete');
  }
}

/**
 * Example: Using Gmail through the AI Agent
 */
async function agentGmailUsageExample(): Promise<void> {
  console.log('\n📧 Starting Gmail AI Agent Example\n');

  const mcpHost = new MCPHost();
  const agent = new AIAgent(mcpHost);
  
  try {
    // Initialize agent with all servers including Gmail
    await agent.initialize();
    console.log('✅ AI Agent with Gmail initialized\n');

    // Example 1: Gmail intent classification
    console.log('🧠 Example 1: Gmail Request Classification');
    const gmailRequests = [
      'Show me my latest emails',
      'Send an email to john@example.com about the meeting',
      'List unread emails',
      'Delete email with ID abc123',
      'Check my inbox',
      'Compose an email to team@company.com subject Project Update'
    ];

    for (const request of gmailRequests) {
      console.log(`Request: "${request}"`);
      const response = await agent.processRequest(request);
      console.log(`Classification: ${response.success ? 'Gmail intent detected' : 'Failed - ' + response.error}`);
      console.log(`Response preview: ${response.content.substring(0, 100)}...`);
      console.log();
    }

    // Example 2: Error handling for unauthenticated Gmail requests
    console.log('⚠️  Example 2: Gmail Error Handling');
    const errorResponse = await agent.processRequest('Show me my latest emails');
    console.log('Response:', errorResponse.content);
    console.log('Success:', errorResponse.success);
    console.log('Tools attempted:', errorResponse.toolsUsed);

  } catch (error) {
    console.error('❌ Error in agent Gmail example:', error);
  } finally {
    await mcpHost.shutdown();
    console.log('🛑 Cleanup complete');
  }
}

/**
 * Example: Email parsing and extraction
 */
async function emailParsingExample(): Promise<void> {
  console.log('\n🔍 Starting Email Parsing Example\n');

  // Simulate the email data extraction logic
  const testInputs = [
    'Send an email to john@example.com about the meeting tomorrow',
    'Compose an email to team@company.com subject Project Update with message Hello team, here is our weekly update.',
    'Send email to boss@work.com and manager@work.com about vacation request',
    'Email alice@example.com regarding the proposal deadline',
    'Delete email with ID 1a2b3c4d5e',
    'Show me emails from sarah@company.com',
    'List unread emails in my inbox'
  ];

  // Mock of the email data extraction function from the agent
  function extractEmailData(input: string): { action: string; to?: string[]; subject?: string; body?: string; messageId?: string; query?: string } {
    const lowercaseInput = input.toLowerCase();
    
    if (lowercaseInput.includes('delete')) {
      const idMatch = input.match(/(?:id|message)\s*[:\s]+([a-zA-Z0-9]+)/i);
      return { 
        action: 'delete', 
        messageId: idMatch ? idMatch[1] : ''
      };
    }
    
    if (lowercaseInput.includes('list') || lowercaseInput.includes('show') || lowercaseInput.includes('check')) {
      let query = '';
      if (lowercaseInput.includes('unread')) {
        query = 'is:unread';
      } else if (lowercaseInput.includes('from')) {
        const fromMatch = input.match(/from\s+([^\s]+)/i);
        if (fromMatch) query = `from:${fromMatch[1]}`;
      }
      
      return { action: 'list', query };
    }
    
    if (lowercaseInput.includes('send') || lowercaseInput.includes('compose') || lowercaseInput.includes('email')) {
      // Extract recipient email addresses
      const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/g;
      const emails = input.match(emailPattern) || [];
      
      // Extract subject
      const subjectMatch = input.match(/(?:subject|about|regarding)\s*(.+?)(?:\s+with\s+message|\s+body|$)/i);
      let subject = subjectMatch ? subjectMatch[1].trim() : '';
      
      // Extract body content
      const bodyMatch = input.match(/(?:with\s+message|body:|message:|content:|saying?)\s*(.+)$/i);
      let body = bodyMatch ? bodyMatch[1].trim() : '';
      
      return { 
        action: 'send', 
        to: emails.length > 0 ? emails : [], 
        subject: subject || 'Message from MCP Assistant',
        body: body || input
      };
    }
    
    return { action: 'list' };
  }

  console.log('📋 Email Data Extraction Examples:');
  testInputs.forEach((input, index) => {
    console.log(`\n${index + 1}. Input: "${input}"`);
    const extracted = extractEmailData(input);
    console.log('   Extracted data:', JSON.stringify(extracted, null, 2));
  });
}

/**
 * Example: Gmail API schema demonstration
 */
async function gmailSchemaExample(): Promise<void> {
  console.log('\n📊 Gmail MCP Server Schema Example\n');

  const mcpHost = new MCPHost();
  
  try {
    await mcpHost.initialize(['gmail']);
    
    const tools = await mcpHost.getAllTools();
    const gmailTools = tools.filter(tool => tool.name.startsWith('gmail.'));
    
    console.log('📋 Gmail Tools Schema:');
    gmailTools.forEach(tool => {
      console.log(`\n🔧 ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      console.log('   Input Schema:');
      console.log('   ', JSON.stringify(tool.inputSchema, null, 4));
    });

  } catch (error) {
    console.error('❌ Error in schema example:', error);
  } finally {
    await mcpHost.shutdown();
  }
}

/**
 * Run all Gmail examples
 */
async function runAllGmailExamples(): Promise<void> {
  console.log('🎯 Gmail MCP Server - Examples\n');
  console.log('====================================\n');

  try {
    await directGmailUsageExample();
    await agentGmailUsageExample();
    await emailParsingExample();
    await gmailSchemaExample();
    
    console.log('\n🎉 All Gmail examples completed!');
  } catch (error) {
    console.error('❌ Fatal error in Gmail examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllGmailExamples().catch(error => {
    console.error('❌ Fatal error in Gmail examples:', error);
    process.exit(1);
  });
}

export {
  directGmailUsageExample,
  agentGmailUsageExample,
  emailParsingExample,
  gmailSchemaExample,
  runAllGmailExamples
};