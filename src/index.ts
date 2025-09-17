#!/usr/bin/env node

/**
 * MCP Learning Assistant - Main Entry Point
 * 
 * This is the main entry point for the MCP Learning Assistant project.
 * It demonstrates how to build an AI agent using the Model Context Protocol (MCP)
 * to connect to external tools and data sources.
 * 
 * The application includes:
 * - Weather information via MCP weather server
 * - Personal notes management via MCP notes server
 * - AI agent orchestrator with natural language understanding
 * - Command-line interface for user interaction
 * 
 * This is a learning project designed to teach MCP concepts and patterns.
 */

import { CLI } from './agent/cli.js';

/**
 * Main function to start the MCP Learning Assistant
 */
async function main(): Promise<void> {
  try {
    const cli = new CLI();
    await cli.start();
  } catch (error) {
    console.error('Fatal error starting MCP Learning Assistant:', error);
    process.exit(1);
  }
}

// Start the application
main();