/**
 * Final CopilotKit Runtime - Following exact reference implementation
 */

const express = require('express');
const cors = require('cors');
const { CopilotRuntime, copilotRuntimeNodeHttpEndpoint } = require('@copilotkit/runtime');
const { HttpAgent } = require('@ag-ui/client');

const app = express();
const PORT = 3001;

// CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Create CopilotRuntime with your AG-UI agent (exact format from reference)
const runtime = new CopilotRuntime({
  agents: {
    "orchestrator_agent": new HttpAgent({ url: "http://localhost:8000/copilot/" })
  }
});

// CopilotKit endpoint - use exact pattern from reference
app.use('/copilotkit', async (req, res) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} /copilotkit`);
  console.log('Body operation:', req.body?.operationName);
  
  const handleRequest = copilotRuntimeNodeHttpEndpoint({
    runtime,
    endpoint: '/copilotkit'
  });
  
  return handleRequest(req, res);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log('🚀 CopilotKit Runtime (Final) on http://localhost:' + PORT);
  console.log('📡 Backend AG-UI: http://localhost:8000/copilot/');
  console.log('🎯 Frontend URL: http://localhost:3001/copilotkit');
});

