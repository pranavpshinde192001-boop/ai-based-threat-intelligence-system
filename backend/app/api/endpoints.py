from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import json
import time
from typing import List, Dict, Any

from ..core.database import get_db
from ..core.security import verify_password, get_password_hash, create_access_token, generate_mfa_secret, verify_mfa_token
from ..models import models
from ..schemas import schemas
from ..services.ai_engine import ai_engine
from ..services.feeds_aggregator import feeds_aggregator

router = APIRouter()
security_bearer = HTTPBearer()

# Dependency to check JWT and return User
def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer), db: Session = Depends(get_db)):
    token = credentials.credentials
    from jose import jwt
    from ..core.config import settings
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# AUTH ENDPOINTS
@router.post("/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user_uname = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user_uname:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    analyst_role = db.query(models.Role).filter(models.Role.name == "Analyst").first()
    role_id = analyst_role.id if analyst_role else None
    
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role_id=role_id,
        mfa_enabled=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == login_in.username).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if user.mfa_enabled:
        if not login_in.mfa_token:
            return schemas.TokenResponse(
                access_token="",
                token_type="bearer",
                mfa_required=True,
                user=schemas.UserResponse.from_orm(user)
            )
        if not verify_mfa_token(user.mfa_secret, login_in.mfa_token):
            raise HTTPException(status_code=400, detail="Invalid MFA token")
            
    access_token = create_access_token(subject=user.id)
    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        mfa_required=False,
        user=schemas.UserResponse.from_orm(user)
    )

