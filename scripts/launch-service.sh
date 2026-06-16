#!/bin/bash
# Quick Service Launcher
# Usage: ./launch-service.sh "Service Name" "Price Range"

SERVICE_NAME="${1:-AI Setup Service}"
PRICE_RANGE="${2:-$500-2000}"
SERVICE_URL=$(echo "$SERVICE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

mkdir -p ~/famtastic/services/$SERVICE_URL

# Create landing page
cat ~/famtastic/templates/service-landing.html | 
    sed "s/{{SERVICE_NAME}}/$SERVICE_NAME/g" |
    sed "s/{{PRICE_RANGE}}/$PRICE_RANGE/g" |
    sed "s/{{SERVICE_URL}}/$SERVICE_URL/g" > ~/famtastic/services/$SERVICE_URL/index.html

# Start local server
cd ~/famtastic/services/$SERVICE_URL
python3 -m http.server 8000 &

echo ""
echo "🚀 SERVICE LAUNCHED: $SERVICE_NAME"
echo "📋 PRICE: $PRICE_RANGE"
echo "🌐 LOCAL: http://localhost:8000"
echo "🌐 TAILSCALE: http://100.126.57.66:8000"
echo "📁 FILES: ~/famtastic/services/$SERVICE_URL/"
echo ""
echo "Share this URL with prospects:"
echo "http://100.126.57.66:8000"
echo ""
echo "To stop: pkill -f 'http.server 8000'"
