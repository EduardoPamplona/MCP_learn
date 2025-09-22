#!/usr/bin/env node

/**
 * Gmail MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide Gmail integration.
 * It exposes tools to list, send, and delete emails, demonstrating how MCP can be used for
 * email management and communication.
 * 
 * Features:
 * - listEmails: List emails with optional filtering (labels, query, date range)
 * - sendEmail: Send emails with recipients, subject, and body
 * - deleteEmail: Delete emails by message ID
 * - OAuth 2.0 authentication with secure token management
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
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Gmail email interface for type safety
 */
interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  labels: string[];
}

/**
 * OAuth credentials interface
 */
interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

/**
 * Token storage interface
 */
interface TokenStorage {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

/**
 * GmailServer class implements the MCP server for Gmail functionality
 */
class GmailServer {
  private server: Server;
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;
  private credentialsPath: string;
  private tokenPath: string;

  constructor() {
    this.server = new Server({
      name: 'gmail-server',
      version: '1.0.0',
    });

    // Set up file paths for credentials and tokens
    const __dirname = dirname(fileURLToPath(import.meta.url));
    this.credentialsPath = join(__dirname, '../../data/gmail-credentials.json');
    this.tokenPath = join(__dirname, '../../data/gmail-token.json');

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
            name: 'listEmails',
            description: 'List emails from Gmail with optional filtering by labels, query, or date range',
            inputSchema: {
              type: 'object',
              properties: {
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of emails to return (default: 10, max: 100)',
                  default: 10,
                },
                query: {
                  type: 'string',
                  description: 'Gmail search query (e.g., "from:example@gmail.com", "has:attachment", "is:unread")',
                },
                labelIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of label IDs to filter by (e.g., ["INBOX", "UNREAD"])',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'sendEmail',
            description: 'Send an email via Gmail',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of recipient email addresses',
                },
                subject: {
                  type: 'string',
                  description: 'Email subject line',
                },
                body: {
                  type: 'string',
                  description: 'Email body content (plain text or HTML)',
                },
                cc: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of CC recipient email addresses (optional)',
                },
                bcc: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of BCC recipient email addresses (optional)',
                },
              },
              required: ['to', 'subject', 'body'],
            },
          } as Tool,
          {
            name: 'deleteEmail',
            description: 'Delete an email by its message ID',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The Gmail message ID to delete',
                },
              },
              required: ['messageId'],
            },
          } as Tool,
          {
            name: 'setupGmailAuth',
            description: 'Set up Gmail OAuth authentication (run this first)',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: {
                  type: 'string',
                  description: 'Google OAuth 2.0 client ID',
                },
                clientSecret: {
                  type: 'string',
                  description: 'Google OAuth 2.0 client secret',
                },
              },
              required: ['clientId', 'clientSecret'],
            },
          } as Tool,
        ],
      };
    });

    // Handler for tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'listEmails':
          return await this.handleListEmails(args as { maxResults?: number; query?: string; labelIds?: string[] });
        case 'sendEmail':
          return await this.handleSendEmail(args as { to: string[]; subject: string; body: string; cc?: string[]; bcc?: string[] });
        case 'deleteEmail':
          return await this.handleDeleteEmail(args as { messageId: string });
        case 'setupGmailAuth':
          return await this.handleSetupAuth(args as { clientId: string; clientSecret: string });
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Handle the setupGmailAuth tool call
   */
  private async handleSetupAuth(args: { clientId: string; clientSecret: string }): Promise<CallToolResult> {
    try {
      const { clientId, clientSecret } = args;

      if (!clientId || !clientSecret) {
        throw new Error('Both clientId and clientSecret are required');
      }

      // Save credentials
      const credentials: OAuthCredentials = {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: ['urn:ietf:wg:oauth:2.0:oob', 'http://localhost']
      };

      // Ensure data directory exists
      const dataDir = dirname(this.credentialsPath);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(this.credentialsPath, JSON.stringify(credentials, null, 2));

      // Initialize OAuth client
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      // Generate auth URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify'
        ],
      });

      const result: TextContent = {
        type: 'text',
        text: `Gmail OAuth setup initiated!

📋 Next steps:
1. Open this URL in your browser: ${authUrl}
2. Sign in to your Google account and grant permissions
3. Copy the authorization code you receive
4. Set the GMAIL_AUTH_CODE environment variable with the code
5. Restart the Gmail server to complete authentication

Example:
export GMAIL_AUTH_CODE="your_auth_code_here"

🔐 Credentials saved securely. You only need to do this setup once.`,
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
            text: `Error setting up Gmail authentication: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Initialize Gmail API connection
   */
  private async initializeGmailAPI(): Promise<void> {
    if (this.gmail) {
      return; // Already initialized
    }

    try {
      // Check for auth code from environment
      const authCode = process.env.GMAIL_AUTH_CODE;
      
      // Load credentials
      const credentialsContent = await fs.readFile(this.credentialsPath, 'utf8');
      const credentials: OAuthCredentials = JSON.parse(credentialsContent);

      // Initialize OAuth client
      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      // Try to load existing token
      let token: TokenStorage | null = null;
      try {
        const tokenContent = await fs.readFile(this.tokenPath, 'utf8');
        token = JSON.parse(tokenContent);
      } catch (error) {
        // Token file doesn't exist, will need to authenticate
      }

      if (authCode && !token) {
        // Exchange auth code for tokens
        const { tokens } = await this.oauth2Client.getToken(authCode);
        await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
        this.oauth2Client.setCredentials(tokens);
      } else if (token) {
        // Use existing token
        this.oauth2Client.setCredentials(token);
      } else {
        throw new Error('Gmail authentication not set up. Please run setupGmailAuth first.');
      }

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    } catch (error) {
      throw new Error(`Failed to initialize Gmail API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle the listEmails tool call
   */
  private async handleListEmails(args: { maxResults?: number; query?: string; labelIds?: string[] }): Promise<CallToolResult> {
    try {
      await this.initializeGmailAPI();

      const { maxResults = 10, query, labelIds } = args;

      // Validate maxResults
      const validMaxResults = Math.min(Math.max(1, maxResults), 100);

      const params: any = {
        userId: 'me',
        maxResults: validMaxResults,
      };

      if (query) {
        params.q = query;
      }

      if (labelIds && labelIds.length > 0) {
        params.labelIds = labelIds;
      }

      // List messages
      const response = await this.gmail.users.messages.list(params);
      const messages = response.data.messages || [];

      if (messages.length === 0) {
        const result: TextContent = {
          type: 'text',
          text: 'No emails found matching the criteria.',
        };

        return {
          content: [result],
          isError: false,
        };
      }

      // Get detailed information for each message
      const emailDetails: GmailEmail[] = [];
      for (const message of messages.slice(0, validMaxResults)) {
        try {
          const msgResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date'],
          });

          const headers = msgResponse.data.payload.headers || [];
          const email: GmailEmail = {
            id: message.id,
            threadId: message.threadId,
            subject: this.getHeaderValue(headers, 'Subject') || '(No Subject)',
            from: this.getHeaderValue(headers, 'From') || '',
            to: [this.getHeaderValue(headers, 'To') || ''],
            date: this.getHeaderValue(headers, 'Date') || '',
            snippet: msgResponse.data.snippet || '',
            labels: msgResponse.data.labelIds || [],
          };

          emailDetails.push(email);
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
        }
      }

      const result: TextContent = {
        type: 'text',
        text: `📧 Gmail Messages (${emailDetails.length} found):

${emailDetails.map((email, index) => `${index + 1}. 📩 ${email.subject}
   From: ${email.from}
   To: ${email.to.join(', ')}
   Date: ${email.date}
   ID: ${email.id}
   Preview: ${email.snippet}
   Labels: ${email.labels.join(', ')}`).join('\n\n')}`,
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
            text: `Error listing emails: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle the sendEmail tool call
   */
  private async handleSendEmail(args: { to: string[]; subject: string; body: string; cc?: string[]; bcc?: string[] }): Promise<CallToolResult> {
    try {
      await this.initializeGmailAPI();

      const { to, subject, body, cc, bcc } = args;

      if (!to || to.length === 0) {
        throw new Error('At least one recipient (to) is required');
      }

      if (!subject || !body) {
        throw new Error('Both subject and body are required');
      }

      // Construct email message
      const email = [
        `To: ${to.join(', ')}`,
        cc && cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
        bcc && bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
        `Subject: ${subject}`,
        '',
        body
      ].filter(line => line !== '').join('\n');

      // Encode email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      const result: TextContent = {
        type: 'text',
        text: `✅ Email sent successfully!
📩 Message ID: ${response.data.id}
📧 To: ${to.join(', ')}
${cc && cc.length > 0 ? `📧 CC: ${cc.join(', ')}\n` : ''}${bcc && bcc.length > 0 ? `📧 BCC: ${bcc.join(', ')}\n` : ''}📋 Subject: ${subject}
📅 Sent: ${new Date().toLocaleString()}`,
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
            text: `Error sending email: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle the deleteEmail tool call
   */
  private async handleDeleteEmail(args: { messageId: string }): Promise<CallToolResult> {
    try {
      await this.initializeGmailAPI();

      const { messageId } = args;

      if (!messageId) {
        throw new Error('Message ID is required');
      }

      // First, get the message details for confirmation
      const msgResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = msgResponse.data.payload.headers || [];
      const subject = this.getHeaderValue(headers, 'Subject') || '(No Subject)';
      const from = this.getHeaderValue(headers, 'From') || '';
      const date = this.getHeaderValue(headers, 'Date') || '';

      // Delete the message
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId,
      });

      const result: TextContent = {
        type: 'text',
        text: `🗑️ Email deleted successfully!
📩 Message ID: ${messageId}
📋 Subject: ${subject}
📧 From: ${from}
📅 Date: ${date}`,
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
            text: `Error deleting email: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Helper method to get header value by name
   */
  private getHeaderValue(headers: any[], name: string): string | null {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gmail MCP server running on stdio');
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GmailServer();
  server.start().catch(console.error);
}

export { GmailServer };