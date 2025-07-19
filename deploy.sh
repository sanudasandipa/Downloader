#!/bin/bash

# Torrent Downloader Deployment Script for Ubuntu Server
# This script will set up Docker and deploy the torrent downloader application

set -e

echo "🚀 Starting Torrent Downloader Deployment on Ubuntu Server"
echo "=========================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    sudo apt update
    
    # Install Docker Engine
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed successfully!"
else
    print_status "Docker is already installed."
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully!"
else
    print_status "Docker Compose is already installed."
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 5000/tcp
sudo ufw allow 6881:6891/tcp
sudo ufw allow 6881:6891/udp
sudo ufw --force enable

print_status "Firewall configured successfully!"

# Create application directory
APP_DIR="/home/$USER/torrent-downloader"
print_status "Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR

# Create necessary directories
print_status "Creating application directories..."
mkdir -p downloads torrents data

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 downloads torrents data

print_status "✅ Deployment preparation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy your application files to: $APP_DIR"
echo "2. Run 'newgrp docker' or logout and login again to apply Docker group membership"
echo "3. Navigate to $APP_DIR and run: docker-compose up -d"
echo "4. Your application will be available at: http://your-server-ip:5000"
echo ""
echo "Useful commands:"
echo "- Start application: docker-compose up -d"
echo "- Stop application: docker-compose down"
echo "- View logs: docker-compose logs -f"
echo "- Restart application: docker-compose restart"
