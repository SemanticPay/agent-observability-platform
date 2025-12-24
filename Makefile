.PHONY: install
install: install-backend install-frontend install-dashboard install-runtime
	@echo "✓ All dependencies installed"

.PHONY: install-backend
install-backend:
	@echo "Installing Python backend dependencies..."
	pip install -r requirements.txt

.PHONY: install-frontend
install-frontend:
	@echo "Installing Node.js frontend dependencies..."
	cd agent/frontend && npm install --legacy-peer-dep

.PHONY: install-dashboard
install-dashboard:
	@echo "Installing Node.js dashboard dependencies..."
	cd dashboard-ui/new && npm install --legacy-peer-deps

.PHONY: install-runtime
install-runtime:
	@echo "Installing CopilotKit runtime dependencies..."
	npm install

.PHONY: backend
backend:
	@echo "Starting FastAPI backend on http://localhost:8000"
	uvicorn agent.backend.main:app --reload --host 0.0.0.0 --port 8000

.PHONY: frontend
frontend:
	@echo "Starting Vite frontend on http://localhost:5173"
	cd agent/frontend && npm run dev

.PHONY: dashboard
dashboard:
	@echo "Starting dashboard..."
	cd dashboard-ui/new && npm run dev

.PHONY: dashboard-chat
dashboard-chat:
	@echo "Starting dashboard chat server..."
	cd dashboard-ui/new && npm run server

.PHONY: prometheus
prometheus:
	@echo "Starting Prometheus..."
	docker compose up

.PHONY: copilotkit-runtime
copilotkit-runtime:
	@echo "Starting CopilotKit runtime server on http://localhost:3001"
	node copilotkit-runtime-final.js

.PHONY: copilot
copilot:
	@echo "Starting full CopilotKit stack (backend + runtime + frontend)..."
	@./start-copilotkit-full.sh

all:
	@echo "Starting both backend and frontend..."
	@make -j2 backend frontend

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	cd agent/frontend && rm -rf node_modules dist 2>/dev/null || true
	@echo "✓ Cleaned"
