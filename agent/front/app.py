"""Simple web UI for the Driver's License Renewal Agent."""
import asyncio
import sys
import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from agent.backend.agents.orchestrator.agent import call_agent
from agent.backend.types.types import AgentCallRequest

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests."""
    try:
        data = request.json
        question = data.get('question', '')
        session_id = data.get('session_id', 'default-session')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Create request
        agent_request = AgentCallRequest(
            question=question,
            session_id=session_id
        )
        
        # Call agent asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(call_agent(agent_request))
        loop.close()
        
        return jsonify({
            'answer': response.answer,
            'function_payloads': [
                {
                    'name': fp.name,
                    'payload': fp.payload
                } for fp in response.function_payloads
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

