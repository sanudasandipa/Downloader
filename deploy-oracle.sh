#!/bin/bash

# Oracle Ubuntu Server Torrent Downloader Deployment Script
# Public IP: http://129.159.227.52/

set -e

echo "🚀 Deploying Torrent Downloader on Oracle Ubuntu Server"
echo "Public IP: http://129.159.227.52/"
echo "=========================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_action() {
    echo -e "${BLUE}[ACTION]${NC} $1"
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
    ufw \
    htop \
    nano

# Install Docker if not present
print_status "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_action "Installing Docker..."
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index and install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed successfully!"
else
    print_status "Docker is already installed."
fi

# Install Docker Compose if not present
print_status "Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    print_action "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully!"
else
    print_status "Docker Compose is already installed."
fi

# Configure Oracle Cloud firewall (iptables)
print_status "Configuring Oracle Cloud firewall..."

# Allow HTTP (port 80)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Allow torrent ports
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 6881:6891 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 6881:6891 -j ACCEPT

# Save iptables rules
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null

# Configure UFW as well
print_status "Configuring UFW firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 6881:6891/tcp
sudo ufw allow 6881:6891/udp
sudo ufw --force enable

print_status "Firewall configured successfully!"

# Create application directory
APP_DIR="/home/$USER/torrent-downloader"
print_status "Setting up application directory at $APP_DIR..."

if [ -d "$APP_DIR" ]; then
    print_warning "Application directory already exists. Backing up..."
    sudo mv $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)
fi

mkdir -p $APP_DIR
cd $APP_DIR

# Create necessary directories
print_status "Creating application directories..."
mkdir -p downloads torrents data

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 downloads torrents data
sudo chown -R $USER:$USER $APP_DIR

# Create systemd service for auto-start
print_status "Creating systemd service for auto-start..."
sudo tee /etc/systemd/system/torrent-downloader.service > /dev/null << EOF
[Unit]
Description=Torrent Downloader
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.oracle.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.oracle.yml down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable torrent-downloader.service

print_status "✅ Oracle Ubuntu Server deployment preparation completed!"
echo ""
print_action "Next steps:"
echo "1. Copy your application files to: $APP_DIR"
echo "2. Run 'newgrp docker' or logout and login again to apply Docker group membership"
echo "3. Navigate to $APP_DIR and run: docker-compose -f docker-compose.oracle.yml up -d"
echo "4. Your application will be available at: http://129.159.227.52/"
echo ""
print_action "Useful commands:"
echo "- Start application: docker-compose -f docker-compose.oracle.yml up -d"
echo "- Stop application: docker-compose -f docker-compose.oracle.yml down"
echo "- View logs: docker-compose -f docker-compose.oracle.yml logs -f"
echo "- Restart application: docker-compose -f docker-compose.oracle.yml restart"
echo "- Check status: sudo systemctl status torrent-downloader"
echo ""
print_status "Oracle Cloud Instance Configuration:"
echo "- Public IP: 129.159.227.52"
echo "- Application URL: http://129.159.227.52/"
echo "- Firewall: Configured for ports 80, 6881-6891"
echo "- Auto-start: Enabled via systemd"
