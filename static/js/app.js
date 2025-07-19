class TorrentDownloader {
    constructor() {
        this.currentPath = '';
        this.isGridView = false;
        this.init();
        this.refreshInterval = null;
    }

    init() {
        this.bindEvents();
        this.startAutoRefresh();
        this.loadActiveDownloads();
        this.loadStorageInfo();
        this.loadFiles();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchTorrents());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTorrents();
        });

        // Manual add functionality
        document.getElementById('addBtn').addEventListener('click', () => this.addManualDownload());
        document.getElementById('fileBtn').addEventListener('click', () => {
            document.getElementById('torrentFile').click();
        });

        document.getElementById('torrentFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                document.getElementById('magnetInput').value = e.target.files[0].name;
            }
        });

        // Refresh downloads
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadActiveDownloads());

        // Refresh storage info
        document.getElementById('refreshStorageBtn').addEventListener('click', () => this.loadStorageInfo());

        // Allow enter key in magnet input
        document.getElementById('magnetInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManualDownload();
        });

        // File Manager Events
        document.getElementById('refreshFilesBtn').addEventListener('click', () => this.loadFiles());
        document.getElementById('homeBtn').addEventListener('click', () => this.navigateToHome());
        document.getElementById('listViewBtn').addEventListener('click', () => this.setListView());
        document.getElementById('gridViewBtn').addEventListener('click', () => this.setGridView());
        
        // Modal Events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeInfoModal').addEventListener('click', () => this.closeInfoModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeModal());
        
        // Close modals when clicking outside
        document.getElementById('fileModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileModal') this.closeModal();
        });
        document.getElementById('fileInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileInfoModal') this.closeInfoModal();
        });
    }

    async searchTorrents() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.showToast('Please enter a search query', 'warning');
            return;
        }

        const loadingSpinner = document.getElementById('loadingSpinner');
        const searchResults = document.getElementById('searchResults');
        const resultsContainer = document.getElementById('resultsContainer');

        // Show loading
        loadingSpinner.style.display = 'block';
        searchResults.style.display = 'none';

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();

            loadingSpinner.style.display = 'none';

            if (data.results && data.results.length > 0) {
                this.displaySearchResults(data.results);
                searchResults.style.display = 'block';
            } else {
                this.showToast('No results found', 'warning');
            }
        } catch (error) {
            loadingSpinner.style.display = 'none';
            this.showToast('Error searching torrents: ' + error.message, 'error');
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';

        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            container.appendChild(resultElement);
        });
    }

    createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        div.innerHTML = `
            <div class="result-header">
                <div class="result-title">${this.escapeHtml(result.name)}</div>
            </div>
            <div class="result-info">
                <div class="info-item">
                    <i class="fas fa-hdd"></i>
                    <span>${result.size}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-arrow-up"></i>
                    <span>${result.seeders} seeders</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-arrow-down"></i>
                    <span>${result.leechers} leechers</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${result.category}</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="download-btn" onclick="app.downloadMagnet('${result.magnet}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;

        return div;
    }

    async downloadMagnet(magnetLink) {
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ magnet: magnetLink })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Download started successfully!', 'success');
                this.loadActiveDownloads();
            } else {
                this.showToast('Error starting download: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error starting download: ' + error.message, 'error');
        }
    }

    async addManualDownload() {
        const magnetInput = document.getElementById('magnetInput');
        const torrentFile = document.getElementById('torrentFile');
        
        const magnetLink = magnetInput.value.trim();
        
        if (!magnetLink && !torrentFile.files[0]) {
            this.showToast('Please enter a magnet link or select a torrent file', 'warning');
            return;
        }

        if (magnetLink) {
            await this.downloadMagnet(magnetLink);
            magnetInput.value = '';
        } else if (torrentFile.files[0]) {
            // Handle torrent file upload
            this.showToast('Torrent file upload not implemented yet', 'warning');
            torrentFile.value = '';
            magnetInput.value = '';
        }
    }

    async loadActiveDownloads() {
        try {
            const response = await fetch('/api/downloads');
            const data = await response.json();

            this.displayActiveDownloads(data.downloads || []);
        } catch (error) {
            console.error('Error loading downloads:', error);
        }
    }

    displayActiveDownloads(downloads) {
        const container = document.getElementById('downloadsContainer');
        
        if (downloads.length === 0) {
            container.innerHTML = `
                <div class="no-downloads">
                    <i class="fas fa-inbox"></i>
                    <p>No active downloads</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        downloads.forEach(download => {
            const downloadElement = this.createDownloadElement(download);
            container.appendChild(downloadElement);
        });
    }

    createDownloadElement(download) {
        const div = document.createElement('div');
        div.className = 'download-item';
        
        const progress = Math.round(download.progress || 0);
        const downloadRate = this.formatBytes(download.download_rate || 0);
        const uploadRate = this.formatBytes(download.upload_rate || 0);
        const totalSize = this.formatBytes(download.total_size || 0);
        const downloaded = this.formatBytes(download.downloaded || 0);

        div.innerHTML = `
            <div class="download-header">
                <div class="download-name">${this.escapeHtml(download.name || 'Unknown')}</div>
                <div class="download-controls">
                    <button class="control-btn pause" onclick="app.pauseDownload('${download.id}')">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button class="control-btn resume" onclick="app.resumeDownload('${download.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="control-btn remove" onclick="app.removeDownload('${download.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="download-stats">
                <div class="stat-item">
                    <i class="fas fa-percentage"></i>
                    <span>${progress}%</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-download"></i>
                    <span>${downloadRate}/s</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-upload"></i>
                    <span>${uploadRate}/s</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-hdd"></i>
                    <span>${downloaded} / ${totalSize}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-users"></i>
                    <span>${download.num_peers || 0} peers</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-info-circle"></i>
                    <span>${download.state || 'Unknown'}</span>
                </div>
            </div>
        `;

        return div;
    }

    async pauseDownload(downloadId) {
        try {
            const response = await fetch(`/api/download/${downloadId}/pause`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Download paused', 'success');
                this.loadActiveDownloads();
            } else {
                this.showToast('Error pausing download: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error pausing download: ' + error.message, 'error');
        }
    }

    async resumeDownload(downloadId) {
        try {
            const response = await fetch(`/api/download/${downloadId}/resume`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Download resumed', 'success');
                this.loadActiveDownloads();
            } else {
                this.showToast('Error resuming download: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error resuming download: ' + error.message, 'error');
        }
    }

    async removeDownload(downloadId) {
        if (!confirm('Are you sure you want to remove this download?')) {
            return;
        }

        try {
            const response = await fetch(`/api/download/${downloadId}/remove`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Download removed', 'success');
                this.loadActiveDownloads();
            } else {
                this.showToast('Error removing download: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error removing download: ' + error.message, 'error');
        }
    }

    startAutoRefresh() {
        // Refresh downloads every 2 seconds
        this.refreshInterval = setInterval(() => {
            this.loadActiveDownloads();
            this.loadStorageInfo();
        }, 3000); // Increased to 3 seconds to include storage info
    }

    async loadStorageInfo() {
        try {
            const response = await fetch('/api/storage');
            const data = await response.json();
            this.displayStorageInfo(data);
        } catch (error) {
            console.error('Error loading storage info:', error);
        }
    }

    displayStorageInfo(storageData) {
        // Update disk storage
        if (storageData.disk) {
            const diskUsedPercent = storageData.disk.used_percent || 0;
            
            // Update circular progress
            const diskProgress = document.getElementById('diskProgress');
            const diskPercentage = document.getElementById('diskPercentage');
            
            if (diskProgress && diskPercentage) {
                // Update the conic-gradient based on usage
                const progressColor = diskUsedPercent > 90 ? '#dc3545' : 
                                     diskUsedPercent > 75 ? '#ffc107' : '#667eea';
                
                diskProgress.style.background = `conic-gradient(${progressColor} ${diskUsedPercent * 3.6}deg, #e9ecef 0deg)`;
                diskPercentage.textContent = `${diskUsedPercent.toFixed(1)}%`;
            }
            
            // Update disk info
            const elements = {
                'diskTotal': storageData.disk.total_formatted,
                'diskUsed': storageData.disk.used_formatted,
                'diskFree': storageData.disk.free_formatted
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        }

        // Update downloads folder info
        if (storageData.downloads) {
            const downloadsSize = document.getElementById('downloadsSize');
            const downloadsPath = document.getElementById('downloadsPath');
            const downloadCount = document.getElementById('downloadCount');
            
            if (downloadsSize) {
                downloadsSize.textContent = storageData.downloads.folder_size_formatted;
            }
            if (downloadsPath) {
                downloadsPath.textContent = storageData.downloads.path;
            }
            if (downloadCount) {
                const fileCount = storageData.downloads.file_count || 0;
                downloadCount.textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
            }
        }

        // Update system resources
        if (storageData.system) {
            // Memory
            const memoryPercent = storageData.system.memory_percent || 0;
            const memoryProgress = document.getElementById('memoryProgress');
            const memoryPercentage = document.getElementById('memoryPercentage');
            const memoryUsed = document.getElementById('memoryUsed');
            const memoryTotal = document.getElementById('memoryTotal');
            
            if (memoryProgress) {
                const memoryColor = memoryPercent > 90 ? '#dc3545' : 
                                   memoryPercent > 75 ? '#ffc107' : '#28a745';
                memoryProgress.style.width = `${memoryPercent}%`;
                memoryProgress.style.background = `linear-gradient(135deg, ${memoryColor}, ${memoryColor}dd)`;
            }
            if (memoryPercentage) memoryPercentage.textContent = `${memoryPercent.toFixed(1)}%`;
            if (memoryUsed) memoryUsed.textContent = storageData.system.memory_used_formatted;
            if (memoryTotal) memoryTotal.textContent = storageData.system.memory_total_formatted;
            
            // CPU
            const cpuPercent = storageData.system.cpu_percent || 0;
            const cpuProgress = document.getElementById('cpuProgress');
            const cpuPercentage = document.getElementById('cpuPercentage');
            
            if (cpuProgress) {
                const cpuColor = cpuPercent > 90 ? '#dc3545' : 
                                cpuPercent > 75 ? '#ffc107' : '#17a2b8';
                cpuProgress.style.width = `${cpuPercent}%`;
                cpuProgress.style.background = `linear-gradient(135deg, ${cpuColor}, ${cpuColor}dd)`;
            }
            if (cpuPercentage) cpuPercentage.textContent = `${cpuPercent.toFixed(1)}%`;
        }

        // Update torrent statistics
        if (storageData.torrents) {
            const elements = {
                'totalDownloadSpeed': storageData.torrents.total_download_rate_formatted,
                'totalUploadSpeed': storageData.torrents.total_upload_rate_formatted,
                'totalPeers': storageData.torrents.total_peers,
                'activeDownloads': storageData.torrents.active_downloads
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // File Manager Methods
    async loadFiles(path = '') {
        try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            const data = await response.json();

            if (data.success) {
                this.currentPath = path;
                this.displayFiles(data.items, data.path);
                this.updateBreadcrumb(path);
                document.getElementById('fileCount').textContent = `${data.total_items} items`;
            } else {
                this.showToast('Error loading files: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error loading files: ' + error.message, 'error');
        }
    }

    displayFiles(files, pathInfo) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = `
                <div class="no-files">
                    <i class="fas fa-folder-open"></i>
                    <p>This folder is empty</p>
                </div>
            `;
            return;
        }

        files.forEach(file => {
            const fileElement = this.createFileElement(file);
            fileList.appendChild(fileElement);
        });
    }

    createFileElement(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        const icon = this.getFileIcon(file);
        const isFolder = file.type === 'folder';
        
        div.innerHTML = `
            <div class="file-icon ${file.type} ${this.getFileCategory(file)}">
                <i class="${icon}"></i>
            </div>
            <div class="file-details">
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span class="file-size">${file.size_formatted}</span>
                        ${isFolder ? `<span class="file-count">${file.item_count} items</span>` : ''}
                        <span class="file-date">${new Date(file.modified * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${isFolder ? 
                        `<button class="file-action-btn download" onclick="app.downloadFile('${file.path}')" title="Download as ZIP">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action-btn info" onclick="app.showFileInfo('${file.path}')" title="Info">
                            <i class="fas fa-info-circle"></i>
                        </button>` :
                        `<button class="file-action-btn download" onclick="app.downloadFile('${file.path}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action-btn share" onclick="app.shareFile('${file.path}')" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="file-action-btn info" onclick="app.showFileInfo('${file.path}')" title="Info">
                            <i class="fas fa-info-circle"></i>
                        </button>`
                    }
                    <button class="file-action-btn delete" onclick="app.deleteFile('${file.path}', '${file.name}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Add click event for navigation
        if (isFolder) {
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions')) {
                    this.loadFiles(file.path);
                }
            });
            div.style.cursor = 'pointer';
        }

        return div;
    }

    getFileIcon(file) {
        if (file.type === 'folder') {
            return 'fas fa-folder';
        }

        const extension = file.extension ? file.extension.toLowerCase() : '';
        
        // Images
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension)) {
            return 'fas fa-image';
        }
        
        // Videos
        if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'].includes(extension)) {
            return 'fas fa-video';
        }
        
        // Audio
        if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'].includes(extension)) {
            return 'fas fa-music';
        }
        
        // Archives
        if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(extension)) {
            return 'fas fa-file-archive';
        }
        
        // Executables
        if (['.exe', '.msi', '.deb', '.rpm', '.dmg'].includes(extension)) {
            return 'fas fa-cog';
        }
        
        // Documents
        if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(extension)) {
            return 'fas fa-file-alt';
        }
        
        // Default
        return 'fas fa-file';
    }

    getFileCategory(file) {
        if (file.type === 'folder') return 'folder';
        
        const extension = file.extension ? file.extension.toLowerCase() : '';
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension)) {
            return 'image';
        }
        if (['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'].includes(extension)) {
            return 'video';
        }
        if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'].includes(extension)) {
            return 'audio';
        }
        if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(extension)) {
            return 'archive';
        }
        if (['.exe', '.msi', '.deb', '.rpm', '.dmg'].includes(extension)) {
            return 'executable';
        }
        
        return 'file';
    }

    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '';

        // Home item
        const homeItem = document.createElement('span');
        homeItem.className = path === '' ? 'breadcrumb-item active' : 'breadcrumb-item';
        homeItem.innerHTML = '<i class="fas fa-home"></i> Downloads';
        homeItem.addEventListener('click', () => this.navigateToHome());
        breadcrumb.appendChild(homeItem);

        if (path) {
            const parts = path.split('/').filter(part => part);
            let currentPath = '';

            parts.forEach((part, index) => {
                currentPath += (currentPath ? '/' : '') + part;
                
                // Add separator
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.innerHTML = '<i class="fas fa-chevron-right"></i>';
                breadcrumb.appendChild(separator);

                // Add path item
                const pathItem = document.createElement('span');
                pathItem.className = index === parts.length - 1 ? 'breadcrumb-item active' : 'breadcrumb-item';
                pathItem.textContent = part;
                
                if (index < parts.length - 1) {
                    const targetPath = currentPath;
                    pathItem.addEventListener('click', () => this.loadFiles(targetPath));
                }
                
                breadcrumb.appendChild(pathItem);
            });
        }
    }

    navigateToHome() {
        this.loadFiles('');
    }

    setListView() {
        this.isGridView = false;
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
        document.getElementById('fileList').classList.remove('grid-view');
    }

    setGridView() {
        this.isGridView = true;
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
        document.getElementById('fileList').classList.add('grid-view');
    }

    async downloadFile(filePath) {
        try {
            // First check if it's a folder by getting file info
            const fileInfoResponse = await fetch(`/api/files/info?path=${encodeURIComponent(filePath)}`);
            const fileInfoData = await fileInfoResponse.json();
            
            if (fileInfoData.success) {
                const isFolder = fileInfoData.info.type === 'folder';
                const fileName = fileInfoData.info.name;
                
                if (isFolder) {
                    // Show confirmation for folder download
                    this.showFolderDownloadConfirmation(filePath, fileName, fileInfoData.info);
                } else {
                    // Direct download for files
                    this.performDownload(filePath);
                }
            } else {
                // Fallback: attempt direct download
                this.performDownload(filePath);
            }
        } catch (error) {
            this.showToast('Error downloading file: ' + error.message, 'error');
        }
    }

    showFolderDownloadConfirmation(folderPath, folderName, folderInfo) {
        const modal = document.getElementById('fileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = 'Download Folder as ZIP';
        modalContent.innerHTML = `
            <div class="folder-download-info">
                <p>Are you sure you want to download the folder <strong>"${this.escapeHtml(folderName)}"</strong> as a ZIP file?</p>
                <div class="folder-stats">
                    <div class="stat-item">
                        <i class="fas fa-folder"></i>
                        <span>Size: ${folderInfo.size_formatted}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-file"></i>
                        <span>Files: ${folderInfo.files || 0}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-folder"></i>
                        <span>Folders: ${folderInfo.folders || 0}</span>
                    </div>
                </div>
                <p class="download-note">
                    <i class="fas fa-info-circle"></i>
                    The folder will be compressed into a ZIP file for download. This may take some time for large folders.
                </p>
            </div>
        `;

        modalConfirm.textContent = 'Download ZIP';
        modalConfirm.onclick = () => {
            this.closeModal();
            this.performDownload(folderPath, true);
        };

        modal.style.display = 'flex';
    }

    performDownload(filePath, isFolder = false) {
        try {
            if (isFolder) {
                this.showToast('Creating ZIP file... This may take a moment for large folders.', 'info');
            }
            
            const url = `/api/files/download?path=${encodeURIComponent(filePath)}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (isFolder) {
                this.showToast('ZIP download started', 'success');
            } else {
                this.showToast('Download started', 'success');
            }
        } catch (error) {
            this.showToast('Error downloading: ' + error.message, 'error');
        }
    }

    async shareFile(filePath) {
        try {
            const response = await fetch('/api/files/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: filePath })
            });

            const data = await response.json();

            if (data.success) {
                this.showShareModal(data.share_url, data.filename);
            } else {
                this.showToast('Error generating share link: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error generating share link: ' + error.message, 'error');
        }
    }

    showShareModal(shareUrl, filename) {
        const modal = document.getElementById('fileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = 'Share File';
        modalContent.innerHTML = `
            <p>Share link for <strong>${this.escapeHtml(filename)}</strong>:</p>
            <div class="share-url-container">
                <div class="share-url" id="shareUrl">${shareUrl}</div>
                <button class="copy-btn" onclick="app.copyToClipboard('${shareUrl}')">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
            </div>
            <p><small>This link allows direct download of the file.</small></p>
        `;

        modalConfirm.style.display = 'none';
        modal.style.display = 'flex';
    }

    async deleteFile(filePath, fileName) {
        const modal = document.getElementById('fileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const modalConfirm = document.getElementById('modalConfirm');

        modalTitle.textContent = 'Delete File';
        modalContent.innerHTML = `
            <p>Are you sure you want to delete <strong>${this.escapeHtml(fileName)}</strong>?</p>
            <p><small class="text-danger">This action cannot be undone.</small></p>
        `;

        modalConfirm.style.display = 'block';
        modalConfirm.textContent = 'Delete';
        modalConfirm.className = 'btn-primary btn-danger';
        
        modalConfirm.onclick = async () => {
            try {
                const response = await fetch('/api/files/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ path: filePath })
                });

                const data = await response.json();

                if (data.success) {
                    this.showToast(data.message, 'success');
                    this.loadFiles(this.currentPath);
                    this.loadStorageInfo(); // Refresh storage info
                } else {
                    this.showToast('Error deleting file: ' + data.error, 'error');
                }
            } catch (error) {
                this.showToast('Error deleting file: ' + error.message, 'error');
            }
            
            this.closeModal();
        };

        modal.style.display = 'flex';
    }

    async showFileInfo(filePath) {
        try {
            const response = await fetch(`/api/files/info?path=${encodeURIComponent(filePath)}`);
            const data = await response.json();

            if (data.success) {
                const info = data.info;
                const modal = document.getElementById('fileInfoModal');
                const content = document.getElementById('fileInfoContent');

                content.innerHTML = `
                    <div class="info-grid">
                        <div class="info-label">Name:</div>
                        <div class="info-value">${this.escapeHtml(info.name)}</div>
                        
                        <div class="info-label">Type:</div>
                        <div class="info-value">${info.type === 'folder' ? 'Folder' : 'File'}</div>
                        
                        <div class="info-label">Size:</div>
                        <div class="info-value">${info.size_formatted}</div>
                        
                        <div class="info-label">Modified:</div>
                        <div class="info-value">${new Date(info.modified * 1000).toLocaleString()}</div>
                        
                        <div class="info-label">Created:</div>
                        <div class="info-value">${new Date(info.created * 1000).toLocaleString()}</div>
                        
                        ${info.type === 'file' ? `
                            <div class="info-label">Extension:</div>
                            <div class="info-value">${info.extension || 'None'}</div>
                            
                            <div class="info-label">MIME Type:</div>
                            <div class="info-value">${info.mime_type}</div>
                        ` : `
                            <div class="info-label">Items:</div>
                            <div class="info-value">${info.item_count} (${info.folders} folders, ${info.files} files)</div>
                        `}
                        
                        <div class="info-label">Path:</div>
                        <div class="info-value" style="word-break: break-all;">${this.escapeHtml(info.path)}</div>
                        
                        <div class="info-label">Permissions:</div>
                        <div class="info-value">${info.permissions}</div>
                    </div>
                `;

                modal.style.display = 'flex';
            } else {
                this.showToast('Error getting file info: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('Error getting file info: ' + error.message, 'error');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Link copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Failed to copy link', 'error');
        });
    }

    closeModal() {
        document.getElementById('fileModal').style.display = 'none';
    }

    closeInfoModal() {
        document.getElementById('fileInfoModal').style.display = 'none';
    }
}

// Initialize the app when the page loads
const app = new TorrentDownloader();
