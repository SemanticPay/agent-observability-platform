# CopilotKit Integration - Quick Start

## ✨ What's New?

Your agent workforce now has a powerful **CopilotKit interface** that provides:

- 🤖 **Modern AI Chat Sidebar** - Beautiful, responsive chat interface
- 🎨 **Frontend Actions** - Agents can control UI elements directly
- 🔄 **Real-time Streaming** - Fast, streaming responses via AG-UI protocol
- 🎯 **Full Agent Access** - All your existing agents (orchestrator, driver's license, scheduler) work seamlessly

## 🚀 Quick Start

### 1. Set Your Google API Key

```bash
export GOOGLE_API_KEY="your-google-api-key-here"
```

Get one from: https://makersuite.google.com/app/apikey

### 2. Start Both Servers

**Option A: Use the startup script (recommended)**

```bash
./start-copilotkit.sh
```

**Option B: Start manually**

Terminal 1 - Backend:
```bash
source env/bin/activate
cd agent/backend
python main.py
```

Terminal 2 - Frontend:
```bash
cd agent/frontend
npm run dev
```

### 3. Open the Interface

Navigate to: **http://localhost:5173**

Then click the **"CopilotKit Interface"** button!

## 🎯 What to Try

Once in the CopilotKit interface, try these:

### Driver's License Queries
- "What documents do I need to renew my driver's license?"
- "Do I need a medical exam?"
- "What are the requirements for renewal?"

### Appointment Scheduling
- "Schedule a medical exam for me"
- "What clinics are available?"
- "Show me available time slots"

### Frontend Control
- "Change the theme color to blue"
- "Set the background to orange"
- "Make it purple"

## 📁 Key Files

### Backend
- `agent/backend/copilotkit_agent.py` - AG-UI wrapper for your agents
- `agent/backend/main.py` - Mounts CopilotKit endpoint at `/copilot`
- `requirements.txt` - Added `ag-ui-adk` package

### Frontend
- `agent/frontend/src/components/CopilotKitPage.tsx` - Main CopilotKit UI
- `agent/frontend/src/components/CopilotKitProvider.tsx` - Connection configuration
- `agent/frontend/src/App.tsx` - Added `/copilot` route

## 🔗 Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8000/api/copilotkit` | CopilotKit-compatible endpoint (backend) |
| `http://localhost:5173/#/copilot` | CopilotKit interface (frontend) |
| `http://localhost:5173/#/chat` | Classic chat interface |
| `http://localhost:8000/query` | Original REST API |
| `http://localhost:8000/copilot` | AG-UI protocol endpoint (advanced) |

## 🆚 Classic Chat vs CopilotKit

| Feature | Classic Chat | CopilotKit |
|---------|--------------|------------|
| Interface | Custom | CopilotKit Components |
| Protocol | REST API | AG-UI Streaming |
| Updates | Request/Response | Real-time streaming |
| Agent Control | None | Full (via frontend actions) |
| UI Rendering | Static | Dynamic (agent-driven) |

Both interfaces use the **same backend agents** and have access to **all the same capabilities**!

## 📚 Documentation

For detailed information, see: **COPILOTKIT_INTEGRATION.md**

Topics covered:
- Architecture overview
- Customization guide
- Troubleshooting
- Advanced features (shared state, generative UI)

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
tail -f backend.log

# Ensure dependencies are installed
source env/bin/activate
pip install -r requirements.txt
```

### Frontend won't start
```bash
# Reinstall dependencies
cd agent/frontend
npm install --legacy-peer-deps
```

### "Connection refused" in CopilotKit
- Ensure backend is running on port 8000
- Check backend logs for errors
- Verify GOOGLE_API_KEY is set

## 🎉 Success!

You should now see:
- ✅ Backend running on port 8000
- ✅ Frontend running on port 5173
- ✅ CopilotKit sidebar on the right
- ✅ Chat working with your agents

---

**Need help?** Check the full docs in `COPILOTKIT_INTEGRATION.md` or the reference implementation at https://github.com/CopilotKit/with-adk/

