"""SQLite-backed email/password authentication with signed expiring JWTs."""
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from pathlib import Path
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

DB_PATH = Path(os.getenv('AUTH_DB_PATH', './auth_data/users.sqlite3'))
JWT_SECRET = os.getenv('JWT_SECRET', '')
JWT_ALGORITHM = 'HS256'
TOKEN_TTL = 60 * 60 * 24
bearer = HTTPBearer(auto_error=False)


def connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.execute('PRAGMA busy_timeout=15000')
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, salt BLOB NOT NULL, password_hash BLOB NOT NULL, created_at INTEGER NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS user_videos (user_id TEXT NOT NULL, video_id TEXT NOT NULL, PRIMARY KEY (user_id, video_id))')
    db.commit()
    return db


def password_hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 600_000)


def create_user(name: str, email: str, password: str):
    email = email.strip().lower()
    if len(password) < 10 or len(password.encode('utf-8')) > 1024:
        raise HTTPException(422, 'Password must be at least 10 characters')
    salt = os.urandom(16)
    user_id = secrets.token_hex(16)
    with connection() as db:
        try:
            db.execute('INSERT INTO users VALUES (?,?,?,?,?,?)', (user_id, name.strip(), email, salt, password_hash(password, salt), int(time.time())))
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'An account with this email already exists')
    return {'id': user_id, 'name': name.strip(), 'email': email}


def authenticate(email: str, password: str):
    with connection() as db:
        row = db.execute('SELECT id,name,email,salt,password_hash FROM users WHERE email=?', (email.strip().lower(),)).fetchone()
    if not row or not hmac.compare_digest(password_hash(password, row[3]), row[4]):
        raise HTTPException(401, 'Invalid email or password')
    return {'id': row[0], 'name': row[1], 'email': row[2]}


def token_for(user):
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise HTTPException(503, 'JWT_SECRET must be configured (at least 32 characters)')
    return jwt.encode({'sub': user['id'], 'exp': int(time.time()) + TOKEN_TTL, 'iat': int(time.time())}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, 'Please sign in')
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload['sub']
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, 'Session expired or invalid; please sign in again')
    with connection() as db:
        row = db.execute('SELECT id,name,email FROM users WHERE id=?', (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, 'Account not found')
    return {'id': row[0], 'name': row[1], 'email': row[2]}


def remember_video(user_id: str, video_id: str):
    with connection() as db:
        db.execute('INSERT OR IGNORE INTO user_videos VALUES (?,?)', (user_id, video_id))


def user_video_ids(user_id: str):
    with connection() as db:
        return [r[0] for r in db.execute('SELECT video_id FROM user_videos WHERE user_id=?', (user_id,))]


def check_videos(user_id: str, video_ids: list[str]):
    allowed = set(user_video_ids(user_id))
    if not set(video_ids).issubset(allowed):
        raise HTTPException(403, 'One or more videos are not in your library')