@router.post("/auth/2fa/setup")
def setup_2fa(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_mfa_secret()
    current_user.mfa_secret = secret
    db.commit()
    qr_uri = f"otpauth://totp/ThreatIntel:{current_user.username}?secret={secret}&issuer=AIThreatIntelligence"
    return {"secret": secret, "qr_uri": qr_uri}

@router.post("/auth/2fa/verify")
def verify_2fa(mfa_verify: schemas.UserMFAVerify, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
    if verify_mfa_token(current_user.mfa_secret, mfa_verify.token):
        current_user.mfa_enabled = True
        db.commit()
        return {"status": "success", "message": "MFA verified and enabled"}
    raise HTTPException(status_code=400, detail="Invalid verification code")

# DASHBOARD ENDPOINTS
@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_threats = db.query(models.Threat).count()
    critical_threats = db.query(models.Threat).filter(models.Threat.severity == "CRITICAL").count()
    active_incidents = db.query(models.Incident).filter(models.Incident.status != "CLOSED").count()
    
    country_query = db.query(models.Threat.country, models.sqlalchemy.func.count(models.Threat.id)).group_by(models.Threat.country).all()
    top_countries = [{"country": c, "count": count} for c, count in country_query]
    top_countries = sorted(top_countries, key=lambda x: x["count"], reverse=True)[:5]
    
    type_query = db.query(models.Threat.type, models.sqlalchemy.func.count(models.Threat.id)).group_by(models.Threat.type).all()
    threat_types = {t: count for t, count in type_query}
    
    recs = db.query(models.AIRecommendation).order_by(models.AIRecommendation.created_at.desc()).limit(3).all()
    ai_recs = [{"id": r.id, "threat_title": r.threat.title if r.threat else "AI Warning", "recommendation": r.recommendation, "confidence": r.confidence} for r in recs]
    
    return {
        "total_threats": total_threats,
        "critical_threats": critical_threats,
        "active_incidents": active_incidents,
        "top_countries": top_countries,
        "threat_types": threat_types,
        "ai_recommendations": ai_recs
    }

@router.get("/dashboard/trends")
def get_dashboard_trends(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    intervals = []
    labels = []
    
    for i in range(6, -1, -1):
        dt = now - timedelta(hours=i*4)
        labels.append(dt.strftime("%H:%M"))
        count = db.query(models.Threat).filter(models.Threat.detected_at <= dt, models.Threat.detected_at > dt - timedelta(hours=4)).count()
        intervals.append(count)
        
    return {"labels": labels, "counts": intervals}

@router.get("/dashboard/heat-map")
def get_heat_map(db: Session = Depends(get_db)):
    threats = db.query(models.Threat).order_by(models.Threat.detected_at.desc()).limit(100).all()
    points = []
    for t in threats:
        points.append({
            "id": t.id,
            "title": t.title,
            "type": t.type,
            "severity": t.severity,
            "risk_score": t.risk_score,
            "country": t.country,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "detected_at": t.detected_at.isoformat()
        })
    return points

# FEEDS ENDPOINTS
@router.get("/feeds")
def get_feeds(db: Session = Depends(get_db)):
    feeds = db.query(models.ThreatFeed).all()
    if not feeds:
        feeds_aggregator.sync_feeds(db)
        feeds = db.query(models.ThreatFeed).all()
    return feeds

@router.post("/feeds/sync")
def sync_feeds(db: Session = Depends(get_db)):
    added_count = feeds_aggregator.sync_feeds(db)
    audit = models.AuditLog(
        action="SYNC_THREAT_FEEDS",
        details=f"Synchronized threat feeds, aggregated {added_count} new indicators.",
        ip_address="127.0.0.1"
    )
    db.add(audit)
    db.commit()
    return {"status": "success", "added_threats": added_count}

# AI ENGINE ENDPOINTS
@router.post("/ai/analyze-ioc", response_model=schemas.IOCAnalysisResponse)
def analyze_ioc(req: schemas.IOCAnalysisRequest, db: Session = Depends(get_db)):
    analysis = ai_engine.analyze_ioc(req.ioc_type, req.ioc_value)
    
    if analysis["risk_score"] > 40:
        threat = models.Threat(
            title=f"AI Flagged Malicious {analysis['classification']} over {req.ioc_type}: {req.ioc_value}",
            type=analysis["classification"],
            source="AI Engine",
            severity=analysis["severity"],
            risk_score=analysis["risk_score"],
            status="NEW",
            raw_data=json.dumps(analysis),
            country="Unknown",
            detected_at=datetime.utcnow()
        )
        db.add(threat)
        db.commit()
        db.refresh(threat)
        
        rec = models.AIRecommendation(
            threat_id=threat.id,
            recommendation=analysis["recommendations"][0] if analysis["recommendations"] else "Monitor threat vectors.",
            confidence=analysis["confidence"],
            model_used="Random Forest + Isolation Forest"
        )
        db.add(rec)
        db.commit()
        
    return analysis

@router.post("/ai/assistant/chat", response_model=schemas.ChatResponse)
def chat_assistant(msg: schemas.ChatMessage):
    res = ai_engine.chat_helper(msg.message)
    return res

# INCIDENTS ENDPOINTS
@router.get("/incidents", response_model=List[schemas.IncidentResponse])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(models.Incident).order_by(models.Incident.created_at.desc()).all()

@router.post("/incidents", response_model=schemas.IncidentResponse)
def create_incident(inc: schemas.IncidentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_inc = models.Incident(
        title=inc.title,
        description=inc.description,
        severity=inc.severity,
        status="OPEN",
        assignee_id=inc.assignee_id,
        creator_id=current_user.id
    )
    db.add(new_inc)
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="CREATE_INCIDENT",
        details=f"Created incident: {inc.title}",
        ip_address="127.0.0.1"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_inc)
    return new_inc

@router.put("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def update_incident(incident_id: str, inc: schemas.IncidentUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not db_inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if inc.status:
        db_inc.status = inc.status
    if inc.assignee_id:
        db_inc.assignee_id = inc.assignee_id
    if inc.severity:
        db_inc.severity = inc.severity
    if inc.title:
        db_inc.title = inc.title
    if inc.description:
        db_inc.description = inc.description
        
    db_inc.updated_at = datetime.utcnow()
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="UPDATE_INCIDENT",
        details=f"Updated incident details for ID: {incident_id}",
        ip_address="127.0.0.1"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_inc)
    return db_inc

# REPORTS ENDPOINTS
@router.get("/reports", response_model=List[schemas.ReportResponse])
def get_reports(db: Session = Depends(get_db)):
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()

@router.post("/reports/generate", response_model=schemas.ReportResponse)
def generate_report(rep: schemas.ReportCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_name = f"report_{rep.type.lower()}_{int(time.time())}.{rep.format.lower()}"
    file_path = f"/static/reports/{file_name}"
    
    new_rep = models.Report(
        title=rep.title,
        type=rep.type,
        format=rep.format,
        file_path=file_path,
        created_by=current_user.id
    )
    db.add(new_rep)
    
    audit = models.AuditLog(
        user_id=current_user.id,
        action="GENERATE_REPORT",
        details=f"Generated {rep.format} report: {rep.title}",
        ip_address="127.0.0.1"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_rep)
    return new_rep

# SETTINGS ENDPOINTS
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    sets = db.query(models.Setting).all()
    return {s.key: s.value for s in sets}

@router.post("/settings")
def update_settings(updates: Dict[str, str], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in updates.items():
        setting = db.query(models.Setting).filter(models.Setting.key == k).first()
        if setting:
            setting.value = v
        else:
            setting = models.Setting(key=k, value=v, category="system")
            db.add(setting)
    db.commit()
    return {"status": "success", "message": "Settings updated"}

@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(50).all()
    return [{"id": l.id, "user": l.user.username if l.user else "System", "action": l.action, "ip": l.ip_address, "details": l.details, "timestamp": l.timestamp.isoformat()} for l in logs]
