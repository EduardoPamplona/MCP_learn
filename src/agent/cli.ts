#!/usr/bin/env node

/**
 * CLI Interface for MCP Learning Assistant
 * 
 * This provides a command-line interface for interacting with the AI agent
 * that uses MCP (Model Context Protocol) servers for weather and notes functionality.
 * 
 * The CLI supports:
 * - Interactive conversation mode
 * - Direct command execution
 * - Help and status commands
 * - Graceful shutdown handling
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { MCPHost } from './mcp-host.js';
import { AIAgent } from './ai-agent.js';
import { DEFAULT_AGENT_CONFIG, CLI_COMMANDS } from '../shared/config.js';

/**
 * CLI class manages the command-line interface
 */
class CLI {
  private mcpHost: MCPHost;
  private agent: AIAgent;
  private program: Command;
  private isRunning = false;

  constructor() {
    this.mcpHost = new MCPHost();
    this.agent = new AIAgent(this.mcpHost);
    this.program = new Command();
    this.setupCommands();
    this.setupSignalHandlers();
  }

  /**
   * Set up CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('mcp-agent')
      .description('MCP Learning Assistant - Weather and Notes AI Agent')
      .version('1.0.0');

    this.program
      .command('chat')
      .description('Start interactive chat mode')
      .action(() => this.startInteractiveMode());

    this.program
      .command('ask <question>')
      .description('Ask a single question and exit')
      .action((question) => this.handleSingleQuestion(question));

    this.program
      .command('status')
      .description('Show agent and server status')
      .action(() => this.showStatus());

    this.program
      .command('help-commands')
      .description('Show detailed help about available commands')
      .action(() => this.showDetailedHelp());

    // Default action for no command
    this.program.action(() => {
      this.showWelcome();
      this.startInteractiveMode();
    });
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const handleShutdown = async () => {
      if (this.isRunning) {
        console.log(chalk.yellow('\n🛑 Shutting down...'));
        await this.shutdown();
        process.exit(0);
      }
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    process.on('SIGQUIT', handleShutdown);
  }

  /**
   * Initialize the agent and MCP servers
   */
  async initialize(): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Initializing MCP Learning Assistant...'));
      console.log(chalk.gray('This may take a moment while we connect to the MCP servers...'));
      
      await this.agent.initialize();
      
