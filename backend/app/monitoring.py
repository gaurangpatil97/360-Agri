import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path(__file__).parent.parent / "logs.db"


def _connect():
    return sqlite3.connect(str(DB_PATH))


def get_stats():
    conn = _connect()
    try:
        cur = conn.cursor()

        # Total requests (exclude OPTIONS)
        cur.execute("SELECT COUNT(*) FROM request_logs WHERE method != 'OPTIONS'")
        total_row = cur.fetchone()
        total_requests = total_row[0] if total_row is not None else 0

        # Requests per endpoint
        cur.execute(
            "SELECT endpoint, COUNT(*) as cnt FROM request_logs WHERE method != 'OPTIONS' GROUP BY endpoint"
        )
        rows = cur.fetchall()
        requests_per_endpoint = {row[0]: row[1] for row in rows}

        # Avg response_ms per endpoint
        cur.execute(
            "SELECT endpoint, AVG(response_ms) as avg_ms FROM request_logs WHERE method != 'OPTIONS' GROUP BY endpoint"
        )
        rows = cur.fetchall()
        avg_response_ms_per_endpoint = {row[0]: round(row[1], 2) if row[1] is not None else 0.0 for row in rows}

        # Error rate percent
        cur.execute(
            "SELECT COUNT(*) FROM request_logs WHERE method != 'OPTIONS' AND status_code >= 400"
        )
        err_row = cur.fetchone()
        error_count = err_row[0] if err_row is not None else 0
        error_rate_percent = round((error_count / total_requests) * 100, 2) if total_requests > 0 else 0.0

        # Requests in last 7 days grouped by date (UTC)
        # Build last 7 dates (YYYY-MM-DD) ascending
        today = datetime.utcnow().date()
        last7 = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

        cur.execute(
            "SELECT date(timestamp) as day, COUNT(*) as cnt FROM request_logs "
            "WHERE method != 'OPTIONS' AND date(timestamp) BETWEEN date('now','-6 days') AND date('now') "
            "GROUP BY day"
        )
        rows = cur.fetchall()
        counts_by_day = {row[0]: row[1] for row in rows}
        requests_last_7_days = [{"date": d, "count": int(counts_by_day.get(d, 0))} for d in last7]

        # Most active endpoint
        cur.execute(
            "SELECT endpoint, COUNT(*) as cnt FROM request_logs WHERE method != 'OPTIONS' GROUP BY endpoint ORDER BY cnt DESC LIMIT 1"
        )
        top = cur.fetchone()
        most_active_endpoint = top[0] if top is not None else ""

        return {
            "total_requests": int(total_requests),
            "requests_per_endpoint": requests_per_endpoint,
            "avg_response_ms_per_endpoint": avg_response_ms_per_endpoint,
            "error_rate_percent": float(error_rate_percent),
            "requests_last_7_days": requests_last_7_days,
            "most_active_endpoint": most_active_endpoint,
        }
    finally:
        conn.close()
