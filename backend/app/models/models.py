import uuid
from sqlalchemy import Column, String, Boolean, Float, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

# Many-to-many relationship helper for Role-Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role_id = Column(String, ForeignKey("roles.id"))
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    bio_auth_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    role = relationship("Role", back_populates="users")
    incidents_assigned = relationship("Incident", foreign_keys="Incident.assignee_id", back_populates="assignee")
    incidents_created = relationship("Incident", foreign_keys="Incident.creator_id", back_populates="creator")
    reports = relationship("Report", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Threat(Base):
    __tablename__ = "threats"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # malware, phishing, botnet, etc.
    source = Column(String, nullable=False)  # AlienVault, AbuseIPDB, etc.
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, default=0.0)
    status = Column(String, default="NEW")  # NEW, INVESTIGATING, CLOSED
    raw_data = Column(Text, nullable=True)  # JSON dump of feeds data
    country = Column(String, default="Unknown")
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    detected_at = Column(DateTime, default=datetime.utcnow)
    
    alerts = relationship("Alert", back_populates="threat")
    ai_recommendations = relationship("AIRecommendation", back_populates="threat")

class ThreatFeed(Base):
    __tablename__ = "threat_feeds"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    url = Column(String)
    type = Column(String)  # feed type
    status = Column(String, default="ACTIVE")  # ACTIVE, OFFLINE, ERROR
    last_ingested_at = Column(DateTime, default=datetime.utcnow)
    integrity_score = Column(Float, default=1.0)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="OPEN")  # OPEN, INVESTIGATING, RESOLVED, CLOSED
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    creator_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="incidents_assigned")
    creator = relationship("User", foreign_keys=[creator_id], back_populates="incidents_created")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    threat_id = Column(String, ForeignKey("threats.id"), nullable=True)
    message = Column(String, nullable=False)
    channel = Column(String)  # slack, email, webhook, sms
    status = Column(String, default="SENT")  # SENT, FAILED
    triggered_at = Column(DateTime, default=datetime.utcnow)
    
    threat = relationship("Threat", back_populates="alerts")

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # executive, soc, summary
    format = Column(String, nullable=False)  # PDF, CSV, Excel
    file_path = Column(String)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User", back_populates="reports")

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    threat_id = Column(String, ForeignKey("threats.id"))
    recommendation = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    model_used = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    threat = relationship("Threat", back_populates="ai_recommendations")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")

class Setting(Base):
    __tablename__ = "settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, nullable=False)
    value = Column(String)
    category = Column(String)  # system, security, notification

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String)  # threat, system, incident
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")
