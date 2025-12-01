#!/bin/bash

# CopilotKit Integration Startup Script
# This script starts both the backend and frontend servers

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CopilotKit + Google ADK Agent Workforce Startup           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if GOOGLE_API_KEY is set
if [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${RED}⚠️  Warning: GOOGLE_API_KEY environment variable not set!${NC}"
    echo -e "${YELLOW}   Set it with: export GOOGLE_API_KEY='your-key-here'${NC}"
    echo -e "${YELLOW}   Get a key from: https://makersuite.google.com/app/apikey${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if virtual environment exists
if [ ! -d "env" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo -e "${YELLOW}   Run: python3 -m venv env && source env/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "agent/frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd agent/frontend
    npm install --legacy-peer-deps
    cd ../..
fi

echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup EXIT INT TERM

# Start backend
echo -e "${BLUE}🚀 Starting Backend Server (Port 8000)...${NC}"
source env/bin/activate
cd agent/backend
python main.py > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start. Check backend.log for details.${NC}"
        tail -n 20 backend.log
        exit 1
    fi
    sleep 1
done

# Start frontend
echo -e "${BLUE}🚀 Starting Frontend Server...${NC}"
cd agent/frontend
npm run dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                     🎉 Servers Running!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Backend API:${NC}        http://localhost:8000"
echo -e "${BLUE}📍 Frontend UI:${NC}        http://localhost:5173 (or next available port)"
echo -e "${BLUE}📍 CopilotKit:${NC}         http://localhost:5173/#/copilot"
echo -e "${BLUE}📍 Classic Chat:${NC}       http://localhost:5173/#/chat"
echo -e "${BLUE}📍 Metrics:${NC}            http://localhost:8000/metrics"
echo ""
echo -e "${YELLOW}💡 Tip: Open http://localhost:5173 and click 'CopilotKit Interface'${NC}"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${RED}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

