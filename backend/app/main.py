from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import Base, engine, SessionLocal
from .core.config import settings
from .api.endpoints import router as api_router
from .models import models
from .core.security import get_password_hash
from datetime import datetime, timedelta
import random

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if DB is already seeded by checking the Role count
        if db.query(models.Role).count() == 0:
            # Create default enterprise roles
            admin_role = models.Role(name="Admin", description="Platform settings and user administration")
            analyst_role = models.Role(name="Analyst", description="SOC Threat Hunt and Incident responder")
            exec_role = models.Role(name="Executive", description="Read-only threat map and dashboard overview")
            db.add_all([admin_role, analyst_role, exec_role])
            db.commit()
            
            db.refresh(admin_role)
            db.refresh(analyst_role)
            
            # Create default user accounts
            admin_user = models.User(
                username="admin",
                email="admin@threatintel.com",
                password_hash=get_password_hash("password123"),
                role_id=admin_role.id
            )
            analyst_user = models.User(
                username="analyst",
                email="analyst@threatintel.com",
                password_hash=get_password_hash("password123"),
                role_id=analyst_role.id
            )
            db.add_all([admin_user, analyst_user])
            db.commit()
            db.refresh(admin_user)
            db.refresh(analyst_user)
            
            # Seed feeds table
            feed_sources = ["OpenCTI", "CVE", "AbuseIPDB", "AlienVault OTX", "MISP", "VirusTotal"]
            for name in feed_sources:
                feed = models.ThreatFeed(
                    name=name,
                    url=f"https://api.{name.lower().replace(' ', '')}.com/v2/feed",
                    type="IOC Feed",
                    status="ACTIVE",
                    last_ingested_at=datetime.utcnow(),
                    integrity_score=round(random.uniform(0.92, 1.0), 2)
                )
                db.add(feed)
            db.commit()
            
            # Seed system configurations
            settings_list = [
                models.Setting(key="smtp_server", value="smtp.corp.security.local", category="system"),
                models.Setting(key="smtp_port", value="587", category="system"),
                models.Setting(key="slack_webhook", value="https://hooks.slack.com/services/T00/B00/X00", category="notification"),
                models.Setting(key="alert_threshold", value="HIGH", category="security")
            ]
            db.add_all(settings_list)
            db.commit()
            
            # Seed 40 historical threat items with coordinates for mapping threat arcs
            countries_geo = [
                ("United States", 37.0902, -95.7129),
                ("China", 35.8617, 104.1954),
                ("Russia", 61.5240, 105.3188),
                ("Netherlands", 52.1326, 5.2913),
                ("Germany", 51.1657, 10.4515),
                ("Ukraine", 48.3794, 31.1656),
                ("United Kingdom", 55.3781, -3.4360),
                ("Brazil", -14.2350, -51.9253),
                ("India", 20.5937, 78.9629),
                ("Iran", 32.4279, 53.6880)
            ]
            threat_types = ["MALWARE", "PHISHING", "DDOS", "BOTNET", "EXFILTRATION"]
            severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            
            for i in range(40):
                c_name, c_lat, c_lon = random.choice(countries_geo)
                t_type = random.choice(threat_types)
                sev = random.choice(severities)
                r_score = 30.0 + random.uniform(5.0, 60.0)
                
                if sev == "CRITICAL":
                    r_score = max(86.0, r_score)
                elif sev == "HIGH":
                    r_score = max(71.0, r_score)
                elif sev == "LOW":
                    r_score = min(39.0, r_score)
                    
                if t_type == "MALWARE":
                    title = f"Trojan detection matching {random.choice(['LockBit.dll', 'Mimikatz.exe', 'Qakbot.bin'])}"
                elif t_type == "PHISHING":
                    title = f"Malicious redirect domain resolved to {random.choice(['203.0.113.', '198.51.100.'])}{random.randint(1, 254)}"
                elif t_type == "DDOS":
                    title = f"Volumetric NTP amplified flood attacks on web node"
                elif t_type == "BOTNET":
                    title = f"SSH brute forcing payload requests"
                else:
                    title = f"High size database backup exfiltration over SSL"
                    
                threat = models.Threat(
                    title=title,
                    type=t_type,
                    source=random.choice(feed_sources),
                    severity=sev,
                    risk_score=round(r_score, 2),
                    status=random.choice(["NEW", "INVESTIGATING", "CLOSED"]),
                    raw_data=f'{{"seed_ref": {i}, "type": "synthetic_intel"}}',
                    country=c_name,
                    latitude=c_lat,
                    longitude=c_lon,
                    detected_at=datetime.utcnow() - timedelta(minutes=random.randint(10, 2400))
                )
                db.add(threat)
            db.commit()
            
            # Seed starting incidents
            inc1 = models.Incident(
                title="Unauthorized data extraction from SQL DB Server",
                description="Abnormal port 3306 TCP connections detected transferring binary blobs to unauthorized network range in Netherlands.",
                severity="CRITICAL",
                status="INVESTIGATING",
                assignee_id=analyst_user.id,
                creator_id=admin_user.id
            )
            inc2 = models.Incident(
                title="Credential phishing campaign on Accounting Dept",
                description="Malicious invoices containing links to a compromised OAuth authentication portal were delivered. Ingress email filter rules updated.",
                severity="HIGH",
                status="OPEN",
                assignee_id=analyst_user.id,
                creator_id=admin_user.id
            )
            inc3 = models.Incident(
                title="Malware quarantined on Developer laptop",
                description="EDR alert: Trojan script download prevented from sandbox compiler site. Workstation scanned completely and verified clean.",
                severity="LOW",
                status="RESOLVED",
                assignee_id=analyst_user.id,
                creator_id=analyst_user.id
            )
            db.add_all([inc1, inc2, inc3])
            db.commit()
            
            # Save system startup log
            audit = models.AuditLog(
                action="PLATFORM_INITIALIZATION",
                details="SaaS Security Intelligence Platform initialized and default DB tables seeded.",
                ip_address="127.0.0.1"
            )
            db.add(audit)
            db.commit()
    finally:
        db.close()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configurations for cross-port calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def health_check():
    return {"status": "healthy", "platform": settings.PROJECT_NAME}
