import logging
import os
import secrets
import time

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import init_db, get_db
from .models import (
    InvoiceRequest,
    InvoiceRequestOut,
    InvoiceItemOut,
    StatusUpdate,
    LoginRequest,
)

logger = logging.getLogger(__name__)

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")
SESSION_TOKENS: dict[str, float] = {}  # token -> creation timestamp
SESSION_MAX_AGE = 86400  # 24 hours

app = FastAPI(title="Danielle Cowdrey Art — Gallery Catalog", docs_url=None, redoc_url=None)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")


# ── Rate limiter (in-memory sliding window) ──────────────────────────────────

_rate_limits: dict[str, list[float]] = {}


def _is_rate_limited(key: str, max_requests: int, window: int = 3600) -> bool:
    """Check if a key has exceeded max_requests in the last window seconds."""
    now = time.time()
    times = _rate_limits.get(key, [])
    times = [t for t in times if now - t < window]
    if len(times) >= max_requests:
        _rate_limits[key] = times
        return True
    times.append(now)
    _rate_limits[key] = times
    return False


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()  # rightmost = set by proxy
    return request.client.host if request.client else "unknown"


@app.on_event("startup")
def startup():
    init_db()
    if ADMIN_PASSWORD == "changeme":
        logger.warning(
            "ADMIN_PASSWORD is set to the default 'changeme'. "
            "Set a strong password via the ADMIN_PASSWORD environment variable."
        )


# --- Auth helpers ---

def require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    created_at = SESSION_TOKENS.get(token)
    if created_at is None or (time.time() - created_at) > SESSION_MAX_AGE:
        SESSION_TOKENS.pop(token, None)
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return token


# --- Auth endpoints ---

@app.post("/api/auth/login")
def login(body: LoginRequest, request: Request):
    ip = _client_ip(request)
    if _is_rate_limited(f"login:{ip}", max_requests=5, window=900):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    if not secrets.compare_digest(body.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid password")
    token = secrets.token_urlsafe(32)
    SESSION_TOKENS[token] = time.time()
    return {"token": token}


@app.post("/api/auth/logout")
def logout(token: str = Depends(require_admin)):
    SESSION_TOKENS.pop(token, None)
    return {"ok": True}


# --- Public: submit invoice request ---

@app.post("/api/requests", status_code=201)
def create_request(body: InvoiceRequest, request: Request):
    ip = _client_ip(request)
    if _is_rate_limited(f"request:{ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO requests (name, email, phone, company, notes)
               VALUES (?, ?, ?, ?, ?)""",
            (body.name, body.email, body.phone, body.company, body.notes),
        )
        request_id = cursor.lastrowid

        for item in body.items:
            conn.execute(
                """INSERT INTO request_items (request_id, art_name, product_type, size, quantity)
                   VALUES (?, ?, ?, ?, ?)""",
                (request_id, item.art_name, item.product_type, item.size, item.quantity),
            )

    return {"id": request_id, "message": "Invoice request submitted successfully"}


# --- Admin: list requests ---

@app.get("/api/requests", dependencies=[Depends(require_admin)])
def list_requests(status: str | None = None, page: int = 1, per_page: int = 50):
    offset = (page - 1) * per_page
    with get_db() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM requests WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (status, per_page, offset),
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) FROM requests WHERE status = ?", (status,)
            ).fetchone()[0]
        else:
            rows = conn.execute(
                "SELECT * FROM requests ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (per_page, offset),
            ).fetchall()
            total = conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0]

        requests_out = []
        for row in rows:
            items = conn.execute(
                "SELECT art_name, product_type, size, quantity FROM request_items WHERE request_id = ?",
                (row["id"],),
            ).fetchall()
            requests_out.append(
                InvoiceRequestOut(
                    id=row["id"],
                    name=row["name"],
                    email=row["email"],
                    phone=row["phone"],
                    company=row["company"],
                    notes=row["notes"],
                    items=[InvoiceItemOut(**dict(i)) for i in items],
                    status=row["status"],
                    admin_notes=row["admin_notes"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
            )

    return {"requests": [r.model_dump() for r in requests_out], "total": total, "page": page}


# --- Admin: get single request ---

@app.get("/api/requests/{request_id}", dependencies=[Depends(require_admin)])
def get_request(request_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM requests WHERE id = ?", (request_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")

        items = conn.execute(
            "SELECT art_name, product_type, size, quantity FROM request_items WHERE request_id = ?",
            (request_id,),
        ).fetchall()

        return InvoiceRequestOut(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            phone=row["phone"],
            company=row["company"],
            notes=row["notes"],
            items=[InvoiceItemOut(**dict(i)) for i in items],
            status=row["status"],
            admin_notes=row["admin_notes"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        ).model_dump()


# --- Admin: update request status ---

@app.patch("/api/requests/{request_id}", dependencies=[Depends(require_admin)])
def update_request(request_id: int, body: StatusUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM requests WHERE id = ?", (request_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")

        conn.execute(
            """UPDATE requests SET status = ?, admin_notes = ?, updated_at = datetime('now')
               WHERE id = ?""",
            (body.status, body.admin_notes, request_id),
        )

    return {"ok": True}


# --- Admin: delete request ---

@app.delete("/api/requests/{request_id}", dependencies=[Depends(require_admin)])
def delete_request(request_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM requests WHERE id = ?", (request_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Request not found")
        conn.execute("DELETE FROM request_items WHERE request_id = ?", (request_id,))
        conn.execute("DELETE FROM requests WHERE id = ?", (request_id,))

    return {"ok": True}


# --- Admin: summary stats ---

@app.get("/api/stats", dependencies=[Depends(require_admin)])
def get_stats():
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM requests WHERE status='pending'").fetchone()[0]
        reviewed = conn.execute("SELECT COUNT(*) FROM requests WHERE status='reviewed'").fetchone()[0]
        fulfilled = conn.execute("SELECT COUNT(*) FROM requests WHERE status='fulfilled'").fetchone()[0]
        total_items = conn.execute("SELECT COALESCE(SUM(quantity), 0) FROM request_items").fetchone()[0]

    return {
        "total_requests": total,
        "pending": pending,
        "reviewed": reviewed,
        "fulfilled": fulfilled,
        "total_items": total_items,
    }


# --- Static files ---

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/admin")
def serve_admin():
    return FileResponse(os.path.join(STATIC_DIR, "admin.html"))


@app.get("/health")
def health():
    return {"status": "ok"}
