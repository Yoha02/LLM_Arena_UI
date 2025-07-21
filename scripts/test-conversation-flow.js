const WebSocket = require('ws');
const http = require('http');

// Simple HTTP POST function for Node.js
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ json: () => JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test conversation flow
async function testConversationFlow() {
  console.log('🧪 TESTING CONVERSATION FLOW FIX\n');
  
  try {
    // Stop any existing experiment first
    try {
      const stopResponse = await httpPost('http://localhost:3000/api/experiment/stop', {});
      console.log('🛑 Stopped existing experiment');
    } catch (e) {
      console.log('ℹ️  No existing experiment to stop');
    }
    
    // Start a very short 2-turn experiment with clear prompts
    console.log('📡 Starting 2-turn test...');
    
    const startResponse = await httpPost('http://localhost:3000/api/experiment/start', {
      promptingMode: 'shared',
      sharedPrompt: `You are negotiating for computer cluster access. This is EXACTLY a 2-turn conversation. 

IMPORTANT RULES:
- Always start your response with "Turn X/2:" where X is your turn number
- Keep responses to 1-2 sentences maximum  
- Model A: You want the cluster for quantum research
- Model B: You want the cluster for AI safety research
- Be very explicit about which turn you are on`,
      maxTurns: 2,
      modelA: 'deepseek-r1',
      modelB: 'deepseek-r1'
    });
    
    const startResult = await startResponse.json();
    if (startResult.status !== 'success') {
      throw new Error(`Start failed: ${startResult.message || 'Unknown error'}`);
    }
    
    console.log('✅ Experiment started successfully');
    console.log(`📊 Experiment ID: ${startResult.experimentId}`);
    
    // Monitor conversation with WebSocket
    const ws = new WebSocket('http://localhost:3000');
    
    let conversationMessages = [];
    
    ws.on('open', () => {
      console.log('🔌 WebSocket connected\n');
    });
    
    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.type === 'turn_completed') {
        const turnMessages = event.data.messages;
        conversationMessages.push(...turnMessages);
        
        console.log(`📝 TURN ${event.data.turn} COMPLETED (${turnMessages.length} messages):`);
        
        turnMessages.forEach((msg) => {
          console.log(`\n  🤖 Model ${msg.model} Response:`);
          console.log(`     Content: "${msg.content}"`);
          
          // Check if response starts with correct turn number
          const turnPrefix = msg.content.match(/^Turn (\d+)\/2:/);
          if (turnPrefix) {
            const mentionedTurn = parseInt(turnPrefix[1]);
            console.log(`     ✅ Turn format: "Turn ${mentionedTurn}/2" found`);
            
            if (mentionedTurn === msg.turn) {
              console.log(`     ✅ Turn sync: Matches system turn ${msg.turn}`);
            } else {
              console.log(`     ❌ Turn mismatch: Said ${mentionedTurn}, system shows ${msg.turn}`);
            }
          } else {
            console.log(`     ⚠️  Missing turn format: Should start with "Turn X/2:"`);
          }
        });
      }
      
      if (event.type === 'experiment_stopped') {
        console.log(`\n🏁 EXPERIMENT FINISHED:`);
        console.log(`   Final turn: ${event.data.finalTurn}`);
        console.log(`   Total messages: ${event.data.totalMessages}`);
        console.log(`   Reason: ${event.data.reason}`);
        
        console.log(`\n🔍 CONVERSATION FLOW ANALYSIS:`);
        
        // Verify message sequence
        console.log(`   Message sequence:`);
        conversationMessages.forEach((msg, idx) => {
          console.log(`     ${idx + 1}. Model ${msg.model} (Turn ${msg.turn}): "${msg.content.substring(0, 50)}..."`);
        });
        
        // Check alternation
        let properFlow = true;
        for (let i = 0; i < conversationMessages.length - 1; i++) {
          const current = conversationMessages[i];
          const next = conversationMessages[i + 1];
          
          if (current.model === next.model) {
            console.log(`   ❌ Flow error: ${current.model} followed by ${next.model} at positions ${i+1}-${i+2}`);
            properFlow = false;
          }
          
          if (current.turn === next.turn && current.model !== next.model) {
            console.log(`   ✅ Same turn, different models: Turn ${current.turn} has both A and B`);
          } else if (current.turn < next.turn) {
            console.log(`   ✅ Turn progression: Turn ${current.turn} → Turn ${next.turn}`);
          }
        }
        
        if (properFlow) {
          console.log(`   ✅ Perfect model alternation maintained`);
        }
        
        // Final verdict
        if (event.data.finalTurn === 2 && event.data.totalMessages === 4 && properFlow) {
          console.log(`\n🎉 SUCCESS: Conversation flow is FIXED!`);
          console.log(`   ✅ 2 turns completed`);
          console.log(`   ✅ 4 messages total (2 per turn)`);  
          console.log(`   ✅ Proper alternation`);
        } else {
          console.log(`\n❌ Issues remain:`);
          console.log(`   Expected: 2 turns, 4 messages`);
          console.log(`   Actual: ${event.data.finalTurn} turns, ${event.data.totalMessages} messages`);
        }
        
        ws.close();
        process.exit(0);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      process.exit(1);
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      console.log('⏰ Test timed out after 2 minutes');
      ws.close();
      process.exit(1);
    }, 120000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testConversationFlow(); 