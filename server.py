import os
import json
import uuid
import sqlite3
import datetime
import hashlib
import hmac
import base64
import re
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, send_file, abort
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
CORS(app)

APP_ID = "6a1f3d189ebdbe71fa7d256c"
JWT_SECRET = os.environ.get("JWT_SECRET", "alefit-secret-key-change-in-production")
DB_PATH = "alefit.db"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            reset_token TEXT,
            reset_token_expiry TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            owner_id TEXT,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_owner ON entities(owner_id)")
    conn.commit()
    conn.close()


init_db()


# ---------------------------------------------------------------------------
# JWT helpers (no external lib needed — manual HS256)
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def create_token(user_id: str, email: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = int((datetime.datetime.utcnow() + datetime.timedelta(days=30)).timestamp())
    payload = _b64url_encode(json.dumps({"sub": user_id, "email": email, "exp": exp}).encode())
    sig_input = f"{header}.{payload}".encode()
    sig = hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url_encode(sig)}"


def verify_token(token: str):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        sig_input = f"{header}.{payload}".encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_encode(expected_sig), sig):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get("exp", 0) < datetime.datetime.utcnow().timestamp():
            return None
        return data
    except Exception:
        return None


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return base64.b64encode(salt + dk).decode()


def check_password(password: str, stored: str) -> bool:
    try:
        raw = base64.b64decode(stored.encode())
        salt = raw[:16]
        stored_dk = raw[16:]
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hmac.compare_digest(dk, stored_dk)
    except Exception:
        return False


def now_iso() -> str:
    return datetime.datetime.utcnow().isoformat() + "Z"


def get_current_user():
    auth = request.headers.get("Authorization", "")
    token = None
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.args.get("token")
    if not token:
        return None
    data = verify_token(token)
    if not data:
        return None
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (data["sub"],)).fetchone()
    conn.close()
    return dict(user) if user else None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated


def user_to_dict(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "role": user.get("role", "user"),
        "created_date": user.get("created_at", ""),
    }


# ---------------------------------------------------------------------------
# Static file serving
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_file("index.html")


@app.route("/<path:filename>")
def static_files(filename):
    if filename.startswith("api/"):
        abort(404)
    try:
        return send_from_directory(".", filename)
    except Exception:
        abort(404)


# ---------------------------------------------------------------------------
# Public settings (app initialization)
# ---------------------------------------------------------------------------

@app.route("/api/apps/public/prod/public-settings/by-id/<app_id>")
def public_settings(app_id):
    return jsonify({
        "id": app_id,
        "name": "ALEFIT",
        "auth": {
            "enabled": True,
            "providers": ["email"],
            "registration_enabled": True,
        },
        "theme": {"primary_color": "#000000"},
    })


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/auth/register", methods=["POST"])
def register(app_id):
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = data.get("full_name") or data.get("name") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Email already registered"}), 409

    user_id = str(uuid.uuid4())
    ts = now_iso()
    conn.execute(
        "INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        (user_id, email, hash_password(password), full_name, "user", ts, ts)
    )
    conn.commit()
    user = dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
    conn.close()

    token = create_token(user_id, email)
    return jsonify({"access_token": token, "user": user_to_dict(user)}), 201


@app.route("/api/apps/<app_id>/auth/login", methods=["POST"])
def login(app_id):
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user["id"], email)
    return jsonify({"access_token": token, "user": user_to_dict(dict(user))})


@app.route("/api/apps/<app_id>/auth/reset-password-request", methods=["POST"])
def reset_password_request(app_id):
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user:
        reset_token = str(uuid.uuid4())
        expiry = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).isoformat() + "Z"
        conn.execute(
            "UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?",
            (reset_token, expiry, email)
        )
        conn.commit()
        print(f"[Password Reset] Token for {email}: {reset_token}")
    conn.close()
    return jsonify({"message": "If this email exists, a reset link has been sent."})


