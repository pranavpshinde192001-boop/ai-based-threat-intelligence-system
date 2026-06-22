import hmac
import hashlib
import time
import base64
import struct
from datetime import datetime, timedelta
from typing import Union, Any
from jose import jwt
import bcrypt
from .config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Self-contained RFC 6238 TOTP validation for MFA (Multi-Factor Authentication)
def generate_mfa_secret() -> str:
    import secrets
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    return "".join(secrets.choice(chars) for _ in range(16))

def verify_mfa_token(secret: str, token: str) -> bool:
    try:
        # Base32 decoding setup
        missing_padding = len(secret) % 8
        if missing_padding:
            secret += "=" * (8 - missing_padding)
        key = base64.b32decode(secret.upper())
        
        # Calculate current time interval (30 seconds window)
        current_time = int(time.time() / 30)
        
        # Allow ±1 step drift check
        for drift in [-1, 0, 1]:
            msg = struct.pack(">Q", current_time + drift)
            hmac_hash = hmac.new(key, msg, hashlib.sha1).digest()
            offset = hmac_hash[-1] & 0x0F
            code = ((struct.unpack(">I", hmac_hash[offset:offset+4])[0] & 0x7FFFFFFF) % 1000000)
            if f"{code:06d}" == token:
                return True
        return False
    except Exception:
        return False
