#!/bin/bash

# Maintenance and monitoring script for the torrent downloader

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check container status
check_status() {
    print_status "Checking container status..."
    docker-compose ps
    echo ""
    
    if docker-compose ps | grep -q "Up"; then
        print_status "✅ Application is running"
    else
        print_warning "⚠️ Application is not running"
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing recent logs..."
    docker-compose logs --tail=50 -f
}

# Function to restart application
restart_app() {
    print_status "Restarting application..."
    docker-compose restart
    sleep 5
    check_status
}

# Function to update application
update_app() {
    print_status "Updating application..."
    docker-compose down
    docker-compose pull
    docker-compose build --no-cache
    docker-compose up -d
    sleep 10
    check_status
}

# Function to backup data
backup_data() {
    BACKUP_DIR="/home/$USER/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/torrent_backup_$TIMESTAMP.tar.gz"
    
    print_status "Creating backup..."
    mkdir -p $BACKUP_DIR
    
    tar -czf $BACKUP_FILE downloads/ torrents/ data/ docker-compose.yml .env.production
    
    print_status "Backup created: $BACKUP_FILE"
}

# Function to show system resources
show_resources() {
    print_status "System resources:"
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2 " " $4}'
    echo ""
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h /
    echo ""
    echo "Docker Stats:"
    docker stats --no-stream
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker system..."
    docker system prune -f
    docker volume prune -f
}

# Main menu
case "$1" in
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_app
        ;;
    update)
        update_app
        ;;
    backup)
        backup_data
        ;;
    resources)
        show_resources
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Torrent Downloader Management Script"
        echo "Usage: $0 {status|logs|restart|update|backup|resources|cleanup}"
        echo ""
        echo "Commands:"
        echo "  status     - Check application status"
        echo "  logs       - Show application logs"
        echo "  restart    - Restart the application"
        echo "  update     - Update and rebuild the application"
        echo "  backup     - Create a backup of application data"
        echo "  resources  - Show system resource usage"
        echo "  cleanup    - Clean up Docker system"
        exit 1
        ;;
esac
