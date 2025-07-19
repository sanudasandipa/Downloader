import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import quote, urljoin
import time

class TorrentSearchEngine:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def search_multiple_sources(self, query, limit=20):
        """Search across multiple torrent sources"""
        all_results = []
        
        # Search different sources
        sources = [
            self.search_sample_data,  # Sample data for demo
            # You can add more search engines here
        ]
        
        for search_func in sources:
            try:
                results = search_func(query, limit // len(sources))
                all_results.extend(results)
            except Exception as e:
                print(f"Error in search source: {e}")
                continue
        
        # Sort by seeders (higher first) and limit results
        all_results.sort(key=lambda x: int(x.get('seeders', 0)), reverse=True)
        return all_results[:limit]

    def search_sample_data(self, query, limit=10):
        """Generate sample torrent data for demonstration"""
        sample_categories = ['Movies', 'TV Shows', 'Music', 'Games', 'Software', 'Books']
        sample_sizes = ['1.2 GB', '750 MB', '2.1 GB', '450 MB', '3.4 GB', '125 MB', '850 MB']
        
        results = []
        for i in range(min(limit, 10)):
            # Generate realistic-looking sample data
            category = sample_categories[i % len(sample_categories)]
            size = sample_sizes[i % len(sample_sizes)]
            seeders = max(1, 200 - (i * 15) + (hash(query + str(i)) % 50))
            leechers = max(0, seeders // 4 + (hash(query + str(i)) % 20))
            
            result = {
                'name': f'{query} - {category} {i+1}',
                'size': size,
                'seeders': seeders,
                'leechers': leechers,
                'magnet': f'magnet:?xt=urn:btih:{"".join([format(ord(c), "x") for c in (query + str(i))[:20]]).ljust(40, "0")}&dn={quote(query + " " + category + " " + str(i+1))}',
                'category': category,
                'uploaded': f'{i+1} days ago',
                'uploader': f'User{i+1}'
            }
            results.append(result)
        
        return results

    def search_1337x(self, query, limit=10):
        """Search 1337x.to (example implementation - may need proxy/VPN)"""
        try:
            # Note: This is a basic example. In production, you'd need to handle:
            # - Anti-bot measures
            # - Proxy rotation
            # - Rate limiting
            # - CAPTCHA solving
            
            search_url = f"https://1337x.to/search/{quote(query)}/1/"
            response = self.session.get(search_url, timeout=10)
            
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            results = []
            
            # Parse search results (this would need to be updated based on actual HTML structure)
            rows = soup.find_all('tr')[1:]  # Skip header row
            
            for row in rows[:limit]:
                try:
                    cols = row.find_all('td')
                    if len(cols) >= 5:
                        name = cols[0].get_text(strip=True)
                        seeders = cols[1].get_text(strip=True)
                        leechers = cols[2].get_text(strip=True)
                        size = cols[4].get_text(strip=True)
                        
                        # Extract magnet link (would need actual parsing)
                        magnet_link = "magnet:?xt=urn:btih:sample"  # Placeholder
                        
                        result = {
                            'name': name,
                            'size': size,
                            'seeders': int(seeders) if seeders.isdigit() else 0,
                            'leechers': int(leechers) if leechers.isdigit() else 0,
                            'magnet': magnet_link,
                            'category': 'Unknown'
                        }
                        results.append(result)
                except Exception as e:
                    continue
            
            return results
            
        except Exception as e:
            print(f"Error searching 1337x: {e}")
            return []

    def search_piratebay(self, query, limit=10):
        """Search The Pirate Bay (example implementation)"""
        # Similar implementation to 1337x
        # Note: TPB often requires special handling due to blocking
        return []

    def validate_magnet_link(self, magnet_link):
        """Validate if a magnet link is properly formatted"""
        magnet_pattern = r'^magnet:\?xt=urn:btih:[a-fA-F0-9]{40}&dn=.+'
        return bool(re.match(magnet_pattern, magnet_link))

    def extract_info_hash(self, magnet_link):
        """Extract info hash from magnet link"""
        match = re.search(r'urn:btih:([a-fA-F0-9]{40})', magnet_link)
        return match.group(1) if match else None

# Example usage:
if __name__ == "__main__":
    engine = TorrentSearchEngine()
    results = engine.search_multiple_sources("ubuntu", 5)
    
    for result in results:
        print(f"Name: {result['name']}")
        print(f"Size: {result['size']}")
        print(f"Seeders: {result['seeders']}")
        print(f"Magnet: {result['magnet'][:50]}...")
        print("-" * 50)
