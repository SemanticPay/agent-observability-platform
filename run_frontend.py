"""Run the frontend Flask application."""
from agent.front.app import app

if __name__ == '__main__':
    print("Starting Driver's License Renewal Agent Frontend...")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, host='0.0.0.0', port=5000)