@app.route("/api/apps/<app_id>/auth/reset-password", methods=["POST"])
def reset_password(app_id):
    data = request.get_json(force=True)
    reset_token = data.get("reset_token") or ""
    new_password = data.get("new_password") or ""

    if not reset_token or not new_password:
        return jsonify({"error": "reset_token and new_password are required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE reset_token = ?", (reset_token,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Invalid or expired reset token"}), 400

    expiry = user["reset_token_expiry"]
    if expiry and datetime.datetime.fromisoformat(expiry.replace("Z", "")) < datetime.datetime.utcnow():
        conn.close()
        return jsonify({"error": "Reset token has expired"}), 400

    conn.execute(
        "UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expiry=NULL, updated_at=? WHERE id=?",
        (hash_password(new_password), now_iso(), user["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Password updated successfully"})


@app.route("/api/apps/<app_id>/auth/change-password", methods=["POST"])
@require_auth
def change_password(app_id):
    data = request.get_json(force=True)
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    user = request.current_user

    if not check_password(current_password, user["password_hash"]):
        return jsonify({"error": "Current password is incorrect"}), 400

    conn = get_db()
    conn.execute(
        "UPDATE users SET password_hash=?, updated_at=? WHERE id=?",
        (hash_password(new_password), now_iso(), user["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Password changed successfully"})


@app.route("/api/apps/<app_id>/auth/verify-otp", methods=["POST"])
def verify_otp(app_id):
    return jsonify({"message": "OTP verification not required"}), 200


@app.route("/api/apps/<app_id>/auth/resend-otp", methods=["POST"])
def resend_otp(app_id):
    return jsonify({"message": "OTP resent"}), 200


# ---------------------------------------------------------------------------
# User entity special endpoint
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/entities/User/me")
@require_auth
def get_me(app_id):
    return jsonify(user_to_dict(request.current_user))


# ---------------------------------------------------------------------------
# Generic entity CRUD
# ---------------------------------------------------------------------------

def parse_filter_query(q_str: str):
    try:
        return json.loads(q_str)
    except Exception:
        return {}


def entity_matches_filter(data: dict, filters: dict) -> bool:
    for key, val in filters.items():
        if isinstance(val, dict):
            op = list(val.keys())[0] if val else None
            op_val = list(val.values())[0] if val else None
            field_val = data.get(key)
            if op == "$eq" and field_val != op_val:
                return False
            elif op == "$ne" and field_val == op_val:
                return False
            elif op == "$gt" and not (field_val is not None and field_val > op_val):
                return False
            elif op == "$gte" and not (field_val is not None and field_val >= op_val):
                return False
            elif op == "$lt" and not (field_val is not None and field_val < op_val):
                return False
            elif op == "$lte" and not (field_val is not None and field_val <= op_val):
                return False
            elif op == "$in" and field_val not in (op_val or []):
                return False
        else:
            if data.get(key) != val:
                return False
    return True


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["GET"])
@require_auth
def list_entities(app_id, entity_type):
    if entity_type == "User":
        return jsonify([user_to_dict(request.current_user)])

    user_id = request.current_user["id"]
    sort = request.args.get("sort")
    limit = int(request.args.get("limit", 1000))
    skip = int(request.args.get("skip", 0))
    filter_q = request.args.get("q")

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM entities WHERE entity_type=? AND owner_id=? ORDER BY created_at DESC",
        (entity_type, user_id)
    ).fetchall()
    conn.close()

    results = []
    for row in rows:
        d = json.loads(row["data"])
        d["id"] = row["id"]
        d["created_date"] = row["created_at"]
        d["updated_date"] = row["updated_at"]
        results.append(d)

    if filter_q:
        filters = parse_filter_query(filter_q)
        results = [r for r in results if entity_matches_filter(r, filters)]

    if sort:
        reverse = sort.startswith("-")
        sort_key = sort.lstrip("-")
        results.sort(key=lambda x: x.get(sort_key, ""), reverse=reverse)

    results = results[skip:skip + limit]
    return jsonify(results)


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["POST"])
@require_auth
def create_entity(app_id, entity_type):
    user_id = request.current_user["id"]
    data = request.get_json(force=True) or {}

    entity_id = str(uuid.uuid4())
    ts = now_iso()
    data.pop("id", None)
    data.pop("created_date", None)
    data.pop("updated_date", None)

    conn = get_db()
    conn.execute(
        "INSERT INTO entities (id, entity_type, owner_id, data, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        (entity_id, entity_type, user_id, json.dumps(data), ts, ts)
    )
    conn.commit()
    conn.close()

    data["id"] = entity_id
    data["created_date"] = ts
    data["updated_date"] = ts
    return jsonify(data), 201


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["GET"])
@require_auth
def get_entity(app_id, entity_type, entity_id):
    if entity_type == "User" and entity_id == "me":
        return jsonify(user_to_dict(request.current_user))

    user_id = request.current_user["id"]
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM entities WHERE id=? AND entity_type=? AND owner_id=?",
        (entity_id, entity_type, user_id)
    ).fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Not found"}), 404

    d = json.loads(row["data"])
    d["id"] = row["id"]
    d["created_date"] = row["created_at"]
    d["updated_date"] = row["updated_at"]
    return jsonify(d)


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["PUT"])
@require_auth
def update_entity(app_id, entity_type, entity_id):
    if entity_type == "User":
        data = request.get_json(force=True) or {}
        allowed = ["full_name", "role"]
        conn = get_db()
        for field in allowed:
            if field in data:
                conn.execute(f"UPDATE users SET {field}=?, updated_at=? WHERE id=?",
                             (data[field], now_iso(), request.current_user["id"]))
        conn.commit()
        user = dict(conn.execute("SELECT * FROM users WHERE id=?", (request.current_user["id"],)).fetchone())
        conn.close()
        return jsonify(user_to_dict(user))

    user_id = request.current_user["id"]
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM entities WHERE id=? AND entity_type=? AND owner_id=?",
        (entity_id, entity_type, user_id)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    existing = json.loads(row["data"])
    new_data = request.get_json(force=True) or {}
    new_data.pop("id", None)
    new_data.pop("created_date", None)
    new_data.pop("updated_date", None)
    existing.update(new_data)
    ts = now_iso()

    conn.execute(
        "UPDATE entities SET data=?, updated_at=? WHERE id=?",
        (json.dumps(existing), ts, entity_id)
    )
    conn.commit()
    conn.close()

    existing["id"] = entity_id
    existing["created_date"] = row["created_at"]
    existing["updated_date"] = ts
    return jsonify(existing)


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["DELETE"])
@require_auth
def delete_entity(app_id, entity_type, entity_id):
    user_id = request.current_user["id"]
    conn = get_db()
    result = conn.execute(
        "DELETE FROM entities WHERE id=? AND entity_type=? AND owner_id=?",
        (entity_id, entity_type, user_id)
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"success": True})


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["DELETE"])
@require_auth
def delete_many_entities(app_id, entity_type):
    user_id = request.current_user["id"]
    data = request.get_json(force=True) or {}
    ids = data if isinstance(data, list) else data.get("ids", [])

    conn = get_db()
    for entity_id in ids:
        conn.execute(
            "DELETE FROM entities WHERE id=? AND entity_type=? AND owner_id=?",
            (entity_id, entity_type, user_id)
        )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# AI / LLM integration endpoint
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/integration-endpoints/Core/InvokeLLM", methods=["POST"])
@require_auth
def invoke_llm(app_id):
    if not OPENAI_API_KEY:
        return jsonify({
            "error": "OpenAI API key not configured. Set the OPENAI_API_KEY environment variable."
        }), 503

    import urllib.request
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    response_json_schema = data.get("response_json_schema")
    image_urls = data.get("image_urls", [])

    messages = [{"role": "user", "content": prompt}]

    if image_urls:
        content = [{"type": "text", "text": prompt}]
        for url in image_urls:
            content.append({"type": "image_url", "image_url": {"url": url}})
        messages = [{"role": "user", "content": content}]

    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
    }

    if response_json_schema:
        payload["response_format"] = {"type": "json_object"}
        payload["messages"] = [
            {"role": "system", "content": "You are a helpful assistant. Always respond with valid JSON only."},
            *messages
        ]

    req_body = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=req_body,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        text = result["choices"][0]["message"]["content"]
        if response_json_schema:
            try:
                return jsonify(json.loads(text))
            except Exception:
                cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
                return jsonify(json.loads(cleaned))
        return jsonify({"result": text})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return jsonify({"error": f"OpenAI error: {body}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------------------------------------------------------------------
# Analytics (no-op)
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/analytics/track/batch", methods=["POST"])
def analytics_batch(app_id):
    return jsonify({"success": True})


@app.route("/api/app-logs/<app_id>/log-user-in-app/<page_name>", methods=["POST"])
def log_page_view(app_id, page_name):
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Runtime / invite (stubs)
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/runtime/users/invite-user", methods=["POST"])
@require_auth
def invite_user(app_id):
    return jsonify({"message": "Invite sent"}), 200


@app.route("/api/apps/<app_id>/users/invite-user", methods=["POST"])
@require_auth
def invite_user_alt(app_id):
    return jsonify({"message": "Invite sent"}), 200


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

@app.route("/api/apps/manifests/<app_id>/manifest.json")
def manifest(app_id):
    return jsonify({
        "name": "ALEFIT",
        "short_name": "ALEFIT",
        "description": "An elite fitness management engine for high-performance training.",
        "icons": [],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#000000",
        "background_color": "#ffffff",
        "scope": "/"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
