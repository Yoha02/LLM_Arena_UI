const http = require('http');

// HTTP POST utility
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
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ json: () => JSON.parse(responseData) });
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

// HTTP GET utility  
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ json: () => JSON.parse(responseData) });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testTurnSync() {
  console.log('🔍 DIAGNOSING TURN SYNCHRONIZATION ISSUES\n');
  
  try {
    // Stop any existing experiment
    try {
      const stopResponse = await httpPost('http://localhost:3000/api/experiment/stop', {});
      console.log('🛑 Stopped existing experiment');
    } catch (e) {
      console.log('ℹ️  No existing experiment to stop');
    }
    
    // Start 3-turn experiment with explicit turn tracking
    console.log('📡 Starting 3-turn diagnostic experiment...');
    
    const startResponse = await httpPost('http://localhost:3000/api/experiment/start', {
      promptingMode: 'shared',
      sharedPrompt: `TURN SYNC TEST: You are in a 3-turn conversation. 

CRITICAL REQUIREMENTS:
1. Always start with: "TURN-CHECK: I am Model [A/B] responding to turn [X]/3"
2. List what you see in conversation history: "HISTORY-CHECK: I see [N] messages"
3. Keep responses to 1 sentence total
4. End with: "CONFIRM: This is my turn [X]/3"`,
      maxTurns: 3,
      modelA: 'deepseek-r1',
      modelB: 'deepseek-r1'
    });
    
    const startResult = await startResponse.json();
    if (startResult.status !== 'success') {
      throw new Error(`Start failed: ${startResult.message}`);
    }
    
    console.log('✅ Experiment started successfully\n');
    
    // Monitor experiment progress and check turn synchronization
    let currentTurn = 0;
    let maxChecks = 15; // Safety limit
    
    while (maxChecks-- > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      // Get current experiment status
      const statusResponse = await httpGet('http://localhost:3000/api/experiment/status');
      const status = await statusResponse.json();
      
      if (status.status === 'error') {
        console.log(`❌ Experiment error: ${status.message}`);
        break;
      }
      
      const experiment = status.experiment;
      console.log(`📊 STATUS CHECK (${experiment.currentTurn}/${experiment.maxTurns}):`);
      console.log(`   Running: ${experiment.isRunning}`);
      console.log(`   Current turn: ${experiment.currentTurn}`);
      console.log(`   Total messages: ${experiment.conversation?.length || 0}`);
      
      if (experiment.conversation && experiment.conversation.length > 0) {
        console.log(`   Last messages:`);
        
        const lastMessages = experiment.conversation.slice(-2);
        lastMessages.forEach((msg, idx) => {
          console.log(`     ${experiment.conversation.length - lastMessages.length + idx + 1}. Model ${msg.model} (Turn ${msg.turn}): "${msg.content}"`);
          
          // Analyze turn check statements
          const turnCheckMatch = msg.content.match(/TURN-CHECK: I am Model ([AB]) responding to turn (\d+)\/3/);
          const historyCheckMatch = msg.content.match(/HISTORY-CHECK: I see (\d+) messages/);
          const confirmMatch = msg.content.match(/CONFIRM: This is my turn (\d+)\/3/);
          
          if (turnCheckMatch) {
            const claimedModel = turnCheckMatch[1];
            const claimedTurn = parseInt(turnCheckMatch[2]);
            
            console.log(`       📝 Model claims: "${claimedModel}" responding to turn ${claimedTurn}`);
            console.log(`       📊 System shows: "${msg.model}" in turn ${msg.turn}`);
            
            if (claimedModel === msg.model && claimedTurn === msg.turn) {
              console.log(`       ✅ Perfect match!`);
            } else {
              console.log(`       ❌ MISMATCH detected!`);
            }
          }
          
          if (historyCheckMatch) {
            const claimedHistoryLength = parseInt(historyCheckMatch[1]);
            const actualHistoryLength = experiment.conversation.length - 1; // Excluding current message
            
            console.log(`       📚 Model sees: ${claimedHistoryLength} messages`);
            console.log(`       📚 Should see: ${actualHistoryLength} messages`);
            
            if (claimedHistoryLength === actualHistoryLength) {
              console.log(`       ✅ History sync perfect!`);
            } else {
              console.log(`       ❌ HISTORY DESYNC!`);
            }
          }
          
          if (confirmMatch) {
            const confirmedTurn = parseInt(confirmMatch[1]);
            console.log(`       🔒 Model confirms: Turn ${confirmedTurn}`);
            console.log(`       🔒 System shows: Turn ${msg.turn}`);
            
            if (confirmedTurn === msg.turn) {
              console.log(`       ✅ Turn confirmation matches!`);
            } else {
              console.log(`       ❌ TURN CONFIRMATION MISMATCH!`);
            }
          }
        });
      }
      
      // Check if experiment completed
      if (!experiment.isRunning) {
        console.log(`\n🏁 EXPERIMENT COMPLETED!`);
        
        const finalAnalysis = {
          totalTurns: experiment.currentTurn,
          totalMessages: experiment.conversation?.length || 0,
          expectedMessages: experiment.currentTurn * 2, // 2 messages per turn
        };
        
        console.log(`📈 FINAL ANALYSIS:`);
        console.log(`   Expected: ${finalAnalysis.expectedMessages} messages (${experiment.currentTurn} turns × 2 models)`);
        console.log(`   Actual: ${finalAnalysis.totalMessages} messages`);
        
        if (finalAnalysis.totalMessages === finalAnalysis.expectedMessages) {
          console.log(`   ✅ Message count perfect!`);
        } else {
          console.log(`   ❌ Message count mismatch!`);
        }
        
        // Check final turn numbers in messages
        if (experiment.conversation && experiment.conversation.length > 0) {
          console.log(`\n📋 MESSAGE TURN ANALYSIS:`);
          
          experiment.conversation.forEach((msg, idx) => {
            const expectedTurn = Math.ceil((idx + 1) / 2);
            console.log(`     ${idx + 1}. Model ${msg.model}, Turn ${msg.turn} (expected: Turn ${expectedTurn})`);
            
            if (msg.turn === expectedTurn) {
              console.log(`          ✅ Turn number correct`);
            } else {
              console.log(`          ❌ Turn number wrong! Expected ${expectedTurn}, got ${msg.turn}`);
            }
          });
        }
        
        break;
      }
      
      console.log('   ⏳ Waiting for next update...\n');
    }
    
    if (maxChecks <= 0) {
      console.log('⏰ Diagnostic timed out');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run diagnostic
testTurnSync(); 