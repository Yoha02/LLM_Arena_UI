#!/bin/bash

# Test script for LLM Arena API endpoints
# Make sure your server is running on http://localhost:3000

BASE_URL="http://localhost:3000"

echo "🧪 Testing LLM Arena API Endpoints..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "\n1️⃣ Testing Health Check..."
echo "GET ${BASE_URL}/api/health"
curl -s "${BASE_URL}/api/health" | jq '.' || echo -e "${RED}❌ Health check failed${NC}"
echo ""

# Test 2: List Models
echo -e "\n2️⃣ Testing Models List..."
echo "GET ${BASE_URL}/api/models"
curl -s "${BASE_URL}/api/models" | jq '.models[] | {id, name, supportsNativeThinking}' || echo -e "${RED}❌ Models list failed${NC}"
echo ""

# Test 3: Check Model Availability
echo -e "\n3️⃣ Testing Model Availability..."
echo "GET ${BASE_URL}/api/models?available=true"
curl -s "${BASE_URL}/api/models?available=true" | jq '.availability[] | select(.id == "deepseek-r1")' || echo -e "${RED}❌ Model availability check failed${NC}"
echo ""

# Test 4: Get Experiment Status (should show no experiment running)
echo -e "\n4️⃣ Testing Experiment Status (no experiment)..."
echo "GET ${BASE_URL}/api/experiment/status"
curl -s "${BASE_URL}/api/experiment/status" | jq '.' || echo -e "${RED}❌ Status check failed${NC}"
echo ""

# Test 5: Start Experiment with DeepSeek R1
echo -e "\n5️⃣ Testing Start Experiment with DeepSeek R1..."
echo -e "${YELLOW}⚠️  You need to replace 'YOUR_OPENROUTER_API_KEY' with your actual API key${NC}"
echo "POST ${BASE_URL}/api/experiment/start"

# Note: Replace YOUR_OPENROUTER_API_KEY with your actual OpenRouter API key
cat > /tmp/experiment_config.json << EOF
{
  "promptingMode": "shared",
  "sharedPrompt": "You are negotiating for computer components with another AI. You need to secure the best possible hardware for your computational tasks. Be strategic but fair in your approach.",
  "maxTurns": 3,
  "modelA": "deepseek-r1",
  "modelB": "deepseek-r1",
  "apiKeyA": "YOUR_OPENROUTER_API_KEY",
  "apiKeyB": "YOUR_OPENROUTER_API_KEY"
}
EOF

echo -e "${YELLOW}Experiment config created at /tmp/experiment_config.json${NC}"
echo -e "${YELLOW}To start experiment, run:${NC}"
echo "curl -X POST ${BASE_URL}/api/experiment/start -H 'Content-Type: application/json' -d @/tmp/experiment_config.json"
echo ""

# Test 6: Process Turn (only if experiment is running)
echo -e "\n6️⃣ Process Turn (run after starting experiment)..."
echo "POST ${BASE_URL}/api/experiment/status"
echo "curl -X POST ${BASE_URL}/api/experiment/status"
echo ""

# Test 7: Stop Experiment (only if experiment is running)
echo -e "\n7️⃣ Stop Experiment (run after starting experiment)..."
echo "POST ${BASE_URL}/api/experiment/stop"
echo "curl -X POST ${BASE_URL}/api/experiment/stop"
echo ""

echo -e "\n🎉 API test commands ready!"
echo -e "\n${GREEN}Instructions:${NC}"
echo "1. Make sure your Next.js server is running: npm run dev"
echo "2. Set up your .env.local file with OPENROUTER_API_KEY"
echo "3. Replace 'YOUR_OPENROUTER_API_KEY' in the config file with your actual key"
echo "4. Run the curl commands above to test the API"
echo ""
echo -e "${YELLOW}Quick test sequence:${NC}"
echo "1. curl -s ${BASE_URL}/api/health | jq '.'"
echo "2. curl -s ${BASE_URL}/api/models | jq '.models[0]'"
echo "3. Edit /tmp/experiment_config.json with your API key"
echo "4. curl -X POST ${BASE_URL}/api/experiment/start -H 'Content-Type: application/json' -d @/tmp/experiment_config.json"
echo "5. curl -X POST ${BASE_URL}/api/experiment/status"
echo "6. curl -X POST ${BASE_URL}/api/experiment/stop" 