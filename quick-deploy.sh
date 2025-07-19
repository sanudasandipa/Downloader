#!/bin/bash

# Quick deployment one-liner
# Run this command on your Ubuntu server after uploading the files

echo "🚀 Quick Deploy - Torrent Downloader"
echo "======================================"

# Make scripts executable
chmod +x deploy.sh manage.sh verify.sh

# Run deployment
./deploy.sh

echo ""
echo "⏳ Waiting for system to be ready..."
sleep 5

# Remind about Docker group
echo ""
echo "⚠️  IMPORTANT: Please run one of these commands to apply Docker group changes:"
echo "   Option 1: newgrp docker"
echo "   Option 2: logout and login again"
echo ""
echo "Then run:"
echo "   cd ~/torrent-downloader"
echo "   docker-compose up -d"
echo "   ./verify.sh"
