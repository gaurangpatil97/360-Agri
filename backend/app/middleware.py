import sqlite3
import time
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "logs.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS request_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            method      TEXT NOT NULL,
            endpoint    TEXT NOT NULL,
            status_code INTEGER NOT NULL,
            response_ms REAL NOT NULL,
            prediction  TEXT,
            confidence  REAL,
            error       TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_request(method: str, endpoint: str, status_code: int,
                response_ms: float, prediction: str = None,
                confidence: float = None, error: str = None):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            INSERT INTO request_logs
            (timestamp, method, endpoint, status_code, response_ms, prediction, confidence, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.utcnow().isoformat(),
            method,
            endpoint,
            status_code,
            round(response_ms, 2),
            prediction,
            confidence,
            error
        ))
        conn.commit()
        conn.close()
    except Exception:
        pass  # never let logging break the main request

init_db()