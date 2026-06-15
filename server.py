import os
import json
import re
import uuid
import urllib.request
import urllib.error
import urllib.parse
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory, send_file, abort, redirect, make_response

app = Flask(__name__, static_folder=".")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
# Service role key — stored in "Database" env var (set during project setup)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("Database", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
APP_ID = "6a1f3d189ebdbe71fa7d256c"

# ---------------------------------------------------------------------------
# Postgres helpers (Replit DB for entity storage)
# ---------------------------------------------------------------------------

def get_db():
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    conn.autocommit = True
    return conn


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Supabase Auth helpers
# ---------------------------------------------------------------------------

def supabase_auth(method, path, body=None, token=None):
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token or SUPABASE_KEY}",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw.decode()}


def supabase_admin(method, path, body=None):
    """Call Supabase admin API using the service role key."""
    key = SUPABASE_SERVICE_KEY or SUPABASE_KEY
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw.decode()}


def get_supabase_user(token):
    if not token:
        return None
    status, data = supabase_auth("GET", "/auth/v1/user", token=token)
    if status == 200 and data.get("id"):
        return data
    return None


def get_current_user():
    auth = request.headers.get("Authorization", "")
    token = None
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    if not token:
        token = request.args.get("token") or request.args.get("access_token")
    if not token:
        token = request.cookies.get("sb_token")
    user = get_supabase_user(token)
    return user, token


def format_user(user):
    meta = user.get("user_metadata") or {}
    return {
        "id": user.get("id", ""),
        "email": user.get("email", ""),
        "full_name": meta.get("full_name") or meta.get("name") or "",
        "role": "user",
        "created_date": user.get("created_at", ""),
    }


