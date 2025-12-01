/**
 * CopilotKit Runtime Server
 * 
 * This server acts as a bridge between the CopilotKit frontend and your AG-UI backend.
 * It's needed because Vite (unlike Next.js) doesn't have API routes.
 */

const express = require('express');
const cors = require('cors');
const { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNodeHttpEndpoint } = require('@copilotkit/runtime');
const { HttpAgent } = require('@ag-ui/client');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Create the CopilotRuntime with AG-UI agent connection
const serviceAdapter = new ExperimentalEmptyAdapter();
const runtime = new CopilotRuntime({
  agents: {
    // Connect to your FastAPI AG-UI endpoint
    "orchestrator_agent": new HttpAgent({ url: "http://localhost:8000/copilot/" })
  }
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// CopilotKit endpoint
app.all('/copilotkit', async (req, res) => {
  console.log('📨 CopilotKit request received');
  console.log('Method:', req.method);
  console.log('Operation:', req.body?.operationName);
  
  try {
    const handler = copilotRuntimeNodeHttpEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/copilotkit'
    });
    
    await handler(req, res);
    console.log('✅ Request handled successfully');
  } catch (error) {
    console.error('❌ Error handling request:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CopilotKit Runtime Server' });
});

app.listen(PORT, () => {
  console.log('🚀 CopilotKit Runtime Server running on http://localhost:' + PORT);
  console.log('📡 Connecting to AG-UI backend at http://localhost:8000/copilot/');
  console.log('🎯 Frontend should connect to http://localhost:3001/copilotkit');
});

