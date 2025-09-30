from decouple import config

# Database settings
DATABASE_URL = config("DATABASE_URL", default="postgresql://username:password@localhost:5432/hostbuddy")

# JWT settings
JWT_SECRET_KEY = config("JWT_SECRET_KEY", default="change-this-secret-key-in-production")
JWT_ALGORITHM = config("JWT_ALGORITHM", default="HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = config("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", default=10080, cast=int)  # 7 days

# PostgreSQL settings
POSTGRES_USER = config("POSTGRES_USER", default="username")
POSTGRES_PASSWORD = config("POSTGRES_PASSWORD", default="password")
POSTGRES_DB = config("POSTGRES_DB", default="hostbuddy")
POSTGRES_HOST = config("POSTGRES_HOST", default="localhost")
POSTGRES_PORT = config("POSTGRES_PORT", default=5432, cast=int)

# MinIO settings
MINIO_ENDPOINT = config("MINIO_ENDPOINT", default="localhost:9000")
MINIO_PUBLIC_ENDPOINT = config("MINIO_PUBLIC_ENDPOINT", default="localhost:9000")
MINIO_ACCESS_KEY = config("MINIO_ACCESS_KEY", default="hostbuddy")
MINIO_SECRET_KEY = config("MINIO_SECRET_KEY", default="hostbuddy123")
MINIO_BUCKET = config("MINIO_BUCKET", default="images")
MINIO_SECURE = config("MINIO_SECURE", default=False, cast=bool)