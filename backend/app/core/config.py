import os

class Settings:
    PROJECT_NAME: str = "AI-Based Threat Intelligence Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CYBER_PLATFORM_SUPER_SECRET_KEY_00E5FF_7B61FF")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database configuration (Defaults to SQLite for seamless local execution)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./threat_intel.db")
    
    # Threat Feed API configurations
    ABUSEIPDB_API_KEY: str = os.getenv("ABUSEIPDB_API_KEY", "mock_abuseipdb_key")
    ALIENVAULT_API_KEY: str = os.getenv("ALIENVAULT_API_KEY", "mock_alienvault_key")
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "mock_virustotal_key")

settings = Settings()
