from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str
    mfa_token: Optional[str] = None

class UserMFAVerify(BaseModel):
    token: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    mfa_enabled: bool
    created_at: datetime
    role_id: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    mfa_required: bool
    user: UserResponse

# Threat Schemas
class ThreatBase(BaseModel):
    title: str
    type: str
    source: str
    severity: str
    risk_score: float
    country: str
    latitude: float
    longitude: float

class ThreatResponse(ThreatBase):
    id: str
    status: str
    raw_data: Optional[str] = None
    detected_at: datetime

    class Config:
        from_attributes = True

class IOCAnalysisRequest(BaseModel):
    ioc_type: str  # ip, domain, hash, url
    ioc_value: str

class IOCAnalysisResponse(BaseModel):
    ioc_value: str
    ioc_type: str
    risk_score: float
    severity: str
    classification: str
    is_anomaly: bool
    threat_actor: Optional[str] = None
    malware_family: Optional[str] = None
    recommendations: List[str]
    confidence: float

# Incident Schemas
class IncidentBase(BaseModel):
    title: str
    description: str
    severity: str

class IncidentCreate(IncidentBase):
    assignee_id: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class IncidentResponse(IncidentBase):
    id: str
    status: str
    assignee_id: Optional[str] = None
    creator_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Threat Feed Schemas
class FeedResponse(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    type: str
    status: str
    last_ingested_at: datetime
    integrity_score: float

    class Config:
        from_attributes = True

# Report Schemas
class ReportCreate(BaseModel):
    title: str
    type: str  # executive, soc, summary
    format: str  # PDF, CSV, Excel

class ReportResponse(BaseModel):
    id: str
    title: str
    type: str
    format: str
    file_path: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True

# AI Chat Assistant Schemas
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    suggestions: List[str]
    tokens_used: int
