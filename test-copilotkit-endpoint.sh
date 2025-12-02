#!/bin/bash

# Test script to verify CopilotKit endpoint is working

echo "🧪 Testing CopilotKit AG-UI Endpoint"
echo ""

# Check if backend is running
echo "📡 Checking if backend is running on port 8000..."
if ! curl -s http://localhost:8000/metrics > /dev/null 2>&1; then
    echo "❌ Backend is not running!"
    echo "   Start it with: cd agent/backend && python main.py"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Test the metrics endpoint (baseline)
echo "🔍 Testing /metrics endpoint (should work)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8000/metrics
echo ""

# Test the copilot endpoint with OPTIONS (CORS preflight)
echo "🔍 Testing /copilot/ with OPTIONS (CORS preflight)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" -X OPTIONS http://localhost:8000/copilot/
echo ""

# Test with a simple POST (this is what CopilotKit does)
echo "🔍 Testing /copilot/ with POST..."
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -X POST http://localhost:8000/copilot/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
echo ""

echo "Expected results:"
echo "  - /metrics: 200"
echo "  - /copilot/ OPTIONS: 200"
echo "  - /copilot/ POST: Should not be 404 (might be 400/422 if test data is invalid, that's OK)"
echo ""
echo "If you see 404 on /copilot/, restart the backend server!"

