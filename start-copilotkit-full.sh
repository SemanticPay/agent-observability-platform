#!/bin/bash

# Complete CopilotKit Integration Startup Script
# Starts: Backend (Python) + Runtime Bridge (Node) + Frontend (Vite)

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CopilotKit Full Stack Startup (3 servers)                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check GOOGLE_API_KEY
if [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${RED}⚠️  Warning: GOOGLE_API_KEY not set!${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install runtime server dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing runtime server dependencies...${NC}"
    npm install --prefix . --package-lock-only=false \
        @ag-ui/client@^0.0.41 \
        @copilotkit/runtime@1.10.6 \
        express@^4.18.2 \
        cors@^2.8.5
fi

cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all servers...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup EXIT INT TERM

# Start Backend (Python/FastAPI)
echo -e "${BLUE}🚀 [1/3] Starting Backend Server (Port 8000)...${NC}"
source env/bin/activate
cd agent/backend
python main.py > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ready!${NC}"
        break
    fi
    [ $i -eq 30 ] && echo -e "${RED}❌ Backend timeout${NC}" && exit 1
    sleep 1
done

# Start Runtime Bridge (Node.js)
echo -e "${BLUE}🚀 [2/3] Starting CopilotKit Runtime Bridge (Port 3001)...${NC}"
node copilotkit-runtime-server.js > runtime.log 2>&1 &
RUNTIME_PID=$!

# Wait for runtime
echo -e "${YELLOW}⏳ Waiting for runtime bridge...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Runtime bridge ready!${NC}"
        break
    fi
    [ $i -eq 15 ] && echo -e "${RED}❌ Runtime timeout${NC}" && exit 1
    sleep 1
done

# Start Frontend (Vite)
echo -e "${BLUE}🚀 [3/3] Starting Frontend (Vite)...${NC}"
cd agent/frontend
npm run dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🎉 All Servers Running!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Backend (Python):${NC}     http://localhost:8000"
echo -e "${BLUE}📍 Runtime Bridge:${NC}       http://localhost:3001"
echo -e "${BLUE}📍 Frontend (Vite):${NC}      http://localhost:5173"
echo ""
echo -e "${BLUE}🎯 Open:${NC}                  http://localhost:5173/#/copilot"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Runtime:  tail -f runtime.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${RED}Press Ctrl+C to stop all servers${NC}"
echo ""

wait $BACKEND_PID $RUNTIME_PID $FRONTEND_PID

