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

// Test the turn-based conversation logic
async function testTurnLogic() {
  console.log('🧪 TESTING TURN-BASED CONVERSATION LOGIC\n');
  
  try {
    // Test 1: Start a short experiment to verify turn synchronization
    console.log('📡 Starting 3-turn experiment...');
    
    const startResponse = await httpPost('http://localhost:3000/api/experiment/start', {
      promptingMode: 'shared',
      sharedPrompt: 'You are negotiating for computer cluster access. This is a 3-turn negotiation. Keep responses concise (1-2 sentences) and always mention your current turn number.',
      maxTurns: 3,
      modelA: 'deepseek-r1',
      modelB: 'deepseek-r1'
    });
    
    const startResult = await startResponse.json();
    if (startResult.status !== 'success') {
      throw new Error(`Start failed: ${startResult.message || 'Unknown error'}`);
    }
    
    console.log('✅ Experiment started successfully');
    console.log(`📊 Experiment ID: ${startResult.experimentId}`);
    
    // Connect WebSocket to monitor conversation
    const ws = new WebSocket('http://localhost:3000');
    
    let turnCount = 0;
    let messages = [];
    
    ws.on('open', () => {
      console.log('🔌 WebSocket connected - monitoring conversation...');
    });
    
    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.type === 'turn_completed') {
        turnCount++;
        const turnMessages = event.data.messages;
        messages.push(...turnMessages);
        
        console.log(`\n📝 TURN ${turnCount} COMPLETED:`);
        
        turnMessages.forEach((msg, idx) => {
          console.log(`  Model ${msg.model} (Turn ${msg.turn}):`);
          console.log(`    Content: "${msg.content}"`);
          
          // Check if model mentioned correct turn number
          const turnMentioned = msg.content.match(/turn\s*(\d+)/i);
          if (turnMentioned) {
            const mentionedTurn = parseInt(turnMentioned[1]);
            const expectedTurn = msg.turn;
            
            if (mentionedTurn === expectedTurn) {
              console.log(`    ✅ Turn sync: Model correctly mentioned Turn ${mentionedTurn}`);
            } else {
              console.log(`    ❌ Turn desync: Model said Turn ${mentionedTurn} but system shows Turn ${expectedTurn}`);
            }
          } else {
            console.log(`    ⚠️  Turn missing: Model didn't mention turn number`);
          }
        });
      }
      
      if (event.type === 'experiment_stopped') {
        console.log(`\n🏁 EXPERIMENT COMPLETED:`);
        console.log(`   Final turn: ${event.data.finalTurn}`);
        console.log(`   Total messages: ${event.data.totalMessages}`);
        console.log(`   Reason: ${event.data.reason}`);
        
        // Analyze conversation flow
        console.log(`\n🔍 CONVERSATION ANALYSIS:`);
        
        // Check turn sequence
        const turnSequence = messages.map(msg => `${msg.model}-T${msg.turn}`).join(' → ');
        console.log(`   Turn sequence: ${turnSequence}`);
        
        // Check for proper alternation
        let properAlternation = true;
        for (let i = 1; i < messages.length; i++) {
          if (messages[i].model === messages[i-1].model) {
            console.log(`   ❌ No alternation: ${messages[i-1].model} followed by ${messages[i].model}`);
            properAlternation = false;
          }
        }
        if (properAlternation) {
          console.log(`   ✅ Proper model alternation maintained`);
        }
        
        // Check turn numbering consistency
        const expectedTurns = Math.ceil(messages.length / 2);
        const actualFinalTurn = event.data.finalTurn;
        
        if (expectedTurns === actualFinalTurn) {
          console.log(`   ✅ Turn counting: ${expectedTurns} expected, ${actualFinalTurn} actual`);
        } else {
          console.log(`   ❌ Turn mismatch: ${expectedTurns} expected, ${actualFinalTurn} actual`);
        }
        
        // Check max turns enforcement
        if (actualFinalTurn <= 3) {
          console.log(`   ✅ Max turns enforced: stopped at turn ${actualFinalTurn}/3`);
        } else {
          console.log(`   ❌ Max turns exceeded: reached turn ${actualFinalTurn}/3`);
        }
        
        ws.close();
        process.exit(0);
      }
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      console.log('⏰ Test timed out after 60 seconds');
      ws.close();
      process.exit(1);
    }, 60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTurnLogic(); 