# MCP Learning Assistant

A comprehensive learning project demonstrating the **Model Context Protocol (MCP)** by building an AI agent that connects to weather, notes, and Gmail services.

## 🎯 Project Overview

This project implements an AI agent that uses MCP to provide:
- 🌤️ **Weather Information** - Real-time weather data for any location
- 📝 **Personal Notes Management** - Save, retrieve, and organize personal notes
- 📧 **Gmail Integration** - List, send, and delete emails through Gmail API
- 🤖 **Natural Language Interface** - Interact using plain English commands

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Interface │────│   AI Agent       │────│   MCP Host      │
│                 │    │   Orchestrator   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
                         ┌──────────────┐               │
                         │ Natural      │               │
                         │ Language     │               │
                         │ Processing   │               │
                         └──────────────┘               │
                                                        │
           ┌────────────────────────────────────────────┴────────────────────────────────────┐
           │                                                                                  │
   ┌───────▼────────┐                 ┌────────▼─────────┐                 ┌────────▼─────────┐
   │ Weather Server │                 │  Notes Server    │                 │  Gmail Server    │
   │ (MCP)          │                 │  (MCP)           │                 │  (MCP)           │
   │                │                 │                  │                 │                  │
   │ Tools:         │                 │ Tools:           │                 │ Tools:           │
   │ • getWeather   │                 │ • saveNote       │                 │ • listEmails     │
   └────────────────┘                 │ • listNotes      │                 │ • sendEmail      │
                                      │ • getNoteById    │                 │ • deleteEmail    │
                                      └──────────────────┘                 │ • setupGmailAuth │
                                                                           └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd MCP_learn
npm install
```

2. **Build the project:**
```bash
npm run build
```

3. **Start the interactive assistant:**
```bash
npm run agent
# or for development:
npm run dev
```

### Usage Examples

#### Interactive Mode
```bash
npm run agent

🤖 Welcome to MCP Learning Assistant!

You: What's the weather in Tokyo?
🤖 Assistant: Here's the current weather information:

🌡️  Temperature: 22°C
☁️  Conditions: Partly Cloudy
💧 Humidity: 65%
💨 Wind Speed: 12 km/h
🕐 Updated: 2024-01-15T10:30:00.000Z

You: Save a note about my dentist appointment tomorrow at 2 PM
🤖 Assistant: Note saved successfully!
📝 ID: abc123
📋 Title: Dentist appointment
🏷️  Tags: None
📅 Created: 1/15/2024, 10:30:45 AM

You: Show me my latest emails
🤖 Assistant: 📧 Gmail Messages (5 found):

1. 📩 Project Update Meeting
   From: boss@company.com
   To: you@email.com
   Date: Mon, 15 Jan 2024 09:15:23 GMT
   ID: 1a2b3c4d5e6f
   Preview: Hi team, let's schedule our weekly project review...
   Labels: INBOX, IMPORTANT
```

#### Single Commands
```bash
# Ask a question and exit
npm run agent ask "What's the weather in London?"

