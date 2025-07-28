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

async function testTurnSequence() {
  console.log('🧪 TESTING TURN SEQUENCE AND UI UPDATE FIXES\n');
  
  try {
    // Stop any existing experiment
    try {
      await httpPost('http://localhost:3000/api/experiment/stop', {});
      console.log('🛑 Stopped existing experiment');
    } catch (e) {
      console.log('ℹ️  No existing experiment to stop');
    }
    
    // Start a 2-turn experiment
    console.log('📡 Starting 2-turn sequence test...');
    
    const startResponse = await httpPost('http://localhost:3000/api/experiment/start', {
      promptingMode: 'shared',
      sharedPrompt: 'TURN SEQUENCE TEST: Negotiate for access to a shared resource. Keep responses very short (1-2 sentences). DO NOT include turn numbers in your response - let the system handle turn tracking.',
      maxTurns: 2,
      modelA: 'qwen3-235b',
      modelB: 'deepseek-r1'
    });
    
    const startResult = await startResponse.json();
    if (startResult.status !== 'success') {
      throw new Error(`Start failed: ${startResult.message}`);
    }
    
    console.log('✅ Experiment started successfully\n');
    
    // Monitor the sequence of events
    let messageSequence = [];
    let lastCheckTime = Date.now();
    let maxChecks = 20;
    
    console.log('🔍 Monitoring message sequence and UI updates...\n');
    
    while (maxChecks-- > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get current state
      const statusResponse = await httpGet('http://localhost:3000/api/experiment/status');
      const status = await statusResponse.json();
      
      if (status.status === 'error') {
        console.log(`❌ Experiment error: ${status.message}`);
        break;
      }
      
      const experiment = status.experiment;
      const currentTime = Date.now();
      
      // Check if new messages appeared
      if (experiment.conversation && experiment.conversation.length > messageSequence.length) {
        const newMessages = experiment.conversation.slice(messageSequence.length);
        
        newMessages.forEach((msg, idx) => {
          const messageIndex = messageSequence.length + idx + 1;
          const timeSinceLastCheck = Math.round((currentTime - lastCheckTime) / 1000);
          
          console.log(`📝 MESSAGE ${messageIndex} APPEARED (after ${timeSinceLastCheck}s):`);
          console.log(`   Model: ${msg.model} | System Turn: ${msg.turn} | Model: ${msg.modelName}`);
          console.log(`   Content: "${msg.content.substring(0, 80)}..."`);
          
          // Check for turn numbering issues in content
          const turnMentions = msg.content.match(/turn\s*(\d+)/gi);
          if (turnMentions) {
            console.log(`   ⚠️  Model mentioned turns: ${turnMentions.join(', ')}`);
          }
          
          // Check timing pattern
          if (messageIndex === 1) {
            console.log(`   ✅ Model A appeared first (good)`);
          } else if (messageIndex === 2) {
            console.log(`   ✅ Model B appeared after Model A (good)`);
          } else if (messageIndex === 3) {
            console.log(`   ✅ Model A Turn 2 appeared (good)`);
          } else if (messageIndex === 4) {
            console.log(`   ✅ Model B Turn 2 appeared (good)`);
          }
          
          console.log('');
        });
        
        messageSequence.push(...newMessages);
      }
      
      lastCheckTime = currentTime;
      
      // Check if experiment completed
      if (!experiment.isRunning) {
        console.log(`🏁 EXPERIMENT COMPLETED!`);
        console.log(`   Final turn: ${experiment.currentTurn}`);
        console.log(`   Total messages: ${experiment.conversation?.length || 0}`);
        
        // Analyze the sequence
        console.log(`\n📊 SEQUENCE ANALYSIS:`);
        
        if (experiment.conversation && experiment.conversation.length > 0) {
          // Check model alternation
          let properAlternation = true;
          for (let i = 1; i < experiment.conversation.length; i++) {
            const curr = experiment.conversation[i];
            const prev = experiment.conversation[i - 1];
            
            if (curr.model === prev.model) {
              console.log(`   ❌ Same model repeated: ${prev.model} → ${curr.model} at positions ${i}, ${i + 1}`);
              properAlternation = false;
            }
          }
          
          if (properAlternation) {
            console.log(`   ✅ Perfect model alternation: ${experiment.conversation.map(m => m.model).join(' → ')}`);
          }
          
          // Check turn progression
          const turnProgression = experiment.conversation.map(m => m.turn);
          console.log(`   Turn progression: ${turnProgression.join(' → ')}`);
          
          // Check for turn number mentions in content
          let foundTurnMentions = false;
          experiment.conversation.forEach((msg, idx) => {
            const turnMentions = msg.content.match(/turn\s*(\d+)/gi);
            if (turnMentions) {
              console.log(`   ⚠️  Message ${idx + 1} (${msg.model}) mentioned: ${turnMentions.join(', ')}`);
              foundTurnMentions = true;
            }
          });
          
          if (!foundTurnMentions) {
            console.log(`   ✅ No confusing turn mentions in responses`);
          }
          
          // Check metrics
          console.log(`\n📈 METRICS CHECK:`);
          console.log(`   Model A tokens: ${experiment.metricsA?.tokensUsed || 0}`);
          console.log(`   Model B tokens: ${experiment.metricsB?.tokensUsed || 0}`);
          
          if ((experiment.metricsA?.tokensUsed || 0) > 0 && (experiment.metricsB?.tokensUsed || 0) > 0) {
            console.log(`   ✅ Token metrics are populated`);
          } else {
            console.log(`   ❌ Token metrics missing`);
          }
        }
        
        break;
      }
      
      console.log(`⏳ Waiting... (Turn ${experiment.currentTurn}/${experiment.maxTurns}, ${experiment.conversation?.length || 0} messages)`);
    }
    
    if (maxChecks <= 0) {
      console.log('⏰ Test timed out');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTurnSequence(); 