def ensure_profile(user_id, email, full_name=""):
    if not user_id:
        return
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO profiles (id, email, full_name)
               VALUES (%s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email
            """,
            (user_id, email, full_name)
        )
        conn.close()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Auth guard — inject into HTML responses for protected paths
# ---------------------------------------------------------------------------

AUTH_GUARD_SCRIPT = """<script>
(function(){
  var token = localStorage.getItem('base44_access_token') || localStorage.getItem('token');
  if (!token) {
    var from = encodeURIComponent(window.location.href);
    window.location.replace('/Login.html?from_url=' + from);
  }
})();
</script>"""

PROTECTED_PATHS = {
    "/calorie-tracker", "/calorie-tracker.html",
    "/meal-plan", "/meal-plan.html",
    "/account", "/Account.html",
}
PROTECTED_PREFIXES = ("/programs/",)


def path_is_protected(path):
    clean = path.rstrip("/").split("?")[0]
    if clean in PROTECTED_PATHS:
        return True
    for prefix in PROTECTED_PREFIXES:
        if clean.startswith(prefix) and len(clean) > len(prefix):
            return True
    return False


def inject_guard(html_content):
    return html_content.replace("<head>", "<head>" + AUTH_GUARD_SCRIPT, 1)


# ---------------------------------------------------------------------------
# Static files with auth guard injection
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_file("index.html")


@app.route("/login")
def login_page():
    return send_file("Login.html")


@app.route("/register")
def register_page():
    return send_file("Register.html")


@app.route("/forgot-password")
def forgot_password_page():
    return send_file("ForgotPassword.html")


@app.route("/reset-password")
def reset_password_page():
    return send_file("ResetPassword.html")


@app.route("/account")
def account_page():
    with open("Account.html", "r", encoding="utf-8") as f:
        content = f.read()
    content = inject_guard(content)
    resp = make_response(content)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    return resp


@app.route("/auth/callback")
def auth_callback_page():
    return send_file("OAuthCallback.html")


@app.route("/images/<path:filename>")
def serve_image(filename):
    return send_from_directory("images", filename)


@app.route("/<path:filename>")
def static_files(filename):
    if filename.startswith("api/"):
        abort(404)

    try:
        filepath = os.path.join(".", filename)

        # If the exact file doesn't exist, try adding .html extension
        if not os.path.isfile(filepath):
            html_path = filepath + ".html"
            if os.path.isfile(html_path):
                filepath = html_path
                filename = filename + ".html"
            else:
                abort(404)

        if filename.endswith(".html") and path_is_protected("/" + filename.rstrip("/")):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            content = inject_guard(content)
            resp = make_response(content)
            resp.headers["Content-Type"] = "text/html; charset=utf-8"
            return resp

        return send_from_directory(".", filename)
    except Exception:
        abort(404)


# ---------------------------------------------------------------------------
# OAuth (Google / Apple) — redirect to Supabase provider
# ---------------------------------------------------------------------------

SUPPORTED_OAUTH_PROVIDERS = {"google", "apple"}

@app.route("/api/oauth/authorize")
def oauth_authorize():
    provider = (request.args.get("provider") or "").lower()
    if provider not in SUPPORTED_OAUTH_PROVIDERS:
        return jsonify({"error": f"Unsupported provider: {provider}"}), 400
    redirect_to = request.args.get("redirect_to") or (request.host_url + "auth/callback")
    url = f"{SUPABASE_URL}/auth/v1/authorize?provider={provider}&redirect_to={urllib.parse.quote(redirect_to, safe='')}"
    return jsonify({"url": url})


# ---------------------------------------------------------------------------
# Logout redirect
# ---------------------------------------------------------------------------

@app.route("/api/apps/auth/logout")
def logout():
    from_url = request.args.get("from_url") or "/"
    resp = redirect("/login")
    resp.delete_cookie("sb_token")
    return resp


# ---------------------------------------------------------------------------
# Public settings
# ---------------------------------------------------------------------------

@app.route("/api/apps/public/prod/public-settings/by-id/<app_id>")
def public_settings(app_id):
    return jsonify({
        "id": app_id,
        "name": "ALEFIT",
        "auth": {
            "enabled": True,
            "providers": ["email", "google"],
            "registration_enabled": True,
        },
        "theme": {"primary_color": "#000000"},
    })


# ---------------------------------------------------------------------------
# Auth endpoints (proxy to Supabase)
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/auth/register", methods=["POST"])
def auth_register(app_id):
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    full_name = body.get("full_name") or body.get("name") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Use admin API to create user with email auto-confirmed (no email verification needed)
    if SUPABASE_SERVICE_KEY:
        status, data = supabase_admin("POST", "/auth/v1/admin/users", {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        if status in (200, 201) and data.get("id"):
            user_id = data["id"]
            ensure_profile(user_id, email, full_name)
            # Now log the user in to get an access token
            login_status, login_data = supabase_auth("POST", "/auth/v1/token?grant_type=password", {
                "email": email,
                "password": password,
            })
            if login_status == 200 and login_data.get("access_token"):
                user = login_data.get("user", {})
                return jsonify({"access_token": login_data["access_token"], "user": format_user(user)}), 201
            return jsonify({"error": "Account created! Please log in."}), 400
        err = data.get("msg") or data.get("message") or data.get("error") or "Registration failed"
        # Handle duplicate email
        if "already" in str(err).lower() or status == 422:
            return jsonify({"error": "An account with this email already exists. Please log in."}), 409
        return jsonify({"error": err}), status

    # Fallback: regular signup (may require email confirmation)
    status, data = supabase_auth("POST", "/auth/v1/signup", {
        "email": email,
        "password": password,
        "data": {"full_name": full_name},
    })

    if status in (200, 201):
        if not data.get("access_token"):
            # Email confirmation required — attempt immediate login
            login_status, login_data = supabase_auth("POST", "/auth/v1/token?grant_type=password", {
                "email": email,
                "password": password,
            })
            if login_status == 200 and login_data.get("access_token"):
                user = login_data.get("user", {})
                ensure_profile(user.get("id"), email, full_name)
                return jsonify({"access_token": login_data["access_token"], "user": format_user(user)}), 201
            return jsonify({"error": "Account created! Check your email to confirm, then log in."}), 400
        user = data.get("user", {})
        ensure_profile(user.get("id"), email, full_name)
        return jsonify({"access_token": data["access_token"], "user": format_user(user)}), 201

    err = data.get("msg") or data.get("message") or data.get("error") or "Registration failed"
    return jsonify({"error": err}), status


@app.route("/api/apps/<app_id>/auth/login", methods=["POST"])
def auth_login(app_id):
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""

    status, data = supabase_auth("POST", "/auth/v1/token?grant_type=password", {
        "email": email,
        "password": password,
    })

    if status == 200 and data.get("access_token"):
        user = data.get("user", {})
        ensure_profile(user.get("id"), email)
        return jsonify({"access_token": data["access_token"], "user": format_user(user)})

    err = data.get("error_description") or data.get("msg") or data.get("error") or "Invalid email or password"
    return jsonify({"error": err}), 401


@app.route("/api/apps/<app_id>/auth/reset-password-request", methods=["POST"])
def auth_reset_request(app_id):
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip()
    supabase_auth("POST", "/auth/v1/recover", {"email": email})
    return jsonify({"message": "If this email exists, a reset link has been sent."})


@app.route("/api/apps/<app_id>/auth/reset-password", methods=["POST"])
def auth_reset_password(app_id):
    body = request.get_json(force=True) or {}
    token = body.get("reset_token") or ""
    new_password = body.get("new_password") or ""
    status, data = supabase_auth("PUT", "/auth/v1/user", {"password": new_password}, token=token)
    if status == 200:
        return jsonify({"message": "Password updated successfully"})
    return jsonify({"error": "Invalid or expired reset token"}), 400


@app.route("/api/apps/<app_id>/auth/change-password", methods=["POST"])
def auth_change_password(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(force=True) or {}
    new_password = body.get("new_password") or ""
    status, _ = supabase_auth("PUT", "/auth/v1/user", {"password": new_password}, token=token)
    if status == 200:
        return jsonify({"message": "Password changed successfully"})
    return jsonify({"error": "Failed to change password"}), 400


@app.route("/api/apps/<app_id>/auth/verify-otp", methods=["POST"])
def auth_verify_otp(app_id):
    return jsonify({"message": "OK"})


@app.route("/api/apps/<app_id>/auth/resend-otp", methods=["POST"])
def auth_resend_otp(app_id):
    return jsonify({"message": "OK"})


@app.route("/api/apps/<app_id>/auth/me", methods=["GET"])
def auth_me(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(format_user(user))


@app.route("/api/apps/<app_id>/auth/me", methods=["PUT"])
def auth_me_update(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(force=True) or {}
    full_name = body.get("full_name") or ""
    if full_name:
        supabase_auth("PUT", "/auth/v1/user", {"data": {"full_name": full_name}}, token=token)
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("UPDATE profiles SET full_name=%s, updated_at=NOW() WHERE id=%s", (full_name, user["id"]))
            conn.close()
        except Exception:
            pass
    status, updated = supabase_auth("GET", "/auth/v1/user", token=token)
    return jsonify(format_user(updated if status == 200 else user))


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/entities/User/me")
def get_me(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(format_user(user))


@app.route("/api/apps/<app_id>/entities/User/me", methods=["PUT"])
def update_me(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(force=True) or {}
    full_name = body.get("full_name") or ""
    if full_name:
        supabase_auth("PUT", "/auth/v1/user", {"data": {"full_name": full_name}}, token=token)
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("UPDATE profiles SET full_name=%s, updated_at=NOW() WHERE id=%s", (full_name, user["id"]))
            conn.close()
        except Exception:
            pass
    status, updated = supabase_auth("GET", "/auth/v1/user", token=token)
    return jsonify(format_user(updated if status == 200 else user))


# ---------------------------------------------------------------------------
# Generic entity CRUD — stored in Replit Postgres
# ---------------------------------------------------------------------------

def require_auth():
    user, token = get_current_user()
    if not user:
        return None, None, (jsonify({"error": "Unauthorized"}), 401)
    return user, token, None


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["GET"])
def list_entities(app_id, entity_type):
    if entity_type == "User":
        user, token = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return jsonify([format_user(user)])

    user, token, err = require_auth()
    if err:
        return err

    limit = int(request.args.get("limit", 1000))
    skip = int(request.args.get("skip", 0))
    filter_q = request.args.get("q")

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT * FROM entities WHERE user_id=%s AND entity_type=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (user["id"], entity_type, limit, skip)
        )
        rows = cur.fetchall()
        conn.close()
    except Exception as e:
        return jsonify([])

    results = []
    for row in rows:
        d = dict(row.get("data") or {})
        d["id"] = row["id"]
        d["created_date"] = row["created_at"].isoformat() if row.get("created_at") else ""
        d["updated_date"] = row["updated_at"].isoformat() if row.get("updated_at") else ""
        results.append(d)

    if filter_q:
        try:
            filters = json.loads(filter_q)
            results = [r for r in results if _matches(r, filters)]
        except Exception:
            pass

    return jsonify(results)


def _matches(data, filters):
    for key, val in filters.items():
        if isinstance(val, dict):
            op = next(iter(val))
            op_val = val[op]
            field = data.get(key)
            if op == "$eq" and field != op_val: return False
            elif op == "$ne" and field == op_val: return False
            elif op == "$gt" and not (field is not None and field > op_val): return False
            elif op == "$gte" and not (field is not None and field >= op_val): return False
            elif op == "$lt" and not (field is not None and field < op_val): return False
            elif op == "$lte" and not (field is not None and field <= op_val): return False
            elif op == "$in" and field not in (op_val or []): return False
        else:
            if data.get(key) != val: return False
    return True


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["POST"])
def create_entity(app_id, entity_type):
    user, token, err = require_auth()
    if err:
        return err

    body = request.get_json(force=True) or {}
    body.pop("id", None)
    body.pop("created_date", None)
    body.pop("updated_date", None)
    body.pop("user_id", None)

    entity_id = str(uuid.uuid4())
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO entities (id, user_id, entity_type, data) VALUES (%s, %s, %s, %s)",
            (entity_id, user["id"], entity_type, json.dumps(body))
        )
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    body["id"] = entity_id
    body["created_date"] = now_iso()
    body["updated_date"] = now_iso()
    return jsonify(body), 201


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["GET"])
def get_entity(app_id, entity_type, entity_id):
    if entity_type == "User" and entity_id == "me":
        return get_me(app_id)

    user, token, err = require_auth()
    if err:
        return err

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT * FROM entities WHERE id=%s AND user_id=%s AND entity_type=%s",
            (entity_id, user["id"], entity_type)
        )
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not row:
        return jsonify({"error": "Not found"}), 404

    d = dict(row.get("data") or {})
    d["id"] = row["id"]
    d["created_date"] = row["created_at"].isoformat() if row.get("created_at") else ""
    d["updated_date"] = row["updated_at"].isoformat() if row.get("updated_at") else ""
    return jsonify(d)


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["PUT"])
def update_entity(app_id, entity_type, entity_id):
    if entity_type == "User":
        return update_me(app_id)

    user, token, err = require_auth()
    if err:
        return err

    body = request.get_json(force=True) or {}
    body.pop("id", None)
    body.pop("created_date", None)
    body.pop("updated_date", None)
    body.pop("user_id", None)

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        # Merge existing data with new data
        cur.execute(
            "SELECT data FROM entities WHERE id=%s AND user_id=%s AND entity_type=%s",
            (entity_id, user["id"], entity_type)
        )
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return jsonify({"error": "Not found"}), 404
        merged = dict(existing["data"] or {})
        merged.update(body)
        cur.execute(
            "UPDATE entities SET data=%s, updated_at=NOW() WHERE id=%s AND user_id=%s RETURNING *",
            (json.dumps(merged), entity_id, user["id"])
        )
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    d = dict(row.get("data") or {})
    d["id"] = row["id"]
    d["created_date"] = row["created_at"].isoformat() if row.get("created_at") else ""
    d["updated_date"] = row["updated_at"].isoformat() if row.get("updated_at") else ""
    return jsonify(d)


@app.route("/api/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["DELETE"])
def delete_entity(app_id, entity_type, entity_id):
    user, token, err = require_auth()
    if err:
        return err
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM entities WHERE id=%s AND user_id=%s AND entity_type=%s",
            (entity_id, user["id"], entity_type)
        )
        affected = cur.rowcount
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    if affected == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"success": True})


@app.route("/api/apps/<app_id>/entities/<entity_type>", methods=["DELETE"])
def delete_many_entities(app_id, entity_type):
    user, token, err = require_auth()
    if err:
        return err
    body = request.get_json(force=True) or {}
    ids = body if isinstance(body, list) else body.get("ids", [])
    try:
        conn = get_db()
        cur = conn.cursor()
        for eid in ids:
            cur.execute(
                "DELETE FROM entities WHERE id=%s AND user_id=%s AND entity_type=%s",
                (eid, user["id"], entity_type)
            )
        conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# AI / LLM
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/integration-endpoints/Core/InvokeLLM", methods=["POST"])
def invoke_llm(app_id):
    user, token, err = require_auth()
    if err:
        return err

    if not OPENAI_API_KEY:
        return jsonify({"error": "OpenAI API key not configured. Add OPENAI_API_KEY to secrets."}), 503

    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    response_json_schema = data.get("response_json_schema")

    messages = [{"role": "user", "content": prompt}]
    payload = {"model": "gpt-4o-mini", "messages": messages}
    if response_json_schema:
        payload["response_format"] = {"type": "json_object"}
        payload["messages"] = [
            {"role": "system", "content": "Respond with valid JSON only."},
            *messages
        ]

    req_body = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=req_body,
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
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
        return jsonify({"error": f"OpenAI error: {e.read().decode()}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------------------------------------------------------------------
# No-op stubs
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/analytics/track/batch", methods=["POST"])
def analytics_batch(app_id):
    return jsonify({"success": True})


@app.route("/api/app-logs/<app_id>/log-user-in-app/<page_name>", methods=["POST"])
def log_page_view(app_id, page_name):
    return jsonify({"success": True})


@app.route("/api/apps/<app_id>/runtime/users/invite-user", methods=["POST"])
@app.route("/api/apps/<app_id>/users/invite-user", methods=["POST"])
def invite_user(app_id):
    return jsonify({"message": "Invite sent"})


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
