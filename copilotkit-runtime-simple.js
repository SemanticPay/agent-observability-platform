/**
 * Simple CopilotKit Runtime Server
 * 
 * This uses your existing /query endpoint directly - no AG-UI protocol complexity!
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Your existing backend endpoint that already works
const BACKEND_URL = 'http://localhost:8000/query';

// Enable CORS for frontend (support both common Vite ports)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Handle GraphQL queries from CopilotKit
app.post('/copilotkit', async (req, res) => {
  const { operationName, variables } = req.body;
  
  console.log('📨 CopilotKit request:', operationName);
  
  try {
    // Handle availableAgents query
    if (operationName === 'availableAgents') {
      console.log('✅ Returning available agents');
      return res.json({
        data: {
          availableAgents: {
            agents: [{
              name: 'orchestrator_agent',
              id: 'orchestrator_agent',
              description: 'Driver\'s license and scheduling assistant',
              __typename: 'Agent'
            }],
            __typename: 'AvailableAgents'
          }
        }
      });
    }
    
    // Handle generateCopilotResponse mutation
    if (operationName === 'generateCopilotResponse') {
      const data = variables?.data || {};
      const messages = data.messages || [];
      const threadId = data.threadId || 'default';
      
      console.log('📝 Messages count:', messages.length);
      
      // Extract user messages
      const userMessages = messages
        .filter(m => m.textMessage?.role === 'user')
        .map(m => m.textMessage.content);
      
      if (userMessages.length === 0) {
        console.log('⚠️  No user messages found');
        return res.json({ data: { generateCopilotResponse: null } });
      }
      
      const question = userMessages[userMessages.length - 1];
      console.log('❓ User question:', question);
      
      // Call your existing working backend endpoint
      console.log('🔄 Calling backend /query...');
      const backendResponse = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          session_id: threadId
        })
      });
      
      if (!backendResponse.ok) {
        throw new Error(`Backend error: ${backendResponse.status}`);
      }
      
      const result = await backendResponse.json();
      console.log('✅ Backend response received:', result.response.substring(0, 50) + '...');
      
      // Format response as CopilotKit expects (multipart/mixed format)
      res.setHeader('Content-Type', 'multipart/mixed; boundary=---');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const messageId = 'msg-' + Date.now();
      const runId = 'run-' + Date.now();
      
      // Send response in multipart format
      res.write('---\r\n');
      res.write('Content-Type: application/json\r\n\r\n');
      res.write(JSON.stringify({
        data: {
          generateCopilotResponse: {
            threadId: threadId,
            runId: runId,
            extensions: {},
            __typename: 'CopilotResponse'
          }
        },
        hasNext: true
      }));
      res.write('\r\n');
      
      res.write('---\r\n');
      res.write('Content-Type: application/json\r\n\r\n');
      res.write(JSON.stringify({
        incremental: [{
          items: [{
            __typename: 'TextMessageOutput',
            id: messageId,
            createdAt: new Date().toISOString(),
            content: result.response,
            role: 'assistant',
            parentMessageId: null,
          }],
          path: ['generateCopilotResponse', 'messages', 0]
        }],
        hasNext: true
      }));
      res.write('\r\n');
      
      res.write('---\r\n');
      res.write('Content-Type: application/json\r\n\r\n');
      res.write(JSON.stringify({
        incremental: [{
          data: {
            status: {
              code: 'SUCCESS',
              __typename: 'BaseResponseStatus'
            }
          },
          path: ['generateCopilotResponse']
        }],
        hasNext: false
      }));
      res.write('\r\n-----\r\n');
      
      res.end();
      console.log('✅ Response sent to frontend');
      return;
    }
    
    // Unknown operation
    console.log('⚠️  Unknown operation:', operationName);
    res.json({ data: null });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CopilotKit Simple Runtime' });
});

app.listen(PORT, () => {
  console.log('🚀 CopilotKit Simple Runtime running on http://localhost:' + PORT);
  console.log('📡 Using backend /query endpoint at ' + BACKEND_URL);
  console.log('🎯 Frontend connects to http://localhost:3001/copilotkit');
});

