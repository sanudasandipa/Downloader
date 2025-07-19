import os
import time
import json
import threading
import shutil
import psutil
from urllib.parse import quote
import libtorrent as lt
import requests
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from search_engine import TorrentSearchEngine

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configuration
DOWNLOAD_PATH = os.path.join(os.getcwd(), 'downloads')
TORRENT_PATH = os.path.join(os.getcwd(), 'torrents')

# Ensure directories exist
os.makedirs(DOWNLOAD_PATH, exist_ok=True)
os.makedirs(TORRENT_PATH, exist_ok=True)

# Global session and active downloads
session = lt.session()
session.listen_on(6881, 6891)
active_downloads = {}
search_engine = TorrentSearchEngine()

class TorrentDownloader:
    def __init__(self):
        self.session = session
        
    def add_torrent(self, torrent_info, save_path):
        """Add torrent to session"""
        params = {
            'ti': torrent_info,
            'save_path': save_path
        }
        handle = self.session.add_torrent(params)
        return handle
    
    def add_magnet(self, magnet_link, save_path):
        """Add magnet link to session"""
        params = {
            'url': magnet_link,
            'save_path': save_path
        }
        handle = self.session.add_torrent(params)
        return handle
    
    def get_download_info(self, handle):
        """Get download progress information"""
        status = handle.status()
        info = {
            'name': status.name,
            'progress': status.progress * 100,
            'download_rate': status.download_rate,
            'upload_rate': status.upload_rate,
            'num_peers': status.num_peers,
            'state': str(status.state),
            'total_size': status.total_wanted,
            'downloaded': status.total_done
        }
        return info

downloader = TorrentDownloader()

def get_storage_info():
    """Get real-time storage information"""
    try:
        # Get storage info for download directory
        download_path = DOWNLOAD_PATH
        
        # Get disk usage statistics
        total, used, free = shutil.disk_usage(download_path)
        
        # Get download folder size
        download_folder_size = get_folder_size(download_path)
        download_file_count = get_file_count(download_path)
        
        # Get system memory info
        memory = psutil.virtual_memory()
        
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Get network stats
        network_io = psutil.net_io_counters()
        
        # Calculate total download/upload speeds from active torrents
        total_download_rate = 0
        total_upload_rate = 0
        total_peers = 0
        
        for download_id, handle in active_downloads.items():
            try:
                status = handle.status()
                total_download_rate += status.download_rate
                total_upload_rate += status.upload_rate
                total_peers += status.num_peers
            except:
                continue
        
        # Calculate percentages
        disk_used_percent = (used / total) * 100
        disk_free_percent = (free / total) * 100
        memory_used_percent = memory.percent
        
        storage_info = {
            'disk': {
                'total': total,
                'used': used,
                'free': free,
                'used_percent': round(disk_used_percent, 2),
                'free_percent': round(disk_free_percent, 2),
                'total_formatted': format_bytes(total),
                'used_formatted': format_bytes(used),
                'free_formatted': format_bytes(free)
            },
            'downloads': {
                'folder_size': download_folder_size,
                'folder_size_formatted': format_bytes(download_folder_size),
                'file_count': download_file_count,
                'path': download_path
            },
            'system': {
                'memory_total': memory.total,
                'memory_used': memory.used,
                'memory_free': memory.available,
                'memory_percent': round(memory_used_percent, 2),
                'memory_total_formatted': format_bytes(memory.total),
                'memory_used_formatted': format_bytes(memory.used),
                'memory_free_formatted': format_bytes(memory.available),
                'cpu_percent': round(cpu_percent, 2)
            },
            'network': {
                'bytes_sent': network_io.bytes_sent,
                'bytes_recv': network_io.bytes_recv,
                'bytes_sent_formatted': format_bytes(network_io.bytes_sent),
                'bytes_recv_formatted': format_bytes(network_io.bytes_recv)
            },
            'torrents': {
                'total_download_rate': total_download_rate,
                'total_upload_rate': total_upload_rate,
                'total_download_rate_formatted': format_bytes(total_download_rate) + '/s',
                'total_upload_rate_formatted': format_bytes(total_upload_rate) + '/s',
                'total_peers': total_peers,
                'active_downloads': len(active_downloads)
            }
        }
        
        return storage_info
        
    except Exception as e:
        print(f"Error getting storage info: {e}")
        return {
            'disk': {'total': 0, 'used': 0, 'free': 0, 'used_percent': 0, 'free_percent': 0},
            'downloads': {'folder_size': 0, 'folder_size_formatted': '0 B'},
            'system': {'memory_percent': 0, 'cpu_percent': 0}
        }

def get_folder_size(folder_path):
    """Calculate the total size of a folder"""
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
    except Exception as e:
        print(f"Error calculating folder size: {e}")
    return total_size

def get_file_count(folder_path):
    """Count the number of files in a folder"""
    file_count = 0
    try:
        for dirpath, dirnames, filenames in os.walk(folder_path):
            file_count += len(filenames)
    except Exception as e:
        print(f"Error counting files: {e}")
    return file_count

