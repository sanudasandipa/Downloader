#!/bin/bash

# Quick deployment script for Oracle Ubuntu Server
# Run this script to deploy the application to Oracle server

echo "🚀 Quick Deploy to Oracle Ubuntu Server (129.159.227.52)"
echo "========================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_action() {
    echo -e "${BLUE}[ACTION]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: Please run this script from the project root directory (where app.py is located)"
    exit 1
fi

# Stop any running containers
print_action "Stopping any running containers..."
docker-compose -f docker-compose.oracle.yml down 2>/dev/null || true

# Build the application
print_action "Building Docker image..."
docker-compose -f docker-compose.oracle.yml build

# Start the application
print_action "Starting application..."
docker-compose -f docker-compose.oracle.yml up -d

# Show status
print_action "Checking application status..."
sleep 5
docker-compose -f docker-compose.oracle.yml ps

# Test the application
print_action "Testing application..."
if curl -f http://localhost:80/ > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
    echo ""
    print_status "🌐 Your application is now available at:"
    echo "   http://129.159.227.52/"
    echo ""
    print_status "📊 Useful commands:"
    echo "   - View logs: docker-compose -f docker-compose.oracle.yml logs -f"
    echo "   - Stop app: docker-compose -f docker-compose.oracle.yml down"
    echo "   - Restart: docker-compose -f docker-compose.oracle.yml restart"
    echo "   - Status: docker-compose -f docker-compose.oracle.yml ps"
else
    echo "❌ Application might not be running correctly. Check the logs:"
    echo "   docker-compose -f docker-compose.oracle.yml logs"
fi
