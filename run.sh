#!/bin/bash

# Torrent Downloader Startup Script

echo "🚀 Starting Torrent Downloader Web App..."
echo "=================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.7 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed. Please install pip."
    exit 1
fi

# Create directories if they don't exist
echo "📁 Creating necessary directories..."
mkdir -p downloads torrents

# Install dependencies if requirements.txt is newer than last install
if [ requirements.txt -nt .last_install ] || [ ! -f .last_install ]; then
    echo "📦 Installing/Updating dependencies..."
    pip install -r requirements.txt
    touch .last_install
else
    echo "✅ Dependencies are up to date"
fi

# Start the application
echo "🌐 Starting the web server..."
echo "📍 The application will be available at:"
echo "   📱 Local:    http://localhost:5000"
echo "   🌍 Network:  http://0.0.0.0:5000"
echo ""
echo "💡 Press Ctrl+C to stop the server"
echo "=================================="

python app.py
