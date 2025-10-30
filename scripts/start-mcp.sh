#!/bin/bash
# scripts/start-mcp.sh

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "❌ DEEPSEEK_API_KEY is not set"
    echo "💡 Please run: export DEEPSEEK_API_KEY=your_api_key"
    echo "💡 Or add it to your .env.local file"
    exit 1
fi

echo "✅ DeepSeek API Key is set"
npm run mcp:dev