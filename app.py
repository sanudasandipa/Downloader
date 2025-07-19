import os
import time
import json
import threading
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

if __name__ == '__main__':
    print("Starting Torrent Downloader Server...")
    print(f"Download path: {DOWNLOAD_PATH}")
    print(f"Torrent path: {TORRENT_PATH}")
    app.run(debug=True, host='0.0.0.0', port=5000)
