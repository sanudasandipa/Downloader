class TorrentDownloader {
    constructor() {
        this.init();
        this.refreshInterval = null;
    }

    init() {
        this.bindEvents();
        this.startAutoRefresh();
        this.loadActiveDownloads();
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

        // Allow enter key in magnet input
        document.getElementById('magnetInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManualDownload();
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
        }, 2000);
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
}

// Initialize the app when the page loads
const app = new TorrentDownloader();
