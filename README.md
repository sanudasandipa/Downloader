# Torrent Downloader Web App

A modern, responsive web application for searching, downloading, and managing torrents and magnet links. Built with Python Flask backend and vanilla JavaScript frontend.

## Features

🔍 **Torrent Search**: Search for torrents across multiple sources
📥 **Download Management**: Add torrents via magnet links or torrent files
📊 **Real-time Progress**: Live download progress tracking
⏸️ **Download Control**: Pause, resume, and remove downloads
📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
🎨 **Modern UI**: Clean and intuitive user interface

## Technologies Used

- **Backend**: Python Flask, libtorrent-python3
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, Font Awesome icons
- **Real-time Updates**: AJAX polling for live updates

## Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Downloader
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Create necessary directories**:
   ```bash
   mkdir downloads torrents
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

5. **Access the application**:
   Open your web browser and navigate to `http://localhost:5000`

## Usage

### Searching for Torrents
1. Enter your search query in the search box
2. Click the search button or press Enter
3. Browse through the search results
4. Click "Download" on any result to start downloading

### Adding Downloads Manually
1. Paste a magnet link in the manual input field
2. Or click the file upload button to select a .torrent file
3. Click "Add Download" to start the download

### Managing Downloads
- **View Progress**: All active downloads show real-time progress
- **Pause/Resume**: Use the control buttons to manage downloads
- **Remove**: Delete downloads you no longer need
- **Auto-refresh**: Downloads update automatically every 2 seconds

## API Endpoints

### Search
- `GET /api/search?q=<query>&limit=<limit>`
  - Search for torrents
  - Returns JSON with search results

### Downloads
- `POST /api/download`
  - Add a new download (magnet link or torrent file)
  - Body: `{"magnet": "magnet:?xt=..."}`

- `GET /api/downloads`
  - Get all active downloads with progress info

- `POST /api/download/<id>/pause`
  - Pause a specific download

- `POST /api/download/<id>/resume`
  - Resume a paused download

- `DELETE /api/download/<id>/remove`
  - Remove a download completely

## Configuration

You can modify settings in the `.env` file:

```env
FLASK_ENV=development
FLASK_DEBUG=True
DOWNLOAD_PATH=./downloads
TORRENT_PATH=./torrents
HOST=0.0.0.0
PORT=5000
LISTEN_PORT_START=6881
LISTEN_PORT_END=6891
```

## File Structure

```
Downloader/
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── .env                  # Environment configuration
├── .gitignore           # Git ignore file
├── templates/
│   └── index.html       # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css    # Responsive CSS styles
│   └── js/
│       └── app.js       # Frontend JavaScript
├── downloads/           # Downloaded files (created automatically)
└── torrents/           # Torrent files (created automatically)
```

## Features in Detail

### Search Functionality
- Real-time torrent search across multiple sources
- Displays file size, seeders, leechers, and category
- Clean, organized search results

### Download Management
- Support for magnet links and .torrent files
- Real-time progress tracking with visual progress bars
- Download speed monitoring (upload/download rates)
- Peer count and connection status
- Pause, resume, and remove functionality

### Responsive Design
- Mobile-first design approach
- Adaptive layout for all screen sizes
- Touch-friendly interface for mobile devices
- Modern gradient design with smooth animations

### User Experience
- Toast notifications for user feedback
- Loading indicators during operations
- Auto-refresh for real-time updates
- Intuitive controls and clear visual hierarchy

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT in `.env` file
2. **Permission errors**: Ensure write permissions for downloads directory
3. **libtorrent installation issues**: Install system dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install python3-libtorrent
   
   # macOS
   brew install libtorrent-rasterbar
   ```

### Dependencies

If you encounter issues with libtorrent installation, you can try:

```bash
# Alternative installation methods
pip install python-libtorrent
# or
conda install -c conda-forge libtorrent
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for educational purposes only. Users are responsible for ensuring they comply with all applicable laws and regulations regarding torrenting and file sharing in their jurisdiction.

## Support

If you encounter any issues or have questions, please open an issue on the repository or contact the maintainers.