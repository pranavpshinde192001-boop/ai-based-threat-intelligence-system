import time
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any
from ..models.models import Threat, ThreatFeed
from sqlalchemy.orm import Session

class FeedsAggregator:
    def __init__(self):
        # Precise geolocations for mapping threat arcs
        self.geo_db = {
            "US": {"country": "United States", "lat": 37.0902, "lon": -95.7129},
            "CN": {"country": "China", "lat": 35.8617, "lon": 104.1954},
            "RU": {"country": "Russia", "lat": 61.5240, "lon": 105.3188},
            "NL": {"country": "Netherlands", "lat": 52.1326, "lon": 5.2913},
            "DE": {"country": "Germany", "lat": 51.1657, "lon": 10.4515},
            "UA": {"country": "Ukraine", "lat": 48.3794, "lon": 31.1656},
            "GB": {"country": "United Kingdom", "lat": 55.3781, "lon": -3.4360},
            "BR": {"country": "Brazil", "lat": -14.2350, "lon": -51.9253},
            "IN": {"country": "India", "lat": 20.5937, "lon": 78.9629},
            "IR": {"country": "Iran", "lat": 32.4279, "lon": 53.6880},
        }

    def get_feed_health_stats(self) -> List[Dict[str, Any]]:
        return [
            {"id": "feed_opencti", "name": "OpenCTI Aggregator", "status": "ACTIVE", "integrity_score": 0.98, "type": "STIX2"},
            {"id": "feed_cve", "name": "NVD CVE Catalog", "status": "ACTIVE", "integrity_score": 1.0, "type": "Vulnerability"},
            {"id": "feed_abuseipdb", "name": "AbuseIPDB Spam Feed", "status": "ACTIVE", "integrity_score": 0.92, "type": "IP Indicators"},
            {"id": "feed_alienvault", "name": "AlienVault OTX Pulse", "status": "ACTIVE", "integrity_score": 0.95, "type": "Reputation"},
            {"id": "feed_misp", "name": "MISP Community Feed", "status": "ACTIVE", "integrity_score": 0.89, "type": "Attacker TTP"},
            {"id": "feed_virustotal", "name": "VirusTotal File Intel", "status": "ACTIVE", "integrity_score": 0.99, "type": "Hash Reputation"},
        ]

    def sync_feeds(self, db: Session) -> int:
        feed_sources = ["OpenCTI", "CVE", "AbuseIPDB", "AlienVault OTX", "MISP", "VirusTotal"]
        threat_types = ["MALWARE", "PHISHING", "DDOS", "BOTNET", "EXFILTRATION"]
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        countries = list(self.geo_db.keys())
        
        threats_created = 0
        
        # Seed 10 new threats during sync
        for _ in range(10):
            source = random.choice(feed_sources)
            t_type = random.choice(threat_types)
            country_code = random.choice(countries)
            geo = self.geo_db[country_code]
            severity = random.choice(severities)
            
            risk_score = 30.0 + random.uniform(5.0, 60.0)
            if severity == "CRITICAL":
                risk_score = max(86.0, risk_score)
            elif severity == "HIGH":
                risk_score = max(71.0, risk_score)
            elif severity == "LOW":
                risk_score = min(39.0, risk_score)
                
            if t_type == "MALWARE":
                title = f"Trojan deployment matching signatures in {random.choice(['LockBit.dll', 'Agent.exe', 'Mimikatz.bin'])}"
            elif t_type == "PHISHING":
                title = f"Rogue domain portal hosted on {random.choice(['secure-dns-route.ru', 'login-verify-account.cn'])}"
            elif t_type == "DDOS":
                title = f"Volumetric NTP amplified flood attacks originating from botnet node"
            elif t_type == "BOTNET":
                title = f"SSH login brute forcing payload requests"
            else:
                title = f"High size payload egress over TCP port 443"
                
            threat_db = Threat(
                title=title,
                type=t_type,
                source=source,
                severity=severity,
                risk_score=round(risk_score, 2),
                status="NEW",
                raw_data=f'{{"ioc": "{random.getrandbits(128):x}", "timestamp": "{datetime.utcnow().isoformat()}"}}',
                country=geo["country"],
                latitude=geo["lat"],
                longitude=geo["lon"],
                detected_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 180))
            )
            db.add(threat_db)
            threats_created += 1
            
        # Update/Create entries in ThreatFeeds log table
        for name in feed_sources:
            feed = db.query(ThreatFeed).filter(ThreatFeed.name == name).first()
            if feed:
                feed.last_ingested_at = datetime.utcnow()
                feed.status = "ACTIVE"
            else:
                feed = ThreatFeed(
                    name=name,
                    url=f"https://api.{name.lower().replace(' ', '')}.com/v2/feed",
                    type="IOC Tracker",
                    status="ACTIVE",
                    last_ingested_at=datetime.utcnow(),
                    integrity_score=round(random.uniform(0.90, 1.0), 2)
                )
                db.add(feed)
                
        db.commit()
        return threats_created

feeds_aggregator = FeedsAggregator()
