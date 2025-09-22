#!/usr/bin/env node

/**
 * Notes MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide personal notes management.
 * It exposes tools to save and list personal notes, demonstrating how MCP can be used for
 * data persistence and retrieval.
 * 
 * Features:
 * - saveNote: Save a new note with title and content
 * - listNotes: List all saved notes
 * - getNoteById: Retrieve a specific note by ID
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
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Note interface for type safety
 */
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

/**
 * NotesServer class implements the MCP server for notes functionality
 */
class NotesServer {
  private server: Server;
  private notesFile: string;
  private notes: Note[] = [];

  constructor() {
    // Get the current file's directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Store notes in a JSON file in the project directory
    this.notesFile = join(__dirname, '../../data/notes.json');

    this.server = new Server(
      {
        name: 'notes-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
    this.loadNotes();
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
            name: 'saveNote',
            description: 'Save a new personal note with title and content',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the note',
                },
                content: {
                  type: 'string',
                  description: 'The content/body of the note',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for organizing the note',
                },
              },
              required: ['title', 'content'],
            },
          } as Tool,
          {
            name: 'listNotes',
            description: 'List all saved notes with their titles and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                tag: {
                  type: 'string',
                  description: 'Optional tag to filter notes',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'getNoteById',
            description: 'Retrieve the full content of a specific note by its ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The unique ID of the note to retrieve',
                },
              },
              required: ['id'],
            },
          } as Tool,
        ],
      };
    });

    // Handler for tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'saveNote':
          return await this.handleSaveNote(args as { title: string; content: string; tags?: string[] });
        case 'listNotes':
          return await this.handleListNotes(args as { tag?: string });
        case 'getNoteById':
          return await this.handleGetNoteById(args as { id: string });
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Load notes from the JSON file
   */
  private async loadNotes(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = dirname(this.notesFile);
      await fs.mkdir(dataDir, { recursive: true });

      const data = await fs.readFile(this.notesFile, 'utf-8');
      this.notes = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty notes array
      this.notes = [];
      await this.saveNotesToFile();
    }
  }

  /**
   * Save notes to the JSON file
   */
  private async saveNotesToFile(): Promise<void> {
    try {
      await fs.writeFile(this.notesFile, JSON.stringify(this.notes, null, 2));
    } catch (error) {
      console.error('Error saving notes to file:', error);
      throw new Error('Failed to save notes');
    }
  }

  /**
   * Generate a unique ID for a new note
   */
  private generateNoteId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Handle the saveNote tool call
   */
  private async handleSaveNote(args: { title: string; content: string; tags?: string[] }): Promise<CallToolResult> {
    try {
      const { title, content, tags = [] } = args;

      if (!title || title.trim() === '') {
        throw new Error('Note title is required and cannot be empty');
      }

      if (!content || content.trim() === '') {
        throw new Error('Note content is required and cannot be empty');
      }

      const now = new Date().toISOString();
      const newNote: Note = {
        id: this.generateNoteId(),
        title: title.trim(),
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
        tags: tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
      };

      this.notes.push(newNote);
      await this.saveNotesToFile();

      const result: TextContent = {
        type: 'text',
        text: `Note saved successfully!
📝 ID: ${newNote.id}
📋 Title: ${newNote.title}
🏷️  Tags: ${newNote.tags && newNote.tags.length > 0 ? newNote.tags.join(', ') : 'None'}
📅 Created: ${new Date(newNote.createdAt).toLocaleString()}`,
      };

      return { content: [result], isError: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text: `Error saving note: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle the listNotes tool call
   */
  private async handleListNotes(args: { tag?: string }): Promise<CallToolResult> {
    try {
      let notesToList = this.notes;

      // Filter by tag if provided
      if (args.tag) {
        notesToList = this.notes.filter(note => 
          note.tags?.some(tag => tag.toLowerCase().includes(args.tag!.toLowerCase()))
        );
      }

      if (notesToList.length === 0) {
        const message = args.tag 
          ? `No notes found with tag "${args.tag}"` 
          : 'No notes found. Create your first note with the saveNote tool!';
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
          isError: false,
        };
      }

      // Sort notes by creation date (newest first)
      notesToList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const notesList = notesToList.map((note, index) => {
        const preview = note.content.length > 100 
          ? note.content.substring(0, 100) + '...' 
          : note.content;
        
        return `${index + 1}. 📝 ${note.title}
   ID: ${note.id}
   Created: ${new Date(note.createdAt).toLocaleString()}
   Tags: ${note.tags?.join(', ') || 'None'}
   Preview: ${preview}`;
      }).join('\n\n');

      const header = args.tag 
        ? `Notes with tag "${args.tag}" (${notesToList.length} found):\n\n`
        : `All Notes (${notesToList.length} total):\n\n`;

      return {
        content: [
          {
            type: 'text',
            text: header + notesList,
          },
        ],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text: `Error listing notes: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle the getNoteById tool call
   */
  private async handleGetNoteById(args: { id: string }): Promise<CallToolResult> {
    try {
      const { id } = args;

      if (!id || id.trim() === '') {
        throw new Error('Note ID is required and cannot be empty');
      }

      const note = this.notes.find(n => n.id === id.trim());

      if (!note) {
        return {
          content: [
            {
              type: 'text',
              text: `Note with ID "${id}" not found. Use listNotes to see available notes.`,
            },
          ],
          isError: false,
        };
      }

      const result: TextContent = {
        type: 'text',
        text: `📝 ${note.title}
🆔 ID: ${note.id}
📅 Created: ${new Date(note.createdAt).toLocaleString()}
📅 Updated: ${new Date(note.updatedAt).toLocaleString()}
🏷️  Tags: ${note.tags?.join(', ') || 'None'}

📄 Content:
${note.content}`,
      };

      return { content: [result], isError: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving note: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Notes MCP server running on stdio');
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new NotesServer();
  server.start().catch(console.error);
}

export { NotesServer };