#!/bin/bash

# Installation verification script
# This script checks if the torrent downloader is properly installed and running

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_status() {
    echo -e "${YELLOW}[CHECK]${NC} $1"
}

echo "🔍 Verifying Torrent Downloader Installation"
echo "============================================"

# Check if Docker is installed
print_status "Checking Docker installation..."
docker --version > /dev/null 2>&1
print_check $? "Docker is installed"

# Check if Docker Compose is installed
print_status "Checking Docker Compose installation..."
docker-compose --version > /dev/null 2>&1
print_check $? "Docker Compose is installed"

# Check if user is in docker group
print_status "Checking Docker permissions..."
groups | grep -q docker
print_check $? "User is in docker group"

# Check if container is running
print_status "Checking if container is running..."
docker-compose ps | grep -q "Up"
print_check $? "Container is running"

# Check if ports are accessible
print_status "Checking port accessibility..."
nc -z localhost 5000
print_check $? "Port 5000 is accessible"

# Check if application responds
print_status "Checking application response..."
curl -s http://localhost:5000 > /dev/null 2>&1
print_check $? "Application responds to HTTP requests"

# Check if torrent ports are open
print_status "Checking torrent ports..."
nc -z localhost 6881
print_check $? "Torrent port 6881 is accessible"

# Check disk space
print_status "Checking disk space..."
AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ $AVAILABLE_SPACE -gt 1048576 ]; then  # More than 1GB
    print_check 0 "Sufficient disk space available"
else
    print_check 1 "Low disk space warning"
fi

# Check memory usage
print_status "Checking memory usage..."
MEMORY_USAGE=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
if [ $MEMORY_USAGE -lt 90 ]; then
    print_check 0 "Memory usage is acceptable ($MEMORY_USAGE%)"
else
    print_check 1 "High memory usage warning ($MEMORY_USAGE%)"
fi

echo ""
echo "🌐 Application URLs:"
echo "   Web Interface: http://$(hostname -I | awk '{print $1}'):5000"
echo "   Local Access:  http://localhost:5000"
echo ""
echo "📁 Important Directories:"
echo "   Downloads: $(pwd)/downloads"
echo "   Torrents:  $(pwd)/torrents"
echo "   Data:      $(pwd)/data"
echo ""
echo "🛠️  Management Commands:"
echo "   Status:   ./manage.sh status"
echo "   Logs:     ./manage.sh logs"
echo "   Restart:  ./manage.sh restart"
echo "   Backup:   ./manage.sh backup"
