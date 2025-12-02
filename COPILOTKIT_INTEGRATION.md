# CopilotKit Integration Guide

This document explains how to use the CopilotKit integration with your agent workforce backend.

## Overview

The integration connects your existing Google ADK agents (orchestrator, driver's license, and scheduler agents) with CopilotKit's powerful UI components using the AG-UI protocol.

## Architecture

```
┌─────────────────┐
│  Frontend (UI)  │
│   - React/Vite  │
│   - CopilotKit  │
└────────┬────────┘
         │
         │ HTTP (AG-UI Protocol)
         │
┌────────▼────────┐
│  Backend API    │
│   - FastAPI     │
│   - Port 8000   │
└────────┬────────┘
         │
         │
┌────────▼────────────────┐
│  AG-UI ADK Middleware   │
│  - Wraps ADK Agent      │
│  - Streaming Events     │
└────────┬────────────────┘
         │
         │
┌────────▼────────────────┐
│  Orchestrator Agent     │
│  - Google ADK           │
│  - Sub-agents:          │
│    • Driver's License   │
│    • Scheduler          │
└─────────────────────────┘
```

## Setup Instructions

### 1. Install Backend Dependencies

The required Python package `ag-ui-adk` has already been added to `requirements.txt`.

```bash
# Activate your virtual environment
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

The CopilotKit packages have been installed in the frontend:

```bash
cd agent/frontend
npm install --legacy-peer-deps  # Already done
```

Installed packages:
- `@ag-ui/client` - AG-UI protocol client
- `@copilotkit/react-core` - CopilotKit core functionality
- `@copilotkit/react-ui` - CopilotKit UI components
- `@copilotkit/runtime` - Runtime support
- `zod` - Schema validation

### 3. Set Environment Variables

Make sure you have your Google API key set:

```bash
export GOOGLE_API_KEY="your-google-api-key-here"
```

Get your API key from: https://makersuite.google.com/app/apikey

## Running the Application

### Start the Backend

```bash
# From project root, activate venv
source env/bin/activate

# Run the backend server
cd agent/backend
python main.py
```

The backend will start on **http://localhost:8000**

Available endpoints:
- `POST /query` - Original query endpoint
- `POST /upload-photo` - Photo upload endpoint
- `GET /api/metrics/*` - Metrics endpoints
- `POST /copilot/*` - **CopilotKit AG-UI streaming endpoint** (NEW)

### Start the Frontend

In a new terminal:

```bash
cd agent/frontend
npm run dev
```

The frontend will start on **http://localhost:5173** (or another port if 5173 is busy)

## Using the CopilotKit Interface

### Access Points

1. **Home Page**: Navigate to http://localhost:5173
   - Click "CopilotKit Interface" button to access the new interface
   - Or click "Classic Chat" for the original chat interface

2. **Direct Access**: Navigate to http://localhost:5173/#/copilot

### Features

#### 🤖 AI Assistant Sidebar
- Real-time chat with your orchestrator agent
- Full access to all sub-agents (driver's license, scheduler)
- Streaming responses with typing indicators

#### 🎨 Frontend Actions
The agent can control the UI through frontend actions:
- Try: "Change the theme color to blue"
- Try: "Set the theme to orange"

#### 🔄 Bidirectional State Sync
The agent maintains state that's synchronized with the frontend:
- Agent decisions are reflected in the UI
- UI changes are communicated to the agent

#### 🧩 Rich Context
The agent has access to all your existing tools:
- Driver's license information and RAG
- Appointment scheduling
- Document classification
- Clinic availability

## How It Works

### Backend Integration

The file `agent/backend/copilotkit_agent.py` creates an AG-UI wrapper:

```python
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from agent.backend.agents.orchestrator.agent import ORCHESTRATOR_AGENT

# Wrap the existing orchestrator agent
adk_copilot_agent = ADKAgent(
    adk_agent=ORCHESTRATOR_AGENT,
    app_name="drivers-license-assistant",
    user_id="copilot_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True
)

# Mount the streaming endpoint
add_adk_fastapi_endpoint(copilotkit_app, adk_copilot_agent, path="/copilot")
```

This endpoint is then mounted in `main.py`:

```python
from agent.backend.copilotkit_agent import copilotkit_app
app.mount("/copilot", copilotkit_app)
```

### Frontend Integration

The frontend connects directly to the backend AG-UI endpoint:

```tsx
// src/components/CopilotKitProvider.tsx
<CopilotKit 
  runtimeUrl="http://localhost:8000/copilot"
  agent="orchestrator_agent"
>
  {children}
</CopilotKit>
```

## Customization

### Adding Frontend Actions

In `CopilotKitPage.tsx`, add new actions:

```tsx
useCopilotAction({
  name: "yourActionName",
  description: "What this action does",
  parameters: [{
    name: "param1",
    type: "string",
    description: "Parameter description",
    required: true,
  }],
  handler({ param1 }) {
    // Your action logic here
  },
});
```

### Customizing the Agent Prompt

The agent uses the existing orchestrator agent configuration. To modify behavior:

1. Edit `agent/backend/agents/orchestrator/prompt.py`
2. Add new tools in the sub-agents
3. The CopilotKit interface will automatically have access to all changes

### Styling

The interface uses Tailwind CSS and can be customized:

1. Edit theme colors in `CopilotKitPage.tsx`
2. Modify the `--copilot-kit-primary-color` CSS variable
3. Customize CopilotSidebar labels and appearance

## Troubleshooting

### "I'm having trouble connecting to my tools"

Check:
1. Backend is running on port 8000
2. No CORS errors in browser console
3. Google API key is set correctly
4. Both servers started successfully

### Connection Refused

- Ensure backend is running: `ps aux | grep python | grep main`
- Check backend logs for errors
- Verify port 8000 is not blocked

### Import Errors

If you see Python import errors:

```bash
cd /path/to/project
source env/bin/activate
pip install ag-ui-adk
```

### Frontend Build Issues

If npm install fails with peer dependency conflicts:

```bash
npm install --legacy-peer-deps
```

## Differences from Original Chat

| Feature | Original Chat | CopilotKit Interface |
|---------|--------------|---------------------|
| UI Framework | Custom React | CopilotKit Components |
| Communication | REST API | AG-UI Streaming |
| State Management | React Context | CopilotKit Shared State |
| Real-time Updates | Polling | Server-Sent Events |
| Agent Control | Limited | Full (Frontend Actions) |
| Generative UI | No | Yes (Agent can render UI) |

## Next Steps

1. **Add More Frontend Actions**: Allow the agent to control more UI elements
2. **Implement Shared State**: Sync application state between agent and UI
3. **Add Generative UI**: Let the agent render custom components based on context
4. **Enhance Prompts**: Update agent instructions to leverage CopilotKit features
5. **Production Setup**: Configure CORS, authentication, and rate limiting

## Resources

- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [AG-UI Protocol Specification](https://github.com/CopilotKit/ag-ui)
- [Google ADK Documentation](https://cloud.google.com/vertex-ai/docs/adk/overview)
- [Reference Implementation](https://github.com/CopilotKit/with-adk/)

## License

Same as the parent project.

