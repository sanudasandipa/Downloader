# Ubuntu Server Deployment Guide - Torrent Downloader

This guide will help you deploy the Torrent Downloader application on your Ubuntu server using Docker.

## 🚀 Quick Deployment

### Prerequisites
- Ubuntu 20.04 LTS or newer
- At least 2GB RAM and 10GB free disk space
- SSH access to your server
- Non-root user with sudo privileges

### Step 1: Connect to Your Server
```bash
ssh your-username@your-server-ip
```

### Step 2: Download the Application
```bash
# Clone the repository or copy files to your server
git clone <your-repo-url> torrent-downloader
# OR if copying files manually:
mkdir -p torrent-downloader
cd torrent-downloader
# Copy all files from your development environment to this directory
```

### Step 3: Run the Automated Setup
```bash
cd torrent-downloader
chmod +x deploy.sh
./deploy.sh
```

### Step 4: Apply Docker Group Changes
```bash
# Either logout and login again, or run:
newgrp docker
```

### Step 5: Start the Application
```bash
# Make sure you're in the application directory
cd ~/torrent-downloader

# Start the application in detached mode
docker-compose up -d
```

### Step 6: Verify Deployment
```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs -f torrent-downloader
```

Your application should now be accessible at:
- **Web Interface**: `http://your-server-ip:5000`
- **Torrent Ports**: `6881-6891` (TCP/UDP)

## 📁 Manual File Transfer

If you need to manually transfer files to your server:

### Using SCP
```bash
# From your local machine
scp -r /path/to/your/project/* username@your-server-ip:~/torrent-downloader/
```

### Using SFTP
```bash
sftp username@your-server-ip
cd torrent-downloader
put -r *
```

### Using rsync
```bash
rsync -avz /path/to/your/project/ username@your-server-ip:~/torrent-downloader/
```

## 🔧 Configuration

### Environment Variables
Edit the `.env.production` file to customize settings:
```bash
nano .env.production
```

Key settings:
- `SECRET_KEY`: Change this to a secure random string
- `MAX_DOWNLOAD_SPEED`: Set download speed limit (0 = unlimited)
- `MAX_UPLOAD_SPEED`: Set upload speed limit (0 = unlimited)

### Firewall Configuration
The deployment script automatically configures UFW, but verify:
```bash
sudo ufw status
```

Expected output should show:
- 5000/tcp (for web interface)
- 6881:6891/tcp (for torrent traffic)
- 6881:6891/udp (for torrent traffic)

## 🛠️ Management Commands

Use the `manage.sh` script for easy management:

```bash
# Check application status
./manage.sh status

# View real-time logs
./manage.sh logs

# Restart the application
./manage.sh restart

# Update the application
./manage.sh update

# Create a backup
./manage.sh backup

# Check system resources
./manage.sh resources

# Clean up Docker system
./manage.sh cleanup
```

## 🔍 Troubleshooting

### Container Won't Start
```bash
# Check detailed logs
docker-compose logs torrent-downloader

# Check if ports are already in use
sudo netstat -tlnp | grep 5000
sudo netstat -tlnp | grep 6881
```

### Permission Issues
```bash
# Fix ownership of directories
sudo chown -R $USER:$USER ~/torrent-downloader
chmod 755 downloads torrents data
```

### Memory Issues
```bash
# Check system resources
free -h
df -h
docker stats
```

### Network Issues
```bash
# Test if the application is responding
curl http://localhost:5000

# Check if Docker networking is working
docker network ls
```

## 🔒 Security Considerations

### 1. Change Default Credentials
- Update the `SECRET_KEY` in `.env.production`
- Consider adding authentication if exposing to the internet

### 2. Use Reverse Proxy (Optional)
For production use, consider using Nginx as a reverse proxy:

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/torrent-downloader
```

Example Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. SSL/HTTPS (Recommended)
Use Let's Encrypt for free SSL certificates:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring

### Application Logs
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### System Monitoring
```bash
# Check Docker container stats
docker stats

# Check system resources
htop
iotop
```

### Automated Monitoring
Consider setting up monitoring with:
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Simple cron jobs for health checks

## 🔄 Updates and Maintenance

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
./manage.sh update

# Create regular backups
./manage.sh backup
```

### Scheduled Backups
Add to crontab for automated backups:
```bash
crontab -e
# Add this line for daily backups at 2 AM:
0 2 * * * cd ~/torrent-downloader && ./manage.sh backup
```

## 🆘 Support

If you encounter issues:

1. Check the logs: `./manage.sh logs`
2. Verify system resources: `./manage.sh resources`
3. Check container status: `./manage.sh status`
4. Restart the application: `./manage.sh restart`

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | Change port in docker-compose.yml |
| Permission denied | Run `sudo chown -R $USER:$USER ~/torrent-downloader` |
| Out of disk space | Clean up downloads or add more storage |
| Container keeps restarting | Check logs and fix configuration |

---

🎉 **Congratulations!** Your Torrent Downloader is now running on your Ubuntu server!

Access your application at: `http://your-server-ip:5000`