def format_bytes(bytes_value):
    """Format bytes to human readable format"""
    if bytes_value == 0:
        return "0 B"
    
    sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    i = 0
    while bytes_value >= 1024 and i < len(sizes) - 1:
        bytes_value /= 1024.0
        i += 1
    
    return f"{bytes_value:.2f} {sizes[i]}"

def search_torrents(query, limit=20):
    """Search for torrents using the search engine"""
    try:
        results = search_engine.search_multiple_sources(query, limit)
        return results
    except Exception as e:
        print(f"Search error: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def api_search():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 20))
    
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400
    
    results = search_torrents(query, limit)
    return jsonify({'results': results})

@app.route('/api/download', methods=['POST'])
def api_download():
    data = request.json
    
    if 'magnet' in data:
        magnet_link = data['magnet']
        try:
            handle = downloader.add_magnet(magnet_link, DOWNLOAD_PATH)
            download_id = str(id(handle))
            active_downloads[download_id] = handle
            
            return jsonify({
                'success': True,
                'download_id': download_id,
                'message': 'Magnet link added successfully'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif 'torrent_file' in data:
        # Handle torrent file upload
        try:
            torrent_data = data['torrent_file']
            # Process torrent file (this would need base64 decoding in real implementation)
            return jsonify({'success': True, 'message': 'Torrent file processed'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'No magnet link or torrent file provided'}), 400

@app.route('/api/downloads')
def api_downloads():
    downloads = []
    
    for download_id, handle in active_downloads.items():
        try:
            info = downloader.get_download_info(handle)
            info['id'] = download_id
            downloads.append(info)
        except Exception as e:
            print(f"Error getting download info: {e}")
    
    return jsonify({'downloads': downloads})

@app.route('/api/storage')
def api_storage():
    """Get real-time storage and system information"""
    storage_info = get_storage_info()
    return jsonify(storage_info)

@app.route('/api/download/<download_id>/pause', methods=['POST'])
def api_pause_download(download_id):
    if download_id in active_downloads:
        handle = active_downloads[download_id]
        handle.pause()
        return jsonify({'success': True, 'message': 'Download paused'})
    return jsonify({'error': 'Download not found'}), 404

@app.route('/api/download/<download_id>/resume', methods=['POST'])
def api_resume_download(download_id):
    if download_id in active_downloads:
        handle = active_downloads[download_id]
        handle.resume()
        return jsonify({'success': True, 'message': 'Download resumed'})
    return jsonify({'error': 'Download not found'}), 404

@app.route('/api/download/<download_id>/remove', methods=['DELETE'])
def api_remove_download(download_id):
    if download_id in active_downloads:
        handle = active_downloads[download_id]
        session.remove_torrent(handle)
        del active_downloads[download_id]
        return jsonify({'success': True, 'message': 'Download removed'})
    return jsonify({'error': 'Download not found'}), 404

# File Management API Endpoints

@app.route('/api/files')
def api_list_files():
    """List all files and folders in downloads directory"""
    try:
        path = request.args.get('path', '')
        full_path = os.path.join(DOWNLOAD_PATH, path.lstrip('/'))
        
        # Security check - ensure path is within downloads directory
        if not os.path.abspath(full_path).startswith(os.path.abspath(DOWNLOAD_PATH)):
            return jsonify({'error': 'Access denied'}), 403
            
        if not os.path.exists(full_path):
            return jsonify({'error': 'Path not found'}), 404
            
        items = []
        try:
            for item in sorted(os.listdir(full_path)):
                item_path = os.path.join(full_path, item)
                relative_path = os.path.relpath(item_path, DOWNLOAD_PATH)
                
                if os.path.isdir(item_path):
                    # Count items in directory
                    try:
                        item_count = len([f for f in os.listdir(item_path)])
                    except:
                        item_count = 0
                        
                    items.append({
                        'name': item,
                        'type': 'folder',
                        'path': relative_path.replace('\\', '/'),
                        'size': get_folder_size(item_path),
                        'size_formatted': format_bytes(get_folder_size(item_path)),
                        'modified': os.path.getmtime(item_path),
                        'item_count': item_count
                    })
                else:
                    file_size = os.path.getsize(item_path)
                    file_ext = os.path.splitext(item)[1].lower()
                    
                    items.append({
                        'name': item,
                        'type': 'file',
                        'path': relative_path.replace('\\', '/'),
                        'size': file_size,
                        'size_formatted': format_bytes(file_size),
                        'modified': os.path.getmtime(item_path),
                        'extension': file_ext,
                        'mime_type': get_mime_type(file_ext)
                    })
        except PermissionError:
            return jsonify({'error': 'Permission denied'}), 403
            
        # Get current path info
        current_path = {
            'full_path': full_path,
            'relative_path': path,
            'parent_path': os.path.dirname(path) if path else None
        }
        
        return jsonify({
            'success': True,
            'path': current_path,
            'items': items,
            'total_items': len(items)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/download')
def api_download_file():
    """Download a file"""
    try:
        file_path = request.args.get('path', '')
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
            
        full_path = os.path.join(DOWNLOAD_PATH, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(DOWNLOAD_PATH)):
            return jsonify({'error': 'Access denied'}), 403
            
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return jsonify({'error': 'File not found'}), 404
            
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        
        return send_from_directory(directory, filename, as_attachment=True)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/delete', methods=['DELETE'])
def api_delete_file():
    """Delete a file or folder"""
    try:
        data = request.json
        file_path = data.get('path', '')
        
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
            
        full_path = os.path.join(DOWNLOAD_PATH, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(DOWNLOAD_PATH)):
            return jsonify({'error': 'Access denied'}), 403
            
        if not os.path.exists(full_path):
            return jsonify({'error': 'Path not found'}), 404
            
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
            return jsonify({'success': True, 'message': 'Folder deleted successfully'})
        else:
            os.remove(full_path)
            return jsonify({'success': True, 'message': 'File deleted successfully'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/share', methods=['POST'])
def api_share_file():
    """Generate a shareable link for a file"""
    try:
        data = request.json
        file_path = data.get('path', '')
        
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
            
        full_path = os.path.join(DOWNLOAD_PATH, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(DOWNLOAD_PATH)):
            return jsonify({'error': 'Access denied'}), 403
            
        if not os.path.exists(full_path):
            return jsonify({'error': 'File not found'}), 404
            
        # Generate shareable link (encode the path)
        encoded_path = quote(file_path)
        share_url = f"{request.host_url}api/files/download?path={encoded_path}"
        
        return jsonify({
            'success': True,
            'share_url': share_url,
            'filename': os.path.basename(file_path),
            'message': 'Share link generated successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/info')
def api_file_info():
    """Get detailed information about a file or folder"""
    try:
        file_path = request.args.get('path', '')
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
            
        full_path = os.path.join(DOWNLOAD_PATH, file_path.lstrip('/'))
        
        # Security check
        if not os.path.abspath(full_path).startswith(os.path.abspath(DOWNLOAD_PATH)):
            return jsonify({'error': 'Access denied'}), 403
            
        if not os.path.exists(full_path):
            return jsonify({'error': 'Path not found'}), 404
            
        stat_info = os.stat(full_path)
        
        info = {
            'name': os.path.basename(full_path),
            'path': file_path,
            'full_path': full_path,
            'type': 'folder' if os.path.isdir(full_path) else 'file',
            'size': stat_info.st_size if os.path.isfile(full_path) else get_folder_size(full_path),
            'created': stat_info.st_ctime,
            'modified': stat_info.st_mtime,
            'accessed': stat_info.st_atime,
            'permissions': oct(stat_info.st_mode)[-3:]
        }
        
        info['size_formatted'] = format_bytes(info['size'])
        
        if os.path.isfile(full_path):
            info['extension'] = os.path.splitext(full_path)[1].lower()
            info['mime_type'] = get_mime_type(info['extension'])
        else:
            # For folders, count items
            try:
                items = os.listdir(full_path)
                info['item_count'] = len(items)
                info['folders'] = len([item for item in items if os.path.isdir(os.path.join(full_path, item))])
                info['files'] = len([item for item in items if os.path.isfile(os.path.join(full_path, item))])
            except:
                info['item_count'] = 0
                info['folders'] = 0
                info['files'] = 0
        
        return jsonify({
            'success': True,
            'info': info
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_mime_type(file_extension):
    """Get MIME type based on file extension"""
    mime_types = {
        # Images
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        
        # Videos
        '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.webm': 'video/webm',
        '.mkv': 'video/x-matroska', '.m4v': 'video/x-m4v',
        
        # Audio
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
        '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.wma': 'audio/x-ms-wma',
        
        # Documents
        '.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain', '.rtf': 'application/rtf',
        
        # Archives
        '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed', '.tar': 'application/x-tar',
        '.gz': 'application/gzip', '.bz2': 'application/x-bzip2',
        
        # Executables
        '.exe': 'application/x-msdownload', '.msi': 'application/x-msi',
        '.deb': 'application/x-debian-package', '.rpm': 'application/x-rpm',
        '.dmg': 'application/x-apple-diskimage',
        
        # Data files
        '.bin': 'application/octet-stream', '.iso': 'application/x-iso9660-image',
        '.img': 'application/x-raw-disk-image'
    }
    
    return mime_types.get(file_extension.lower(), 'application/octet-stream')

if __name__ == '__main__':
    print("Starting Torrent Downloader Server...")
    print(f"Download path: {DOWNLOAD_PATH}")
    print(f"Torrent path: {TORRENT_PATH}")
    
    # Get configuration from environment variables
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    print(f"Server starting on {host}:{port}")
    print(f"Debug mode: {debug_mode}")
    
    app.run(debug=debug_mode, host=host, port=port)
