# Oracle Ubuntu Server Deployment Guide

## Server Information
- **Public IP**: 129.159.227.52
- **Access URL**: http://129.159.227.52/
- **Platform**: Oracle Cloud Ubuntu Server

## Pre-Deployment Checklist

### 1. Oracle Cloud Security List Configuration
Ensure the following ports are open in your Oracle Cloud Security List:

**Ingress Rules:**
- Port 80 (TCP) - HTTP access
- Port 6881-6891 (TCP) - Torrent protocol
- Port 6881-6891 (UDP) - Torrent protocol
- Port 22 (TCP) - SSH access (if needed)

### 2. Server Access
```bash
# SSH into your Oracle server
ssh ubuntu@129.159.227.52
```

## Deployment Steps

### Step 1: Prepare the Server
1. Copy the deployment script to your server:
```bash
scp deploy-oracle.sh ubuntu@129.159.227.52:~/
```

2. SSH into the server and run the deployment preparation:
```bash
ssh ubuntu@129.159.227.52
chmod +x deploy-oracle.sh
./deploy-oracle.sh
```

### Step 2: Deploy the Application
1. Copy all application files to the server:
```bash
# From your local machine, copy the entire project
rsync -avz --exclude '__pycache__' --exclude '.git' --exclude 'downloads/*' \
    /workspaces/Downloader/ ubuntu@129.159.227.52:~/torrent-downloader/
```

2. SSH into the server and deploy:
```bash
ssh ubuntu@129.159.227.52
cd ~/torrent-downloader
./quick-deploy-oracle.sh
```

### Step 3: Verify Deployment
1. Check if the application is running:
```bash
docker-compose -f docker-compose.oracle.yml ps
```

2. View application logs:
```bash
docker-compose -f docker-compose.oracle.yml logs -f
```

3. Test the application:
```bash
curl http://localhost:80/
```

## Application Access

Once deployed, your torrent downloader will be available at:
**http://129.159.227.52/**

## Configuration Files

### Environment Configuration
- **Development**: `.env`
- **Production**: `.env.production`
- **Oracle Server**: `.env.oracle` ← **Used for deployment**

### Docker Configuration
- **Development**: `docker-compose.yml`
- **Oracle Server**: `docker-compose.oracle.yml` ← **Used for deployment**

## Management Commands

### Start/Stop Application
```bash
# Start
docker-compose -f docker-compose.oracle.yml up -d

# Stop
docker-compose -f docker-compose.oracle.yml down

# Restart
docker-compose -f docker-compose.oracle.yml restart
```

### View Logs
```bash
# View all logs
docker-compose -f docker-compose.oracle.yml logs -f

# View specific service logs
docker logs torrent-downloader-oracle
```

### System Service (Auto-start)
```bash
# Start service
sudo systemctl start torrent-downloader

# Stop service
sudo systemctl stop torrent-downloader

# Check status
sudo systemctl status torrent-downloader

# Enable auto-start on boot
sudo systemctl enable torrent-downloader
```

### Monitor Resources
```bash
# Check Docker container resources
docker stats torrent-downloader-oracle

# Check server resources
htop
```

## Troubleshooting

### Common Issues

1. **Port 80 Access Denied**
   - Ensure Oracle Cloud Security List allows port 80
   - Check iptables: `sudo iptables -L`
   - Check UFW: `sudo ufw status`

2. **Application Not Starting**
   - Check logs: `docker-compose -f docker-compose.oracle.yml logs`
   - Verify Docker is running: `sudo systemctl status docker`
   - Check disk space: `df -h`

3. **Torrent Downloads Not Working**
   - Ensure ports 6881-6891 are open
   - Check torrent client logs in application

4. **Docker Permission Issues**
   - Add user to docker group: `sudo usermod -aG docker $USER`
   - Logout and login again

### Log Locations
- **Application Logs**: `docker-compose -f docker-compose.oracle.yml logs`
- **System Logs**: `/var/log/syslog`
- **Docker Logs**: `journalctl -u docker`

### Firewall Configuration
```bash
# Check current rules
sudo iptables -L
sudo ufw status

# Add rules if needed
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 6881:6891 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 6881:6891 -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

## Security Considerations

1. **Change Default Secrets**: Update the SECRET_KEY in `.env.oracle`
2. **Firewall**: Only open necessary ports
3. **Updates**: Regularly update the server and Docker images
4. **Monitoring**: Set up log monitoring and alerts

## Performance Optimization

1. **Oracle Cloud Shape**: Ensure adequate CPU/RAM for your needs
2. **Storage**: Use fast storage for downloads directory
3. **Network**: Monitor bandwidth usage
4. **Docker**: Optimize Docker resource limits if needed

## Backup Strategy

1. **Configuration**: Backup all `.env*` and `docker-compose*` files
2. **Downloads**: Consider backing up important downloads
3. **Data**: Backup the `data/` directory for application state

## Updates and Maintenance

1. **Application Updates**:
   ```bash
   cd ~/torrent-downloader
   git pull  # if using git
   docker-compose -f docker-compose.oracle.yml down
   docker-compose -f docker-compose.oracle.yml build
   docker-compose -f docker-compose.oracle.yml up -d
   ```

2. **System Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Docker Updates**:
   ```bash
   docker system prune -f  # Clean up unused containers/images
   ```
