# Architecture Overview

This document describes the architecture of the Driver's License Renewal Agent system.

## Directory Structure

```
agent/
├── backend/                    # Backend agent system
│   ├── agents/                 # Agent implementations
│   │   ├── orchestrator/       # Root orchestrator agent
│   │   │   ├── agent.py        # Orchestrator agent implementation
│   │   │   └── prompt.py       # Orchestrator agent prompt
│   │   └── drivers_license/    # Driver's license specialized agent
│   │       ├── agent.py        # Driver's license agent implementation
│   │       └── prompt.py       # Driver's license agent prompt
│   └── types/                  # Type definitions
│       └── types.py            # Request/Response types
├── rag/                        # RAG pipeline components
│   ├── document_ingestion.py   # Document fetching and processing
│   └── rag_pipeline.py         # Vertex AI RAG pipeline
└── front/                      # Frontend web UI
    ├── app.py                  # Flask application
    ├── templates/              # HTML templates
    │   └── index.html          # Main UI template
    └── static/                 # Static assets
        ├── css/
        │   └── style.css       # Styles
        └── js/
            └── app.js          # Frontend JavaScript
```

## Agent Architecture

### Orchestrator Agent

The **Orchestrator Agent** is the root agent that:
- Receives all user questions
- Routes questions to appropriate sub-agents based on the topic
- Manages session state
- Coordinates responses from sub-agents

**Location**: `agent/backend/agents/orchestrator/`

**Key Features**:
- Uses Google ADK (Agent Development Kit)
- Maintains conversation context
- Routes to specialized sub-agents

### Drivers License Agent

The **Drivers License Agent** is a specialized sub-agent that:
- Handles all driver's license renewal questions
- Uses RAG pipeline to retrieve relevant legal documents
- Provides accurate answers based on legal documentation
- Has access to a tool function for RAG retrieval

**Location**: `agent/backend/agents/drivers_license/`

**Key Features**:
- Specialized prompt for driver's license questions
- RAG tool integration for document retrieval
- Context-aware responses

## RAG Pipeline

The RAG (Retrieval-Augmented Generation) pipeline:
- Ingests legal documents from government sources
- Stores documents in Vertex AI Search/Vector Search
- Retrieves relevant context for queries
- Generates answers using retrieved context

**Location**: `agent/rag/`

**Components**:
- `document_ingestion.py`: Fetches and processes documents from URLs
- `rag_pipeline.py`: Manages Vertex AI RAG operations

## Frontend

The frontend is a simple Flask web application that:
- Provides a chat interface for users
- Communicates with the backend agent via API
- Handles session management
- Displays responses in a user-friendly format

**Location**: `agent/front/`

**Technology Stack**:
- Flask (Python web framework)
- HTML/CSS/JavaScript for UI
- RESTful API for backend communication

## Data Flow

1. **User Input**: User asks a question via web UI or CLI
2. **Frontend**: Sends request to Flask backend
3. **Orchestrator**: Receives question and routes to appropriate sub-agent
4. **Sub-Agent**: 
   - Calls RAG tool if needed
   - Retrieves relevant context
   - Generates answer using LLM
5. **Response**: Answer flows back through orchestrator to frontend
6. **Display**: User sees the answer

## Adding New Agents

To add a new specialized agent:

1. Create a new directory under `agent/backend/agents/`
2. Create `prompt.py` with the agent's prompt
3. Create `agent.py` with the agent implementation:
   ```python
   from google.adk.agents import Agent
   from agent.backend.agents.your_agent.prompt import PROMPT
   
   your_agent = Agent(
       model="gemini-2.0-flash-exp",
       name="your_agent",
       description="Description of your agent",
       instruction=PROMPT,
       tools=[...]  # Optional tools
   )
   ```
4. Import and add to orchestrator's sub_agents list:
   ```python
   from agent.backend.agents.your_agent.agent import your_agent
   
   ORCHESTRATOR_AGENT = Agent(
       ...
       sub_agents=[
           drivers_license_agent,
           your_agent,  # Add here
       ],
   )
   ```

## Configuration

Configuration is managed through:
- `.env` file for environment variables
- `config.py` for application configuration
- Document URLs defined in `config.py`

## Session Management

Sessions are managed using:
- `InMemorySessionService` from Google ADK
- Session IDs mapped to user IDs
- Conversation context maintained per session

## Error Handling

- All agents include error handling
- RAG pipeline has fallback mechanisms
- Frontend displays user-friendly error messages
- Logging throughout for debugging

