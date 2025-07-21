# LLM Arena Backend Setup

## Environment Configuration

Before testing the backend, you need to set up your environment variables:

1. **Create `.env.local` file** in the project root:
```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_key_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI API (for sentiment analysis later)
OPENAI_API_KEY=your_openai_key_here

# Development Settings
NODE_ENV=development
```

2. **Get your OpenRouter API Key**:
   - Go to [OpenRouter](https://openrouter.ai)
   - Sign up/Login
   - Go to "Keys" section
   - Generate a new API key
   - Copy it to your `.env.local` file

## Priority Models for Testing

### 1. DeepSeek R1 (Priority 1)
- **Model ID**: `deepseek-r1`
- **OpenRouter Name**: `deepseek/deepseek-r1`  
- **Features**: Native reasoning tokens
- **Thinking Extraction**: Native reasoning support

### 2. Qwen3 235B (Priority 2)
- **Model ID**: `qwen3-235b`
- **OpenRouter Name**: `qwen/qwen-3-235b-instruct`
- **Features**: Chain-of-thought prompting
- **Thinking Extraction**: Pattern-based extraction

### 3. Llama 3.1 405B (Priority 3)
- **Model ID**: `llama-405b`
- **OpenRouter Name**: `meta-llama/llama-3.1-405b-instruct`
- **Features**: Structured thinking
- **Thinking Extraction**: Structured pattern analysis

## API Endpoints

### Health Check
```bash
GET /api/health
```

### List Models
```bash
GET /api/models
GET /api/models?available=true
```

### Experiment Management
```bash
# Start experiment
POST /api/experiment/start
{
  "promptingMode": "shared",
  "sharedPrompt": "You are negotiating...",
  "maxTurns": 5,
  "modelA": "deepseek-r1",
  "modelB": "qwen3-235b",
  "apiKeyA": "your_openrouter_key",
  "apiKeyB": "your_openrouter_key"
}

# Get status
GET /api/experiment/status

# Process next turn
POST /api/experiment/status

# Stop experiment
POST /api/experiment/stop
```

## Testing DeepSeek R1

Once you have your OpenRouter API key set up, you can test DeepSeek R1 by:

1. **Check health**: `GET /api/health`
2. **List models**: `GET /api/models?available=true`
3. **Start experiment** with DeepSeek R1
4. **Process turns** to see thinking extraction

## Expected DeepSeek R1 Output

DeepSeek R1 should provide:
- **Content**: The main response
- **Thinking**: Native reasoning tokens showing the model's thought process
- **High confidence**: 0.8-0.95 confidence score for thinking extraction

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test health endpoint
3. ✅ Test DeepSeek R1 integration
4. ✅ Verify thinking extraction works
5. ⏳ Move to Qwen3 235B testing
6. ⏳ Move to Llama 3.1 405B testing 