# Show system status
npm run agent status
```

## 🛠️ MCP Servers

### Weather Server
Located at `src/servers/weather-server.ts`

**Tools:**
- `getWeather(location: string)` - Get weather information for a location

**Features:**
- Real-time weather simulation
- Location-based queries
- Detailed weather metrics (temperature, humidity, wind speed)

### Notes Server  
Located at `src/servers/notes-server.ts`

**Tools:**
- `saveNote(title: string, content: string, tags?: string[])` - Save a new note
- `listNotes(tag?: string)` - List all notes or filter by tag
- `getNoteById(id: string)` - Retrieve a specific note

**Features:**
- Persistent storage (JSON file)
- Tag-based organization
- Full-text note content
- Metadata tracking (created/updated dates)

### Gmail Server
Located at `src/servers/gmail-server.ts`

**Tools:**
- `listEmails(maxResults?: number, query?: string, labelIds?: string[])` - List emails with filtering
- `sendEmail(to: string[], subject: string, body: string, cc?: string[], bcc?: string[])` - Send emails
- `deleteEmail(messageId: string)` - Delete an email by ID
- `setupGmailAuth(clientId: string, clientSecret: string)` - Configure OAuth authentication

**Features:**
- OAuth 2.0 authentication with Google
- Full Gmail API integration
- Secure credential management
- Support for email filtering and search
- CC/BCC support for sending emails

**Setup Required:**
- Google Cloud Project with Gmail API enabled
- OAuth 2.0 credentials
- See [Gmail Setup Guide](docs/gmail-setup.md) for detailed instructions

## 🧠 AI Agent

The AI Agent (`src/agent/ai-agent.ts`) provides:

### Intent Classification
- Natural language understanding using pattern matching
- Context extraction (locations, note content, email data, etc.)
- Confidence scoring

### Request Routing
- Automatic tool selection based on intent
- Error handling and fallback responses
- Multi-step conversations

### Response Generation
- User-friendly formatting
- Tool usage transparency
- Error explanations

### Supported Intents
- **Weather**: Location-based weather queries
- **Notes**: Note creation, listing, and retrieval
- **Gmail**: Email listing, sending, and deletion
- **Help**: Command assistance and tool discovery

## 🔧 Development

### Project Structure
```
src/
├── agent/
│   ├── ai-agent.ts      # AI orchestrator with NLU
│   ├── cli.ts           # Command-line interface
│   └── mcp-host.ts      # MCP server connection manager
├── servers/
│   ├── weather-server.ts # Weather MCP server
│   ├── notes-server.ts   # Notes MCP server
│   └── gmail-server.ts   # Gmail MCP server
├── shared/
│   └── config.ts        # Shared configuration and types
├── examples/
│   ├── usage-examples.ts # General usage examples
│   └── gmail-examples.ts # Gmail-specific examples
└── index.ts             # Main entry point
```

### Available Scripts
```bash
npm run build        # Compile TypeScript
npm run dev          # Start with hot reload
npm run start        # Start compiled version
npm run agent        # Start CLI interface
npm run weather-server # Start weather server only
npm run notes-server   # Start notes server only
npm run gmail-server   # Start Gmail server only
npm run examples     # Run general usage examples
npm run gmail-examples # Run Gmail-specific examples
```

### Testing the Servers

**Test Weather Server:**
```bash
# In one terminal
npm run weather-server

# In another terminal
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm run weather-server
```

**Test Notes Server:**
```bash
# In one terminal  
npm run notes-server

# In another terminal
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm run notes-server
```

## 📚 Learning Objectives

This project teaches:

### 1. **MCP Protocol Fundamentals**
- Server/client architecture
- Tool definition and registration
- Request/response patterns
- Transport mechanisms (stdio)

### 2. **MCP Server Development**
- Implementing MCP servers with the SDK
- Tool schema definition
- Error handling patterns
- Resource management

### 3. **MCP Client Integration**
- Connecting to multiple MCP servers
- Managing server lifecycle
- Tool discovery and execution
- Unified tool interface

### 4. **AI Agent Architecture**
- Intent classification and NLU
- Request orchestration
- Context management
- Response generation

### 5. **Production Patterns**
- Error handling and recovery
- Logging and monitoring
- Configuration management
- Graceful shutdown

## 🔍 Code Examples

### Creating a Simple MCP Server
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: 'myTool',
      description: 'A simple tool',
      inputSchema: {
        type: 'object',
        properties: { input: { type: 'string' } },
        required: ['input']
      }
    }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Connecting to MCP Servers
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, { capabilities: {} });

const transport = new StdioClientTransport({
  reader: serverProcess.stdout,
  writer: serverProcess.stdin
});

await client.connect(transport);
const tools = await client.listTools();
const result = await client.callTool({
  name: 'myTool',
  arguments: { input: 'Hello' }
});
```

## 🚀 Extending the Project

### Adding New MCP Servers
1. Create server in `src/servers/`
2. Implement tools using MCP SDK
3. Add configuration to `src/shared/config.ts`
4. Update agent to handle new intents

### Integrating Real LLM APIs
Replace the rule-based intent classifier in `ai-agent.ts` with:
- OpenAI GPT API
- Anthropic Claude API  
- Local LLM via Ollama
- Other LLM providers

### Adding More Tools
- File system operations
- Database queries
- API integrations
- Calendar management
- Email functionality ✅ (Gmail integration completed)
- Slack/Teams messaging
- Social media posting

## 📖 Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

## 🤝 Contributing

This is a learning project! Feel free to:
- Add new MCP servers
- Improve the AI agent
- Add tests
- Enhance documentation
- Share your learnings

## 📄 License

MIT License - feel free to use this project for learning and experimentation!
