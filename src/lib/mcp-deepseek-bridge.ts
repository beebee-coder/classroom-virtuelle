// lib/mcp-deepseek-bridge.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DeepSeekMCPAdapter, type MCPMessage } from './deepseek-mcp-adapter';

const server = new Server(
  {
    name: 'classroom-deepseek-mcp',
    version: '0.1.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const deepSeek = new DeepSeekMCPAdapter(process.env.DEEPSEEK_API_KEY!);

// Définir les outils disponibles (sans le typage problématique)
const tools = [
  {
    name: 'chat',
    description: 'Chat with DeepSeek AI for educational purposes',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'assistant', 'system']
              },
              content: {
                type: 'string'
              }
            },
            required: ['role', 'content']
          }
        }
      },
      required: ['messages']
    }
  }
];

// Handler pour lister les outils
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools,
  };
});

// Handler pour appeler les outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'chat') {
    const messages = request.params.arguments?.messages as MCPMessage[];
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    try {
      console.log('🤖 Processing DeepSeek request...');
      const response = await deepSeek.processMCPRequest(messages);
      
      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
    } catch (error) {
      console.error('❌ DeepSeek error:', error);
      throw new Error(`DeepSeek error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  throw new Error(`Unsupported tool: ${request.params.name}`);
});

// Gestion des erreurs
server.onerror = (error) => {
  console.error('[MCP Server Error]', error);
};

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 DeepSeek MCP Server running on stdio');
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

main().catch(console.error);