      console.log(chalk.green('✅ Initialization complete!'));
      this.isRunning = true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize:'), error);
      throw error;
    }
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    console.log(chalk.cyan.bold('\n🤖 Welcome to MCP Learning Assistant!'));
    console.log(chalk.gray('An AI agent demonstrating the Model Context Protocol\n'));
    
    console.log(chalk.white('Available capabilities:'));
    console.log(chalk.blue('  🌤️  Weather information for any location'));
    console.log(chalk.blue('  📝 Personal notes management'));
    console.log(chalk.blue('  ❓ Help and guidance\n'));
    
    console.log(chalk.gray('Type "help" for commands, "exit" to quit, or just ask me anything!\n'));
  }

  /**
   * Start interactive chat mode
   */
  async startInteractiveMode(): Promise<void> {
    if (!this.isRunning) {
      await this.initialize();
    }

    console.log(chalk.yellow('💬 Starting interactive mode...'));
    console.log(chalk.gray('Type your questions naturally, or use these special commands:'));
    console.log(chalk.gray('  • "help" - Show available commands'));
    console.log(chalk.gray('  • "status" - Show system status'));
    console.log(chalk.gray('  • "exit" - Quit the application\n'));

    while (this.isRunning) {
      try {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.cyan('You:'),
            validate: (value: string) => value.trim().length > 0 || 'Please enter a question or command',
          },
        ]);

        const trimmedInput = input.trim();

        // Handle special commands
        if (trimmedInput.toLowerCase() === 'exit') {
          break;
        }

        if (trimmedInput.toLowerCase() === 'status') {
          this.showStatus();
          continue;
        }

        if (trimmedInput.toLowerCase() === 'clear') {
          console.clear();
          this.showWelcome();
          continue;
        }

        // Process the request through the AI agent
        await this.processUserInput(trimmedInput);

      } catch (error) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
          break;
        }
        console.error(chalk.red('❌ Error in interactive mode:'), error);
      }
    }

    await this.shutdown();
  }

  /**
   * Handle a single question and exit
   */
  async handleSingleQuestion(question: string): Promise<void> {
    try {
      await this.initialize();
      await this.processUserInput(question);
      await this.shutdown();
    } catch (error) {
      console.error(chalk.red('❌ Error processing question:'), error);
      process.exit(1);
    }
  }

  /**
   * Process user input through the AI agent
   */
  private async processUserInput(input: string): Promise<void> {
    try {
      console.log(chalk.gray('\n🤔 Thinking...'));
      
      const startTime = Date.now();
      const response = await this.agent.processRequest(input);
      const duration = Date.now() - startTime;

      console.log(chalk.green.bold('\n🤖 Assistant:'));
      console.log(response.content);

      if (response.toolsUsed.length > 0) {
        console.log(chalk.gray(`\n🔧 Tools used: ${response.toolsUsed.join(', ')}`));
      }

      console.log(chalk.gray(`⏱️  Response time: ${duration}ms\n`));

      if (!response.success && response.error) {
        console.log(chalk.yellow(`⚠️  Note: ${response.error}\n`));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ Error processing request:'), error);
      console.log(chalk.gray('Please try again or type "help" for assistance.\n'));
    }
  }

  /**
   * Show system status
   */
  private showStatus(): void {
    const status = this.agent.getStatus();
    
    console.log(chalk.cyan.bold('\n📊 System Status'));
    console.log(chalk.white('================'));
    console.log(`Agent Status: ${status.initialized ? chalk.green('✅ Ready') : chalk.red('❌ Not Ready')}`);
    console.log(`Available Tools: ${chalk.yellow(status.toolCount)}`);
    console.log(`Connected Servers: ${chalk.yellow(status.servers.length)}`);
    
    if (status.servers.length > 0) {
      console.log(chalk.white('\nServer Details:'));
      status.servers.forEach(server => {
        console.log(`  • ${chalk.blue(server.name)}: ${chalk.green(server.status)} (${server.tools.length} tools)`);
        server.tools.forEach((tool: string) => {
          console.log(`    - ${tool}`);
        });
      });
    }
    
    console.log();
  }

  /**
   * Show detailed help about available commands
   */
  private showDetailedHelp(): void {
    console.log(chalk.cyan.bold('\n📚 Detailed Command Help'));
    console.log(chalk.white('=========================\n'));

    CLI_COMMANDS.forEach(cmd => {
      console.log(chalk.blue.bold(`${cmd.name.toUpperCase()}:`));
      console.log(`  ${cmd.description}\n`);
      console.log(chalk.gray('  Examples:'));
      cmd.examples.forEach(example => {
        console.log(chalk.gray(`    • "${example}"`));
      });
      console.log();
    });

    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.gray('  • Ask questions naturally - the agent understands context'));
    console.log(chalk.gray('  • Be specific with locations for weather requests'));
    console.log(chalk.gray('  • Notes are automatically saved and can be retrieved later'));
    console.log(chalk.gray('  • Type "status" to see all available tools and servers\n'));
  }

  /**
   * Gracefully shutdown the application
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log(chalk.yellow('👋 Goodbye! Shutting down MCP servers...'));
    
    try {
      await this.mcpHost.shutdown();
      console.log(chalk.green('✅ Shutdown complete'));
    } catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
    }
  }

  /**
   * Start the CLI application
   */
  async start(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error(chalk.red('❌ CLI Error:'), error);
      process.exit(1);
    }
  }
}

// Start the CLI if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLI();
  cli.start().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  });
}

export { CLI };