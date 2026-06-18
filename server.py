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

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
DATABASE_URL = os.environ["DATABASE_URL"]
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
    except Exception as e:
        return 503, {"error": f"Auth service unavailable: {str(e)}"}


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
    except Exception as e:
        return 503, {"error": f"Auth service unavailable: {str(e)}"}


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
# Global error handlers — always return JSON so the browser never sees HTML
# ---------------------------------------------------------------------------

@app.errorhandler(500)
def handle_500(e):
    return jsonify({"error": "Internal server error. Please try again."}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    traceback.print_exc()
    return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


# ---------------------------------------------------------------------------
# Static files with auth guard injection
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    resp = make_response(send_file("index.html"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory("uploads", filename)


@app.route("/login")
def login_page():
    resp = make_response(send_file("Login.html"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@app.route("/register")
def register_page():
    resp = make_response(send_file("Register.html"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


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

    filepath = os.path.join(".", filename)

    # If the exact file doesn't exist, try adding .html extension
    if not os.path.isfile(filepath):
        html_path = filepath + ".html"
        if os.path.isfile(html_path):
            filepath = html_path
            filename = filename + ".html"
        else:
            abort(404)

    try:
        if filename.endswith(".html"):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if path_is_protected("/" + filename.rstrip("/")):
                content = inject_guard(content)
            resp = make_response(content)
            resp.headers["Content-Type"] = "text/html; charset=utf-8"
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
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
    import http.client
    provider = (request.args.get("provider") or "").lower()
    if provider not in SUPPORTED_OAUTH_PROVIDERS:
        return jsonify({"error": f"Unsupported provider: {provider}"}), 400
    redirect_to = request.args.get("redirect_to") or (request.host_url + "auth/callback")
    url = f"{SUPABASE_URL}/auth/v1/authorize?provider={provider}&redirect_to={urllib.parse.quote(redirect_to, safe='')}"
    # Pre-check whether the provider is actually enabled in Supabase
    try:
        parsed = urllib.parse.urlparse(url)
        conn = http.client.HTTPSConnection(parsed.netloc, timeout=5)
        conn.request("GET", parsed.path + "?" + parsed.query)
        resp = conn.getresponse()
        conn.close()
        if resp.status >= 400:
            return jsonify({"error": f"{provider.capitalize()} sign-in is not yet enabled. Please use email sign-in."}), 400
    except Exception:
        pass  # Network issue — return URL anyway and let browser handle it
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
        "app_base_url": "",          # tells SPA to redirect to /Login.html etc. on THIS server
        "auth": {
            "enabled": True,
            "providers": ["email", "google"],
            "registration_enabled": True,
        },
        "theme": {"primary_color": "#000000"},
    })


# ---------------------------------------------------------------------------
# Short-path aliases — SPA calls /apps/<id>/... without /api/ prefix
# ---------------------------------------------------------------------------

@app.route("/apps/<app_id>/auth/register", methods=["POST"])
def alias_auth_register(app_id):
    return auth_register(app_id)

@app.route("/apps/<app_id>/auth/login", methods=["POST"])
def alias_auth_login(app_id):
    return auth_login(app_id)

@app.route("/apps/<app_id>/auth/me", methods=["GET"])
def alias_auth_me_get(app_id):
    return auth_me(app_id)

@app.route("/apps/<app_id>/auth/me", methods=["PUT"])
def alias_auth_me_put(app_id):
    return auth_me_update(app_id)

@app.route("/apps/<app_id>/auth/reset-password-request", methods=["POST"])
def alias_auth_reset_request(app_id):
    return auth_reset_request(app_id)

@app.route("/apps/<app_id>/auth/reset-password", methods=["POST"])
def alias_auth_reset_password(app_id):
    return auth_reset_password(app_id)

@app.route("/apps/<app_id>/auth/change-password", methods=["POST"])
def alias_auth_change_password(app_id):
    return auth_change_password(app_id)

@app.route("/apps/<app_id>/auth/verify-otp", methods=["POST"])
def alias_auth_verify_otp(app_id):
    return auth_verify_otp(app_id)

@app.route("/apps/<app_id>/auth/resend-otp", methods=["POST"])
def alias_auth_resend_otp(app_id):
    return auth_resend_otp(app_id)

@app.route("/apps/<app_id>/entities/User/me", methods=["GET"])
def alias_get_me(app_id):
    return get_me(app_id)

@app.route("/apps/<app_id>/entities/User/me", methods=["PUT"])
def alias_update_me(app_id):
    return update_me(app_id)

@app.route("/apps/<app_id>/entities/<entity_type>", methods=["GET"])
def alias_list_entities(app_id, entity_type):
    return list_entities(app_id, entity_type)

@app.route("/apps/<app_id>/entities/<entity_type>", methods=["POST"])
def alias_create_entity(app_id, entity_type):
    return create_entity(app_id, entity_type)

@app.route("/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["GET"])
def alias_get_entity(app_id, entity_type, entity_id):
    return get_entity(app_id, entity_type, entity_id)

@app.route("/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["PUT"])
def alias_update_entity(app_id, entity_type, entity_id):
    return update_entity(app_id, entity_type, entity_id)

@app.route("/apps/<app_id>/entities/<entity_type>/<entity_id>", methods=["DELETE"])
def alias_delete_entity(app_id, entity_type, entity_id):
    return delete_entity(app_id, entity_type, entity_id)

@app.route("/apps/<app_id>/runtime/users/invite-user", methods=["POST"])
def alias_invite_user(app_id):
    return invite_user(app_id)

@app.route("/apps/<app_id>/integration-endpoints/Core/InvokeLLM", methods=["POST"])
def alias_invoke_llm(app_id):
    return invoke_llm(app_id)


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
    # Build redirect URL from the incoming request so it works on any domain
    origin = request.headers.get("Origin") or request.host_url.rstrip("/")
    redirect_to = f"{origin}/ResetPassword.html"
    supabase_auth("POST", "/auth/v1/recover", {"email": email, "redirectTo": redirect_to})
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


def get_profile_extras(user_id):
    """Return bio, avatar_url, daily_calorie_goal from the profiles table."""
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT bio, avatar_url, daily_calorie_goal FROM profiles WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return {"bio": row["bio"] or "", "avatar_url": row["avatar_url"] or "", "daily_calorie_goal": row["daily_calorie_goal"] or 2000}
    except Exception:
        pass
    return {"bio": "", "avatar_url": "", "daily_calorie_goal": 2000}


@app.route("/api/apps/<app_id>/auth/me", methods=["GET"])
def auth_me(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    result = format_user(user)
    result.update(get_profile_extras(user["id"]))
    return jsonify(result)


@app.route("/api/apps/<app_id>/auth/me", methods=["PUT"])
def auth_me_update(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(force=True) or {}
    full_name = body.get("full_name")
    bio = body.get("bio")
    daily_calorie_goal = body.get("daily_calorie_goal")

    if full_name is not None:
        supabase_auth("PUT", "/auth/v1/user", {"data": {"full_name": full_name}}, token=token)

    try:
        conn = get_db()
        cur = conn.cursor()
        updates, vals = ["updated_at=NOW()"], []
        if full_name is not None:
            updates.append("full_name=%s"); vals.append(full_name)
        if bio is not None:
            updates.append("bio=%s"); vals.append(bio)
        if daily_calorie_goal is not None:
            updates.append("daily_calorie_goal=%s"); vals.append(int(daily_calorie_goal))
        vals.append(user["id"])
        cur.execute(f"UPDATE profiles SET {', '.join(updates)} WHERE id=%s", vals)
        conn.close()
    except Exception:
        pass

    status, updated = supabase_auth("GET", "/auth/v1/user", token=token)
    result = format_user(updated if status == 200 else user)
    result.update(get_profile_extras(user["id"]))
    return jsonify(result)


@app.route("/api/apps/<app_id>/auth/avatar", methods=["POST"])
def auth_avatar(app_id):
    from werkzeug.utils import secure_filename
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f or f.filename == "":
        return jsonify({"error": "No file selected"}), 400
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        return jsonify({"error": "Unsupported file type"}), 400
    os.makedirs(os.path.join("uploads", "avatars"), exist_ok=True)
    filename = f"{user['id']}.{ext}"
    f.save(os.path.join("uploads", "avatars", filename))
    avatar_url = f"/uploads/avatars/{filename}"
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("UPDATE profiles SET avatar_url=%s, updated_at=NOW() WHERE id=%s", (avatar_url, user["id"]))
        conn.close()
    except Exception:
        pass
    return jsonify({"avatar_url": avatar_url})


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

import random as _random

def _parse_meal_prefs(prompt):
    p = prompt.lower()
    # goal
    if "muscle" in p or "bulk" in p or "gain" in p:
        goal = "muscle_gain"
    elif "fat loss" in p or "weight loss" in p or "lose" in p or "cut" in p:
        goal = "fat_loss"
    else:
        goal = "maintenance"
    # diet
    if "vegan" in p:
        diet = "vegan"
    elif "vegetarian" in p:
        diet = "vegetarian"
    elif "keto" in p:
        diet = "keto"
    elif "paleo" in p:
        diet = "paleo"
    elif "high protein" in p or "high-protein" in p:
        diet = "high_protein"
    elif "mediterranean" in p:
        diet = "mediterranean"
    else:
        diet = "standard"
    # meals per day
    meals_per_day = 3
    for n in ["5", "4", "3"]:
        if f"{n} meal" in p or f"{n}meal" in p or f"meals per day: {n}" in p:
            meals_per_day = int(n)
            break
    # allergies
    allergies = []
    if "nut" in p and ("allerg" in p or "avoid" in p or "restriction" in p or "free" in p):
        allergies.append("nuts")
    if "gluten" in p:
        allergies.append("gluten")
    if "dairy" in p and ("allerg" in p or "avoid" in p or "free" in p or "intol" in p):
        allergies.append("dairy")
    if "egg" in p and ("allerg" in p or "avoid" in p):
        allergies.append("eggs")
    return goal, diet, meals_per_day, allergies


def _generate_meal_plan(goal, diet, meals_per_day, allergies):
    """Generate a realistic 7-day meal plan based on user preferences."""

    # Calorie targets by goal
    cal_targets = {"muscle_gain": 2800, "fat_loss": 1700, "maintenance": 2100}
    daily_cal = cal_targets.get(goal, 2100)

    # Macro splits by goal (protein%, carb%, fat%)
    macro_splits = {
        "muscle_gain": (0.30, 0.45, 0.25),
        "fat_loss":    (0.35, 0.35, 0.30),
        "maintenance": (0.25, 0.45, 0.30),
    }
    prot_pct, carb_pct, fat_pct = macro_splits.get(goal, (0.25, 0.45, 0.30))

    def macros(cal):
        return {
            "protein": f"{round(cal * prot_pct / 4)}g",
            "carbs":   f"{round(cal * carb_pct / 4)}g",
            "fat":     f"{round(cal * fat_pct / 9)}g",
        }

    # ── Meal databases ────────────────────────────────────────────────────────

    BREAKFASTS = {
        "standard": [
            {"name": "Scrambled Eggs with Whole-Wheat Toast",
             "ingredients": ["3 large eggs", "2 slices whole-wheat bread", "1 tsp olive oil", "salt & pepper", "1 cup orange juice"],
             "steps": ["Whisk eggs with salt and pepper.", "Heat olive oil in a pan over medium heat.", "Pour in eggs and scramble until just set.", "Toast bread and serve alongside."]},
            {"name": "Greek Yogurt Parfait with Granola",
             "ingredients": ["200g Greek yogurt (plain)", "60g granola", "100g mixed berries", "1 tbsp honey"],
             "steps": ["Spoon yogurt into a bowl.", "Layer granola and berries on top.", "Drizzle honey and serve immediately."]},
            {"name": "Banana Protein Pancakes",
             "ingredients": ["2 ripe bananas", "3 eggs", "1 scoop whey protein", "1/2 tsp baking powder", "1 tbsp maple syrup"],
             "steps": ["Mash bananas and mix with eggs, protein powder, and baking powder.", "Cook small pancakes in a non-stick pan over medium heat.", "Flip after bubbles form and cook until golden.", "Serve with maple syrup."]},
            {"name": "Avocado Toast with Poached Egg",
             "ingredients": ["2 slices sourdough bread", "1 ripe avocado", "2 eggs", "chilli flakes", "lemon juice", "salt"],
             "steps": ["Toast bread until golden.", "Mash avocado with lemon juice and salt.", "Poach eggs for 3 minutes in simmering water.", "Top toast with avocado and egg; sprinkle chilli flakes."]},
            {"name": "Overnight Oats with Chia Seeds",
             "ingredients": ["80g rolled oats", "250ml milk", "2 tbsp chia seeds", "1 tbsp honey", "100g sliced strawberries"],
             "steps": ["Combine oats, milk, chia seeds, and honey in a jar.", "Stir well, cover, and refrigerate overnight.", "Top with sliced strawberries before serving."]},
            {"name": "Smoked Salmon Bagel",
             "ingredients": ["1 whole-grain bagel", "100g smoked salmon", "2 tbsp cream cheese", "capers", "red onion slices", "fresh dill"],
             "steps": ["Slice and toast the bagel.", "Spread cream cheese on both halves.", "Layer smoked salmon, capers, and red onion.", "Garnish with fresh dill."]},
            {"name": "Veggie Omelette",
             "ingredients": ["3 eggs", "1/2 bell pepper (diced)", "30g spinach", "30g cheddar cheese", "1 tsp butter", "salt & pepper"],
             "steps": ["Beat eggs with salt and pepper.", "Melt butter in a pan; sauté pepper and spinach for 2 min.", "Pour in eggs; cook until edges set.", "Add cheese, fold omelette in half, and serve."]},
        ],
        "high_protein": [
            {"name": "Cottage Cheese & Berry Bowl",
             "ingredients": ["250g low-fat cottage cheese", "100g blueberries", "1 tbsp flaxseed", "1 tsp honey"],
             "steps": ["Spoon cottage cheese into a bowl.", "Add berries and flaxseed.", "Drizzle honey and mix gently."]},
            {"name": "Turkey & Egg White Scramble",
             "ingredients": ["150g turkey breast mince", "4 egg whites", "1 whole egg", "30g spinach", "1/2 tsp garlic powder", "salt & pepper"],
             "steps": ["Brown turkey mince in a pan over high heat.", "Add garlic powder, salt, and pepper.", "Add spinach and wilt.", "Pour in egg whites and whole egg; scramble until cooked."]},
            {"name": "Protein Oatmeal with Almonds",
             "ingredients": ["80g rolled oats", "1 scoop vanilla protein powder", "250ml water", "30g sliced almonds", "1 banana"],
             "steps": ["Cook oats with water according to packet instructions.", "Stir in protein powder off the heat.", "Top with sliced almonds and banana."]},
            {"name": "Chicken & Veggie Breakfast Bowl",
             "ingredients": ["150g cooked chicken breast (sliced)", "2 eggs", "100g sweet potato (diced, roasted)", "30g kale", "1 tbsp olive oil"],
             "steps": ["Roast sweet potato at 200°C for 20 min.", "Fry eggs to your liking.", "Sauté kale in olive oil for 2 min.", "Assemble in a bowl with chicken slices."]},
            {"name": "High-Protein French Toast",
             "ingredients": ["2 slices thick bread", "3 eggs", "1 scoop vanilla protein powder", "100ml milk", "cinnamon"],
             "steps": ["Whisk eggs, protein powder, milk, and cinnamon.", "Dip bread slices into mixture.", "Cook in a non-stick pan over medium heat, 2 min per side.", "Serve with fresh berries."]},
            {"name": "Smoked Salmon Scramble",
             "ingredients": ["3 eggs", "80g smoked salmon", "2 tbsp cream cheese", "chives", "black pepper"],
             "steps": ["Scramble eggs over low heat until soft-set.", "Fold in smoked salmon and cream cheese off the heat.", "Garnish with chives and black pepper."]},
            {"name": "Tuna & Avocado Breakfast Toast",
             "ingredients": ["2 slices rye bread", "1 can tuna (in water)", "1/2 avocado", "lemon juice", "salt & pepper"],
             "steps": ["Toast rye bread.", "Mash avocado with lemon juice, salt, and pepper.", "Drain and flake tuna.", "Spread avocado on toast and top with tuna."]},
        ],
        "vegetarian": [
            {"name": "Spinach & Feta Frittata",
             "ingredients": ["4 eggs", "80g baby spinach", "50g feta cheese", "1/2 red onion (sliced)", "1 tbsp olive oil", "salt & pepper"],
             "steps": ["Preheat oven to 180°C.", "Sauté onion in olive oil for 3 min.", "Add spinach and wilt.", "Pour in beaten eggs; crumble feta on top.", "Bake for 12–15 min until set."]},
            {"name": "Chia Pudding with Mango",
             "ingredients": ["60g chia seeds", "300ml coconut milk", "1 mango (diced)", "1 tbsp honey", "mint leaves"],
             "steps": ["Mix chia seeds with coconut milk and honey.", "Refrigerate for at least 4 hours or overnight.", "Top with diced mango and mint leaves."]},
            {"name": "Peanut Butter Banana Smoothie Bowl",
             "ingredients": ["2 frozen bananas", "2 tbsp peanut butter", "200ml almond milk", "toppings: granola, sliced banana, chia seeds"],
             "steps": ["Blend frozen bananas with peanut butter and almond milk until thick.", "Pour into a bowl.", "Top with granola, banana slices, and chia seeds."]},
            {"name": "Mushroom & Cheese Omelette",
             "ingredients": ["3 eggs", "100g mushrooms (sliced)", "40g Gruyère cheese", "1 tbsp butter", "fresh thyme", "salt & pepper"],
             "steps": ["Sauté mushrooms with butter and thyme for 4 min.", "Beat eggs with salt and pepper; pour into pan.", "When edges set, add mushrooms and cheese.", "Fold and serve immediately."]},
            {"name": "Açaí Smoothie Bowl",
             "ingredients": ["100g frozen açaí", "1 banana", "100ml oat milk", "toppings: sliced kiwi, coconut flakes, hemp seeds"],
             "steps": ["Blend açaí, banana, and oat milk until thick.", "Pour into bowl.", "Arrange toppings and serve immediately."]},
            {"name": "Ricotta Pancakes with Peaches",
             "ingredients": ["150g ricotta", "2 eggs", "50g flour", "1 tbsp honey", "2 peaches (sliced)"],
             "steps": ["Mix ricotta, eggs, flour, and honey until combined.", "Cook small pancakes in a non-stick pan.", "Serve with fresh or grilled peach slices."]},
            {"name": "Tofu Scramble",
             "ingredients": ["200g firm tofu", "1/4 tsp turmeric", "1/4 tsp cumin", "30g spinach", "1/2 bell pepper", "1 tbsp olive oil", "salt & pepper"],
             "steps": ["Press tofu dry; crumble into a pan with olive oil.", "Add turmeric, cumin, salt, and pepper.", "Add pepper and spinach; cook until veggies are soft.", "Serve with whole-grain toast."]},
        ],
        "vegan": [
            {"name": "Tofu Scramble with Vegetables",
             "ingredients": ["200g firm tofu", "1/4 tsp turmeric", "30g spinach", "1/2 bell pepper (diced)", "1 tbsp olive oil", "nutritional yeast", "salt & pepper"],
             "steps": ["Crumble tofu into a hot pan with olive oil.", "Add turmeric, nutritional yeast, and salt.", "Add pepper and spinach; stir-fry 3 min.", "Serve with wholegrain toast."]},
            {"name": "Oat & Banana Porridge",
             "ingredients": ["80g rolled oats", "300ml oat milk", "1 banana (sliced)", "1 tbsp almond butter", "1 tsp cinnamon"],
             "steps": ["Cook oats with oat milk over medium heat.", "Stir in cinnamon.", "Top with banana and almond butter."]},
            {"name": "Avocado Toast with Hemp Seeds",
             "ingredients": ["2 slices sourdough", "1 avocado", "2 tbsp hemp seeds", "lemon juice", "chilli flakes", "salt"],
             "steps": ["Toast bread.", "Mash avocado with lemon juice and salt.", "Spread on toast; sprinkle hemp seeds and chilli flakes."]},
            {"name": "Berry Chia Pudding",
             "ingredients": ["60g chia seeds", "350ml oat milk", "150g mixed berries", "1 tbsp maple syrup"],
             "steps": ["Stir chia seeds into oat milk with maple syrup.", "Refrigerate overnight.", "Top with mixed berries and serve."]},
            {"name": "Green Smoothie Bowl",
             "ingredients": ["2 frozen bananas", "80g spinach", "200ml coconut water", "toppings: granola, kiwi, flaxseed"],
             "steps": ["Blend bananas, spinach, and coconut water until smooth and thick.", "Pour into bowl.", "Add toppings and serve immediately."]},
            {"name": "Peanut Butter & Banana Overnight Oats",
             "ingredients": ["80g oats", "250ml almond milk", "2 tbsp peanut butter", "1 banana", "1 tsp maple syrup"],
             "steps": ["Mix oats with almond milk and peanut butter.", "Refrigerate overnight.", "Top with sliced banana and maple syrup before serving."]},
            {"name": "Tempeh Breakfast Hash",
             "ingredients": ["150g tempeh (cubed)", "1 sweet potato (diced)", "1/2 onion", "1 bell pepper", "1 tbsp tamari", "1 tbsp olive oil"],
             "steps": ["Roast sweet potato at 200°C for 15 min.", "Fry tempeh in olive oil until golden; splash with tamari.", "Add onion and pepper; cook 4 min.", "Combine with sweet potato and serve."]},
        ],
        "keto": [
            {"name": "Bacon, Egg & Cheese Skillet",
             "ingredients": ["3 rashers bacon", "3 eggs", "40g cheddar cheese", "30g spinach", "salt & pepper"],
             "steps": ["Fry bacon until crispy; set aside.", "Crack eggs into the same pan.", "Top with cheese, add spinach alongside.", "Cook until eggs are done; serve with bacon."]},
            {"name": "Avocado & Smoked Salmon Plate",
             "ingredients": ["1 avocado", "100g smoked salmon", "2 tbsp cream cheese", "capers", "lemon slices"],
             "steps": ["Halve avocado and remove stone.", "Fill each half with cream cheese and capers.", "Arrange smoked salmon on the plate and garnish with lemon."]},
            {"name": "Bulletproof Coffee with Egg Muffins",
             "ingredients": ["2 cups black coffee", "1 tbsp butter", "1 tbsp MCT oil", "4 eggs", "50g bacon bits", "30g cheddar"],
             "steps": ["Blend coffee, butter, and MCT oil until frothy.", "Whisk eggs with bacon bits and cheese.", "Pour into greased muffin cups; bake at 180°C for 15 min.", "Serve alongside coffee."]},
            {"name": "Keto Pancakes with Berries",
             "ingredients": ["2 eggs", "60g almond flour", "60g cream cheese", "1/2 tsp vanilla extract", "50g strawberries"],
             "steps": ["Blend all ingredients except berries until smooth.", "Cook small pancakes on a buttered pan over low heat.", "Serve with fresh strawberries."]},
            {"name": "Full Keto Breakfast Plate",
             "ingredients": ["3 eggs", "3 rashers bacon", "1 avocado", "50g mushrooms", "1 tbsp butter", "salt & pepper"],
             "steps": ["Fry bacon until crispy.", "Scramble eggs in butter.", "Sauté mushrooms in remaining butter.", "Serve with sliced avocado and season well."]},
            {"name": "Almond Flour Waffles",
             "ingredients": ["100g almond flour", "3 eggs", "1 tbsp cream", "1/2 tsp baking powder", "pinch of salt", "sugar-free syrup"],
             "steps": ["Mix all ingredients until a smooth batter forms.", "Pour into a preheated waffle iron.", "Cook for 3–4 min until golden.", "Serve with sugar-free syrup."]},
            {"name": "Smoked Mackerel Omelette",
             "ingredients": ["3 eggs", "100g smoked mackerel (flaked)", "30g cream cheese", "chives", "black pepper"],
             "steps": ["Beat eggs with black pepper.", "Cook in a buttered pan until edges set.", "Add mackerel and cream cheese; fold.", "Garnish with chives."]},
        ],
        "paleo": [
            {"name": "Sweet Potato & Egg Breakfast Bowl",
             "ingredients": ["150g sweet potato (cubed, roasted)", "2 eggs", "30g spinach", "1/4 avocado", "1 tbsp coconut oil"],
             "steps": ["Roast sweet potato with coconut oil at 200°C for 20 min.", "Poach or fry eggs.", "Sauté spinach in coconut oil.", "Assemble bowl with avocado slices on top."]},
            {"name": "Banana Almond Pancakes",
             "ingredients": ["2 bananas", "2 eggs", "30g almond flour", "1/2 tsp cinnamon", "coconut oil for frying"],
             "steps": ["Mash bananas and mix with eggs, almond flour, and cinnamon.", "Cook small pancakes in coconut oil over medium heat.", "Flip when edges dry out.", "Serve with fresh fruit."]},
            {"name": "Smoked Salmon & Avocado Lettuce Cups",
             "ingredients": ["100g smoked salmon", "1 avocado", "4 butter lettuce leaves", "lemon juice", "dill"],
             "steps": ["Slice avocado and toss with lemon juice.", "Fill each lettuce cup with avocado and smoked salmon.", "Garnish with fresh dill and serve."]},
            {"name": "Paleo Shakshuka",
             "ingredients": ["4 eggs", "400g canned tomatoes", "1/2 onion", "1 bell pepper", "1 tsp cumin", "1 tsp paprika", "1 tbsp olive oil"],
             "steps": ["Sauté onion and pepper in olive oil for 4 min.", "Add tomatoes, cumin, and paprika; simmer 8 min.", "Make wells and crack in eggs.", "Cover and cook until eggs are set."]},
            {"name": "Turkey Sausage & Veggie Hash",
             "ingredients": ["200g turkey sausage (sliced)", "1 courgette (diced)", "1/2 red onion", "1 bell pepper", "1 tbsp coconut oil", "salt & pepper"],
             "steps": ["Fry sausage in coconut oil until browned.", "Add vegetables and cook 5 min until tender.", "Season and serve."]},
            {"name": "Nut & Seed Porridge",
             "ingredients": ["3 tbsp almond flour", "2 tbsp flaxseed", "1 tbsp chia seeds", "250ml coconut milk", "1 tsp honey", "berries to serve"],
             "steps": ["Heat coconut milk in a pan.", "Stir in almond flour, flaxseed, and chia seeds.", "Cook 3–4 min until thick.", "Sweeten with honey; top with berries."]},
            {"name": "Coconut Flour Waffles",
             "ingredients": ["3 eggs", "40g coconut flour", "1 tbsp coconut oil", "100ml coconut milk", "pinch of salt"],
             "steps": ["Mix all ingredients until smooth.", "Spoon into a hot waffle iron.", "Cook 4–5 min until golden.", "Serve with fresh berries."]},
        ],
        "mediterranean": [
            {"name": "Shakshuka with Feta",
             "ingredients": ["4 eggs", "400g crushed tomatoes", "1 red pepper", "1/2 onion", "50g feta", "cumin", "paprika", "olive oil"],
             "steps": ["Sauté onion and pepper in olive oil.", "Add tomatoes and spices; simmer 10 min.", "Create wells and crack in eggs.", "Cover and cook 5 min; crumble feta on top."]},
            {"name": "Greek Yogurt with Honey & Walnuts",
             "ingredients": ["250g Greek yogurt", "2 tbsp walnuts (chopped)", "1 tbsp honey", "cinnamon"],
             "steps": ["Spoon yogurt into a bowl.", "Top with walnuts.", "Drizzle honey and dust with cinnamon."]},
            {"name": "Olive Oil Fried Eggs with Za'atar Toast",
             "ingredients": ["2 eggs", "2 tbsp olive oil", "2 slices sourdough", "1 tbsp za'atar", "flaky sea salt"],
             "steps": ["Heat olive oil in a pan until shimmering.", "Fry eggs until crispy-edged.", "Toast bread and brush with olive oil; sprinkle za'atar.", "Serve eggs on toast with sea salt."]},
            {"name": "Mediterranean Omelette",
             "ingredients": ["3 eggs", "30g kalamata olives", "30g sun-dried tomatoes", "40g feta", "10g fresh basil", "1 tbsp olive oil"],
             "steps": ["Beat eggs and season.", "Cook in olive oil over medium heat.", "Add olives, tomatoes, and feta when almost set.", "Fold and finish with basil."]},
            {"name": "Labneh Toast with Cherry Tomatoes",
             "ingredients": ["2 slices sourdough", "80g labneh", "100g cherry tomatoes (halved)", "olive oil", "za'atar", "mint"],
             "steps": ["Toast bread.", "Spread labneh generously.", "Top with tomatoes; drizzle oil, sprinkle za'atar.", "Garnish with mint."]},
            {"name": "Almond Butter Overnight Oats",
             "ingredients": ["80g oats", "250ml almond milk", "2 tbsp almond butter", "1 tsp honey", "sliced almonds to top"],
             "steps": ["Stir oats with almond milk, almond butter, and honey.", "Refrigerate overnight.", "Top with sliced almonds before serving."]},
            {"name": "Smoked Salmon & Cucumber Plate",
             "ingredients": ["100g smoked salmon", "1/2 cucumber (sliced)", "50g hummus", "2 rye crispbreads", "lemon, dill"],
             "steps": ["Arrange cucumber, salmon, and crispbreads on a plate.", "Serve hummus alongside.", "Squeeze lemon and garnish with dill."]},
        ],
    }

    LUNCHES = {
        "standard": [
            {"name": "Grilled Chicken Caesar Salad",
             "ingredients": ["150g grilled chicken breast", "80g romaine lettuce", "30g parmesan", "croutons", "3 tbsp Caesar dressing"],
             "steps": ["Slice grilled chicken.", "Toss lettuce with dressing.", "Top with chicken, parmesan, and croutons."]},
            {"name": "Turkey & Avocado Wrap",
             "ingredients": ["1 large tortilla", "120g turkey breast slices", "1/2 avocado", "30g lettuce", "1 tomato (sliced)", "mustard"],
             "steps": ["Lay tortilla flat.", "Spread mustard down the centre.", "Layer turkey, avocado, lettuce, and tomato.", "Roll tightly and slice in half."]},
            {"name": "Tuna Nicoise Salad",
             "ingredients": ["150g tuna (canned)", "2 boiled eggs", "100g green beans", "8 kalamata olives", "100g cherry tomatoes", "3 tbsp vinaigrette"],
             "steps": ["Blanch green beans for 3 min; refresh in cold water.", "Arrange all ingredients on a platter.", "Drizzle with vinaigrette and serve."]},
            {"name": "Beef & Veggie Stir-Fry with Rice",
             "ingredients": ["150g lean beef strips", "100g basmati rice (cooked)", "1 bell pepper", "80g broccoli", "2 tbsp soy sauce", "1 tsp sesame oil"],
             "steps": ["Cook rice per packet instructions.", "Stir-fry beef over high heat for 3 min.", "Add vegetables and soy sauce; stir-fry 4 min.", "Finish with sesame oil; serve over rice."]},
            {"name": "BLT Sandwich on Sourdough",
             "ingredients": ["2 slices sourdough", "3 rashers bacon", "2 large lettuce leaves", "2 tomato slices", "1 tbsp mayo"],
             "steps": ["Grill bacon until crispy.", "Toast bread.", "Spread mayo on both slices.", "Layer bacon, lettuce, and tomato."]},
            {"name": "Tomato Basil Soup with Crusty Bread",
             "ingredients": ["400g canned tomatoes", "1 onion", "2 garlic cloves", "fresh basil", "150ml cream", "1 crusty roll"],
             "steps": ["Sauté onion and garlic in olive oil.", "Add tomatoes; simmer 15 min.", "Blend until smooth; stir in cream.", "Season; serve with torn basil and crusty bread."]},
            {"name": "Salmon & Quinoa Power Bowl",
             "ingredients": ["150g baked salmon", "100g quinoa (cooked)", "50g edamame", "1/4 avocado", "2 tbsp teriyaki sauce"],
             "steps": ["Cook quinoa per packet instructions.", "Bake salmon at 200°C for 15 min.", "Assemble bowl with quinoa, salmon, edamame, and avocado.", "Drizzle teriyaki sauce."]},
        ],
        "high_protein": [
            {"name": "Grilled Chicken & Brown Rice Bowl",
             "ingredients": ["200g grilled chicken breast", "100g brown rice (cooked)", "100g broccoli (steamed)", "1 tbsp olive oil", "garlic powder", "salt"],
             "steps": ["Season chicken with garlic powder and salt.", "Grill 6 min per side.", "Assemble bowl with rice, broccoli, and sliced chicken.", "Drizzle olive oil."]},
            {"name": "Tuna & Cottage Cheese Wraps",
             "ingredients": ["1 large wrap", "150g canned tuna", "100g cottage cheese", "30g spinach", "1 tomato (diced)", "black pepper"],
             "steps": ["Mix tuna with cottage cheese and black pepper.", "Lay wrap flat; add spinach and tomato.", "Top with tuna mixture and roll up."]},
            {"name": "Beef & Lentil Soup",
             "ingredients": ["150g lean beef mince", "200g red lentils", "400ml beef stock", "1 carrot", "1 celery stalk", "cumin", "salt"],
             "steps": ["Brown beef mince in a pot.", "Add vegetables and cook 3 min.", "Add lentils, stock, and cumin.", "Simmer 25 min until lentils are soft."]},
            {"name": "Turkey Meatball Sub",
             "ingredients": ["200g turkey mince", "1 sub roll", "100ml marinara sauce", "30g mozzarella", "basil", "1 garlic clove", "breadcrumbs"],
             "steps": ["Mix turkey mince with garlic, salt, and breadcrumbs; form balls.", "Bake at 200°C for 15 min.", "Heat marinara sauce; add meatballs.", "Fill sub roll; top with mozzarella and basil."]},
            {"name": "Prawn & Edamame Noodle Bowl",
             "ingredients": ["200g cooked prawns", "100g buckwheat noodles", "80g edamame", "2 tbsp soy sauce", "1 tbsp sesame oil", "ginger", "spring onions"],
             "steps": ["Cook noodles per packet instructions.", "Toss prawns, noodles, edamame with soy sauce, sesame oil, and ginger.", "Garnish with spring onions."]},
            {"name": "Chicken & Quinoa Stuffed Peppers",
             "ingredients": ["2 bell peppers", "150g chicken breast (diced)", "100g quinoa (cooked)", "50g black beans", "30g cheddar", "paprika"],
             "steps": ["Preheat oven to 190°C.", "Sauté chicken with paprika.", "Mix with quinoa and beans.", "Fill peppers; top with cheese.", "Bake 25 min."]},
            {"name": "Egg White & Chicken Fried Rice",
             "ingredients": ["100g brown rice (cooked)", "150g chicken breast (diced)", "4 egg whites", "100g frozen peas", "2 tbsp soy sauce", "1 tsp sesame oil"],
             "steps": ["Stir-fry chicken until cooked.", "Add rice and peas; fry 2 min.", "Push to the side; scramble egg whites.", "Combine; add soy sauce and sesame oil."]},
        ],
        "vegetarian": [
            {"name": "Lentil & Vegetable Soup",
             "ingredients": ["200g red lentils", "1 carrot", "1 celery stalk", "1 onion", "400ml vegetable stock", "cumin", "coriander"],
             "steps": ["Sauté onion, carrot, and celery for 5 min.", "Add lentils, stock, and spices.", "Simmer 25 min until lentils are tender.", "Blend partially for a creamy texture."]},
            {"name": "Caprese Panini",
             "ingredients": ["1 ciabatta roll", "2 thick slices mozzarella", "2 tomato slices", "fresh basil", "balsamic glaze", "olive oil"],
             "steps": ["Slice ciabatta and brush with olive oil.", "Layer mozzarella, tomato, and basil.", "Grill in a panini press for 3 min.", "Drizzle balsamic glaze to serve."]},
            {"name": "Black Bean Tacos",
             "ingredients": ["2 corn tortillas", "200g canned black beans", "1/2 avocado", "salsa", "sour cream", "lime juice", "coriander"],
             "steps": ["Drain and heat black beans.", "Warm tortillas.", "Fill with beans, avocado, salsa, and sour cream.", "Squeeze lime and top with coriander."]},
            {"name": "Spinach & Chickpea Curry",
             "ingredients": ["400g canned chickpeas", "150g spinach", "400ml coconut milk", "1 onion", "2 tbsp curry paste", "basmati rice"],
             "steps": ["Cook rice per packet instructions.", "Sauté onion; add curry paste and cook 2 min.", "Add chickpeas and coconut milk; simmer 15 min.", "Stir in spinach until wilted."]},
            {"name": "Mediterranean Halloumi Salad",
             "ingredients": ["150g halloumi (sliced)", "80g mixed leaves", "10 cherry tomatoes", "1/2 cucumber", "kalamata olives", "lemon dressing"],
             "steps": ["Grill halloumi 2 min per side until golden.", "Chop vegetables and toss with leaves.", "Top with halloumi; drizzle lemon dressing."]},
            {"name": "Mushroom Risotto",
             "ingredients": ["150g arborio rice", "200g mixed mushrooms", "1 onion", "50ml white wine", "700ml vegetable stock", "40g parmesan", "butter"],
             "steps": ["Sauté onion in butter.", "Add rice; stir 1 min.", "Add wine; stir until absorbed.", "Add stock ladle by ladle, stirring, for 20 min.", "Stir in parmesan and mushrooms."]},
            {"name": "Falafel & Hummus Pita",
             "ingredients": ["4 falafel balls", "1 pita bread", "60g hummus", "30g tabbouleh", "cucumber slices", "tahini"],
             "steps": ["Warm falafel in the oven for 10 min.", "Toast pita briefly.", "Spread hummus inside; fill with falafel, tabbouleh, and cucumber.", "Drizzle tahini."]},
        ],
        "vegan": [
            {"name": "Roasted Veggie & Quinoa Bowl",
             "ingredients": ["100g quinoa", "1 courgette", "1 bell pepper", "100g sweet potato", "2 tbsp olive oil", "2 tbsp hummus"],
             "steps": ["Roast veggies at 200°C for 25 min.", "Cook quinoa per packet instructions.", "Assemble bowl; top with hummus."]},
            {"name": "Chickpea & Tomato Stew",
             "ingredients": ["400g chickpeas", "400g crushed tomatoes", "1 onion", "3 garlic cloves", "paprika", "cumin", "crusty bread"],
             "steps": ["Sauté onion and garlic.", "Add spices, tomatoes, and chickpeas.", "Simmer 20 min.", "Serve with crusty bread."]},
            {"name": "Mango Avocado Rice Paper Rolls",
             "ingredients": ["6 rice paper sheets", "1 mango (sliced)", "1 avocado", "50g vermicelli noodles", "mint leaves", "sweet chilli sauce"],
             "steps": ["Soak rice paper in water 30 seconds.", "Fill with noodles, mango, avocado, and mint.", "Roll tightly.", "Serve with sweet chilli dipping sauce."]},
            {"name": "Lentil Dal with Naan",
             "ingredients": ["200g red lentils", "400ml coconut milk", "1 onion", "2 tsp garam masala", "1 tsp turmeric", "1 vegan naan"],
             "steps": ["Sauté onion until golden.", "Add spices and cook 1 min.", "Add lentils and coconut milk; simmer 20 min.", "Serve with warm naan."]},
            {"name": "Smashed Avocado & Chickpea Wrap",
             "ingredients": ["1 large wrap", "1 avocado", "100g canned chickpeas", "lemon juice", "paprika", "30g rocket"],
             "steps": ["Mash avocado with lemon juice and paprika.", "Drain and rinse chickpeas.", "Spread avocado on wrap; add chickpeas and rocket.", "Roll tightly."]},
            {"name": "Tofu Stir-Fry with Noodles",
             "ingredients": ["200g firm tofu", "100g rice noodles", "1 pak choi", "2 tbsp soy sauce", "1 tbsp rice vinegar", "sesame oil", "sesame seeds"],
             "steps": ["Press and cube tofu; fry until golden.", "Cook noodles per packet instructions.", "Add pak choi and sauces to pan.", "Toss noodles with tofu; garnish with sesame seeds."]},
            {"name": "Beetroot & Walnut Salad",
             "ingredients": ["150g cooked beetroot", "40g walnuts", "80g mixed leaves", "1 orange (segmented)", "2 tbsp balsamic dressing"],
             "steps": ["Slice beetroot and arrange on leaves.", "Add walnuts and orange segments.", "Drizzle with balsamic dressing."]},
        ],
        "keto": [
            {"name": "Bunless Beef Burger with Coleslaw",
             "ingredients": ["180g beef patty", "40g cheddar cheese", "2 lettuce leaves", "1 tomato", "2 tbsp mayo", "100g cabbage coleslaw"],
             "steps": ["Season patty; grill 4 min per side.", "Top with cheddar in last minute.", "Serve in lettuce leaves with tomato, mayo, and coleslaw."]},
            {"name": "Chicken & Avocado Salad",
             "ingredients": ["200g grilled chicken", "1 avocado", "80g mixed greens", "1/4 red onion", "2 tbsp olive oil", "lemon juice"],
             "steps": ["Slice chicken and avocado.", "Toss greens with olive oil and lemon juice.", "Top with chicken, avocado, and red onion."]},
            {"name": "Tuna-Stuffed Avocado",
             "ingredients": ["2 avocados", "200g canned tuna", "2 tbsp mayo", "1 celery stalk", "lemon juice", "salt & pepper"],
             "steps": ["Halve avocados and scoop out a little flesh.", "Mix tuna with mayo, diced celery, lemon juice, and seasoning.", "Fill avocado halves generously."]},
            {"name": "Egg Salad Lettuce Wraps",
             "ingredients": ["4 hard-boiled eggs", "2 tbsp mayo", "1 tsp dijon mustard", "4 large lettuce leaves", "paprika"],
             "steps": ["Mash eggs with mayo and mustard.", "Spoon into lettuce leaves.", "Dust with paprika."]},
            {"name": "Bacon-Wrapped Chicken with Roasted Asparagus",
             "ingredients": ["2 chicken breasts", "4 rashers bacon", "200g asparagus", "olive oil", "garlic powder"],
             "steps": ["Wrap each chicken breast with 2 bacon rashers.", "Bake at 200°C for 25 min.", "Toss asparagus with olive oil and garlic; roast alongside for 15 min."]},
            {"name": "Cauliflower Fried Rice with Shrimp",
             "ingredients": ["300g cauliflower rice", "200g shrimp", "2 eggs", "2 tbsp soy sauce", "sesame oil", "spring onions"],
             "steps": ["Stir-fry shrimp until pink; set aside.", "Fry cauliflower rice 5 min.", "Push aside; scramble eggs.", "Combine with shrimp, soy sauce, and sesame oil.", "Garnish with spring onions."]},
            {"name": "Creamy Mushroom & Spinach Omelette",
             "ingredients": ["3 eggs", "100g mushrooms", "40g spinach", "3 tbsp double cream", "40g gruyère", "butter"],
             "steps": ["Sauté mushrooms and spinach in butter.", "Beat eggs with cream; season.", "Cook omelette; fill with mushrooms and gruyère.", "Fold and serve."]},
        ],
        "paleo": [
            {"name": "Grilled Salmon with Steamed Greens",
             "ingredients": ["180g salmon fillet", "100g tenderstem broccoli", "100g sugar snap peas", "lemon", "olive oil", "dill"],
             "steps": ["Rub salmon with olive oil, lemon, and dill.", "Grill skin-down for 4 min, flip and cook 3 more.", "Steam broccoli and peas for 5 min.", "Plate and squeeze lemon over everything."]},
            {"name": "Paleo Chicken Soup",
             "ingredients": ["200g chicken breast", "1 carrot", "1 celery stalk", "1 courgette", "600ml chicken stock", "thyme", "parsley"],
             "steps": ["Bring stock to a boil.", "Add chicken and vegetables.", "Simmer 20 min until chicken is cooked through.", "Shred chicken; garnish with parsley."]},
            {"name": "Sweet Potato & Kale Hash",
             "ingredients": ["200g sweet potato (cubed)", "100g kale", "150g chicken sausage", "1/2 onion", "coconut oil", "sage"],
             "steps": ["Fry sausage in coconut oil; set aside.", "Sauté sweet potato and onion until tender.", "Add kale and sage; cook 3 min.", "Return sausage and serve."]},
            {"name": "Bison Lettuce Tacos",
             "ingredients": ["200g bison mince (or lean beef)", "cumin", "chilli powder", "4 butter lettuce leaves", "salsa", "avocado", "lime"],
             "steps": ["Season and cook bison mince with cumin and chilli powder.", "Fill lettuce cups with meat.", "Top with salsa and avocado; squeeze lime."]},
            {"name": "Zoodles with Bolognese",
             "ingredients": ["2 medium courgettes", "200g beef mince", "400g canned tomatoes", "1 onion", "garlic", "fresh basil"],
             "steps": ["Spiralise courgettes.", "Brown beef with onion and garlic.", "Add tomatoes; simmer 20 min.", "Toss sauce with zoodles; garnish with basil."]},
            {"name": "Tuna & Veggie Stuffed Peppers",
             "ingredients": ["2 bell peppers", "200g canned tuna", "1/2 avocado", "1 tomato", "red onion", "lemon", "fresh herbs"],
             "steps": ["Halve and deseed peppers.", "Mix tuna with diced avocado, tomato, and red onion.", "Season with lemon juice and herbs.", "Fill peppers and serve chilled."]},
            {"name": "Grilled Chicken & Mango Salad",
             "ingredients": ["180g grilled chicken breast", "1 mango (diced)", "80g rocket", "1/4 red onion", "2 tbsp olive oil", "lime juice"],
             "steps": ["Grill chicken and slice when cool.", "Toss rocket with olive oil and lime juice.", "Add mango and red onion.", "Top with chicken."]},
        ],
        "mediterranean": [
            {"name": "Greek Salad with Grilled Chicken",
             "ingredients": ["150g grilled chicken", "100g cucumber", "100g cherry tomatoes", "50g kalamata olives", "60g feta", "red onion", "olive oil", "oregano"],
             "steps": ["Grill chicken; slice when rested.", "Combine all vegetables and olives in a bowl.", "Crumble feta on top.", "Dress with olive oil and oregano."]},
            {"name": "Falafel Bowl with Tabbouleh",
             "ingredients": ["6 falafel balls", "80g tabbouleh", "60g hummus", "50g roasted red peppers", "pita triangles", "tahini"],
             "steps": ["Warm falafel in oven for 10 min.", "Arrange tabbouleh and hummus in a bowl.", "Add falafel and roasted peppers.", "Drizzle tahini; serve with pita."]},
            {"name": "Grilled Sea Bass with Ratatouille",
             "ingredients": ["180g sea bass fillet", "1 courgette", "1 aubergine", "1 tomato", "1/2 onion", "olive oil", "herbes de Provence"],
             "steps": ["Dice vegetables; roast at 200°C for 25 min.", "Rub fish with olive oil and herbs.", "Grill or pan-fry skin-down 4 min; flip 2 min.", "Serve over ratatouille."]},
            {"name": "Hummus & Vegetable Mezze Plate",
             "ingredients": ["100g hummus", "100g falafel", "1/2 cucumber", "10 cherry tomatoes", "pita bread", "30g tabbouleh", "olives"],
             "steps": ["Warm falafel and pita.", "Arrange all components on a large plate.", "Garnish with a drizzle of olive oil."]},
            {"name": "Prawn & Orzo Salad",
             "ingredients": ["150g cooked prawns", "100g orzo (cooked)", "50g sun-dried tomatoes", "30g baby spinach", "20g pine nuts", "lemon dressing"],
             "steps": ["Cook orzo per packet instructions; cool.", "Toss all ingredients together.", "Dress with lemon dressing and serve."]},
            {"name": "Lamb & Vegetable Pitta",
             "ingredients": ["150g lamb mince", "1 pitta", "2 tbsp tzatziki", "30g lettuce", "1 tomato", "cumin", "coriander"],
             "steps": ["Season mince with cumin and coriander; cook until browned.", "Warm pitta.", "Fill with lamb, lettuce, and tomato.", "Top with tzatziki."]},
            {"name": "Nicoise-Style Tuna Bowl",
             "ingredients": ["150g tuna (canned)", "2 boiled eggs", "100g green beans", "cherry tomatoes", "olives", "lemon vinaigrette"],
             "steps": ["Blanch green beans 3 min.", "Halve boiled eggs.", "Arrange all components in a bowl.", "Dress with lemon vinaigrette."]},
        ],
    }

    DINNERS = {
        "standard": [
            {"name": "Baked Salmon with Roasted Vegetables",
             "ingredients": ["180g salmon fillet", "150g sweet potato", "100g asparagus", "olive oil", "lemon", "rosemary", "garlic"],
             "steps": ["Preheat oven to 200°C.", "Toss sweet potato and asparagus with olive oil and garlic; roast 20 min.", "Season salmon with lemon and rosemary; add to tray for final 15 min.", "Serve together."]},
            {"name": "Chicken Stir-Fry with Noodles",
             "ingredients": ["200g chicken breast (sliced)", "100g egg noodles", "100g mixed peppers", "80g broccoli", "3 tbsp oyster sauce", "sesame oil"],
             "steps": ["Cook noodles per packet instructions.", "Stir-fry chicken over high heat 4 min.", "Add vegetables and oyster sauce; cook 3 min.", "Toss with noodles and sesame oil."]},
            {"name": "Beef Bolognese with Spaghetti",
             "ingredients": ["200g beef mince", "100g spaghetti", "400g canned tomatoes", "1 onion", "2 garlic cloves", "basil", "parmesan"],
             "steps": ["Cook spaghetti; reserve pasta water.", "Brown mince with onion and garlic.", "Add tomatoes; simmer 20 min.", "Toss with pasta; top with parmesan and basil."]},
            {"name": "Prawn Tacos with Mango Salsa",
             "ingredients": ["200g king prawns", "4 small tortillas", "1 mango (diced)", "1/2 red onion", "coriander", "lime juice", "sriracha"],
             "steps": ["Season and grill prawns 2 min per side.", "Mix mango, onion, coriander, and lime for salsa.", "Warm tortillas.", "Fill with prawns and salsa; drizzle sriracha."]},
            {"name": "Lamb Chops with Mint Sauce & Potatoes",
             "ingredients": ["2 lamb chops", "200g baby potatoes", "mint sauce", "rosemary", "garlic", "olive oil"],
             "steps": ["Boil potatoes until tender; toss with olive oil and rosemary.", "Rub lamb with garlic and olive oil.", "Grill 3–4 min per side.", "Serve with potatoes and mint sauce."]},
            {"name": "Creamy Tomato Chicken Pasta",
             "ingredients": ["200g chicken breast", "100g penne", "200ml passata", "100ml double cream", "50g parmesan", "basil", "garlic"],
             "steps": ["Cook penne; drain.", "Pan-fry chicken; slice and set aside.", "Fry garlic; add passata and cream.", "Stir in parmesan; return chicken and pasta.", "Garnish with basil."]},
            {"name": "Pork Tenderloin with Apple & Cider Sauce",
             "ingredients": ["200g pork tenderloin", "1 apple (sliced)", "100ml cider", "100ml chicken stock", "1 shallot", "thyme", "butter"],
             "steps": ["Brown pork tenderloin all over in butter.", "Set aside and rest 5 min; slice.", "Sauté shallot; add cider and stock.", "Add apple and thyme; reduce by half.", "Spoon sauce over sliced pork."]},
        ],
        "high_protein": [
            {"name": "Grilled Chicken & Sweet Potato",
             "ingredients": ["220g chicken breast", "200g sweet potato", "100g broccoli", "olive oil", "paprika", "garlic powder"],
             "steps": ["Cube and roast sweet potato at 200°C for 25 min.", "Season chicken with paprika and garlic powder.", "Grill 6 min per side.", "Steam broccoli 5 min.", "Plate together with a drizzle of olive oil."]},
            {"name": "Lean Beef Burger Bowl",
             "ingredients": ["200g lean beef mince", "100g quinoa", "50g feta", "80g mixed greens", "cherry tomatoes", "tzatziki"],
             "steps": ["Form patty; grill 4 min per side.", "Cook quinoa; let cool slightly.", "Assemble bowl with quinoa, greens, tomatoes, and feta.", "Top with patty and tzatziki."]},
            {"name": "Seared Tuna with Edamame & Brown Rice",
             "ingredients": ["180g tuna steak", "100g brown rice", "80g edamame", "2 tbsp soy sauce", "1 tsp sesame oil", "sesame seeds", "ginger"],
             "steps": ["Cook brown rice.", "Sear tuna in a hot pan 60 seconds per side.", "Toss edamame with soy, sesame oil, and ginger.", "Slice tuna; serve over rice with edamame.", "Sprinkle sesame seeds."]},
            {"name": "Turkey Meatballs with Marinara & Courgette Noodles",
             "ingredients": ["250g turkey mince", "2 courgettes (spiralised)", "200ml marinara sauce", "garlic", "breadcrumbs", "parsley", "parmesan"],
             "steps": ["Mix mince with garlic, breadcrumbs, and parsley; form balls.", "Bake at 200°C for 15 min.", "Heat marinara; add meatballs.", "Sauté courgette noodles 2 min.", "Serve with parmesan."]},
            {"name": "Baked Cod with Lemon & Herb Quinoa",
             "ingredients": ["200g cod fillet", "100g quinoa", "lemon", "parsley", "dill", "olive oil", "capers"],
             "steps": ["Cook quinoa; fluff with fork, stir in lemon zest and herbs.", "Place cod in baking dish; drizzle olive oil and lemon juice.", "Bake at 200°C for 15 min.", "Serve over herb quinoa with capers."]},
            {"name": "Chilli Con Carne (Extra Protein)",
             "ingredients": ["200g lean beef mince", "200g kidney beans", "400g canned tomatoes", "1 onion", "cumin", "chilli powder", "100g low-fat Greek yogurt"],
             "steps": ["Brown mince with onion.", "Add spices, tomatoes, and beans.", "Simmer 25 min.", "Serve with Greek yogurt instead of sour cream."]},
            {"name": "Chicken & Black Bean Burrito Bowl",
             "ingredients": ["200g chicken breast", "100g brown rice", "100g black beans", "salsa", "30g cheddar", "1/4 avocado", "lime"],
             "steps": ["Season and grill chicken; slice.", "Cook rice.", "Assemble bowl with rice, beans, chicken, salsa, and cheese.", "Top with avocado and lime."]},
        ],
        "vegetarian": [
            {"name": "Butternut Squash Risotto",
             "ingredients": ["150g arborio rice", "300g butternut squash (cubed)", "700ml veg stock", "1 onion", "50ml white wine", "40g parmesan", "sage"],
             "steps": ["Roast squash at 200°C for 20 min.", "Sauté onion; add rice and stir 1 min.", "Add wine; stir until absorbed.", "Add stock ladle by ladle, stirring 20 min.", "Stir in squash and parmesan; top with crispy sage."]},
            {"name": "Paneer Tikka Masala",
             "ingredients": ["200g paneer (cubed)", "400ml tikka masala sauce", "1 bell pepper", "100g basmati rice", "fresh coriander"],
             "steps": ["Cook rice.", "Grill or fry paneer until golden.", "Simmer tikka masala sauce with pepper.", "Add paneer; heat through.", "Serve over rice with coriander."]},
            {"name": "Chickpea & Spinach Tagine",
             "ingredients": ["400g chickpeas", "150g spinach", "400g canned tomatoes", "1 onion", "2 tsp ras el hanout", "100g couscous"],
             "steps": ["Sauté onion; add ras el hanout and cook 1 min.", "Add tomatoes and chickpeas; simmer 15 min.", "Wilt in spinach.", "Prepare couscous; serve tagine on top."]},
            {"name": "Aubergine Parmigiana",
             "ingredients": ["1 large aubergine", "400g canned tomatoes", "80g mozzarella", "40g parmesan", "basil", "olive oil"],
             "steps": ["Slice and salt aubergine; pat dry.", "Fry slices in olive oil until golden.", "Layer in a baking dish with tomato sauce, mozzarella, and parmesan.", "Bake at 190°C for 25 min; scatter basil."]},
            {"name": "Vegetable Thai Green Curry",
             "ingredients": ["400ml coconut milk", "2 tbsp green curry paste", "200g mixed vegetables", "100g jasmine rice", "lime leaves", "basil"],
             "steps": ["Cook rice.", "Heat curry paste in a pan 1 min.", "Add coconut milk and lime leaves; bring to a simmer.", "Add vegetables; cook 10 min.", "Serve over rice with basil."]},
            {"name": "Stuffed Aubergine with Feta & Tomato",
             "ingredients": ["2 aubergines", "200g cherry tomatoes", "80g feta", "2 garlic cloves", "fresh thyme", "olive oil"],
             "steps": ["Halve aubergines; score flesh and brush with oil.", "Roast at 200°C for 20 min.", "Sauté tomatoes and garlic.", "Fill aubergines; crumble feta and add thyme.", "Return to oven for 10 min."]},
            {"name": "Lentil Shepherd's Pie",
             "ingredients": ["300g green lentils", "400g canned tomatoes", "1 carrot", "1 celery stalk", "500g mashed potato", "cheddar", "thyme"],
             "steps": ["Cook lentils with vegetables and tomatoes for 25 min.", "Transfer to a baking dish.", "Top with mashed potato and cheddar.", "Grill until golden."]},
        ],
        "vegan": [
            {"name": "Jackfruit Tacos with Mango Salsa",
             "ingredients": ["400g canned young jackfruit", "4 small tortillas", "BBQ sauce", "1 mango (diced)", "coriander", "lime juice", "purple cabbage slaw"],
             "steps": ["Drain jackfruit; shred and cook in BBQ sauce for 15 min.", "Mix mango with coriander and lime for salsa.", "Warm tortillas.", "Fill with jackfruit, slaw, and mango salsa."]},
            {"name": "Thai Peanut Noodles",
             "ingredients": ["150g rice noodles", "3 tbsp peanut butter", "2 tbsp soy sauce", "1 tbsp lime juice", "1 tsp ginger", "100g shredded cabbage", "spring onions", "peanuts"],
             "steps": ["Cook noodles; drain.", "Whisk peanut butter, soy sauce, lime, and ginger.", "Toss noodles with sauce and cabbage.", "Garnish with spring onions and crushed peanuts."]},
            {"name": "Lentil Bolognese with Pasta",
             "ingredients": ["200g red lentils", "100g spaghetti", "400g canned tomatoes", "1 onion", "garlic", "basil", "nutritional yeast"],
             "steps": ["Cook spaghetti.", "Sauté onion and garlic.", "Add lentils and tomatoes; simmer 25 min.", "Toss with spaghetti; top with nutritional yeast and basil."]},
            {"name": "Vegan Buddha Bowl",
             "ingredients": ["100g quinoa", "100g roasted chickpeas", "1/2 avocado", "50g edamame", "100g roasted sweet potato", "tahini dressing"],
             "steps": ["Cook quinoa.", "Roast chickpeas and sweet potato at 200°C for 25 min.", "Assemble all components in a bowl.", "Drizzle tahini dressing."]},
            {"name": "Coconut & Chickpea Curry",
             "ingredients": ["400g chickpeas", "400ml coconut milk", "400g canned tomatoes", "2 tbsp curry powder", "1 onion", "garlic", "100g basmati rice"],
             "steps": ["Cook rice.", "Sauté onion and garlic; add curry powder.", "Add chickpeas, tomatoes, and coconut milk.", "Simmer 20 min.", "Serve over rice."]},
            {"name": "Stuffed Sweet Potato with Black Beans",
             "ingredients": ["2 large sweet potatoes", "200g black beans", "100g sweetcorn", "salsa", "1/2 avocado", "coriander", "lime"],
             "steps": ["Bake sweet potatoes at 200°C for 45 min.", "Mix beans with sweetcorn and salsa.", "Split potatoes and fill.", "Top with avocado, coriander, and lime."]},
            {"name": "Mushroom & Tofu Stir-Fry",
             "ingredients": ["200g firm tofu", "200g mixed mushrooms", "100g pak choi", "2 tbsp hoisin sauce", "1 tbsp sesame oil", "100g jasmine rice"],
             "steps": ["Cook rice.", "Fry tofu until golden; set aside.", "Stir-fry mushrooms and pak choi.", "Return tofu; add hoisin sauce.", "Serve over rice with sesame oil."]},
        ],
        "keto": [
            {"name": "Ribeye Steak with Garlic Butter Mushrooms",
             "ingredients": ["200g ribeye steak", "150g mixed mushrooms", "3 tbsp butter", "3 garlic cloves", "rosemary", "salt & pepper"],
             "steps": ["Season steak generously.", "Sear in a hot pan 3–4 min per side; rest 5 min.", "Sauté mushrooms with butter, garlic, and rosemary.", "Serve steak topped with mushrooms."]},
            {"name": "Baked Salmon with Cream Cheese & Cucumber Salad",
             "ingredients": ["200g salmon", "80g cream cheese", "dill", "1 cucumber", "2 tbsp olive oil", "lemon", "capers"],
             "steps": ["Bake salmon at 200°C for 15 min.", "Slice cucumber thinly; dress with olive oil, lemon, and capers.", "Serve salmon with cream cheese dollops and dill alongside cucumber salad."]},
            {"name": "Pork Belly with Sautéed Cabbage",
             "ingredients": ["200g pork belly (sliced)", "200g white cabbage (shredded)", "garlic", "caraway seeds", "butter", "salt"],
             "steps": ["Crisp pork belly slices in a dry pan.", "Sauté cabbage in butter with garlic and caraway seeds.", "Cook until tender and slightly caramelised.", "Serve pork on top."]},
            {"name": "Chicken Thighs with Roasted Cauliflower",
             "ingredients": ["250g chicken thighs (bone-in)", "300g cauliflower florets", "olive oil", "paprika", "garlic powder", "parmesan"],
             "steps": ["Rub chicken with paprika and garlic powder.", "Roast at 200°C for 35 min.", "Toss cauliflower with olive oil and parmesan; roast alongside for last 20 min."]},
            {"name": "Shrimp Scampi with Courgette Noodles",
             "ingredients": ["250g large shrimp", "2 courgettes (spiralised)", "4 garlic cloves", "50ml white wine", "3 tbsp butter", "parsley", "parmesan"],
             "steps": ["Sauté garlic in butter.", "Add shrimp; cook 2 min per side.", "Splash in wine; reduce 1 min.", "Toss with courgette noodles.", "Serve with parsley and parmesan."]},
            {"name": "Lamb Chops with Tzatziki & Greek Salad",
             "ingredients": ["2 lamb chops", "100g cucumber (diced)", "100g cherry tomatoes", "40g feta", "olives", "tzatziki"],
             "steps": ["Grill lamb chops 3 min per side.", "Combine cucumber, tomatoes, feta, and olives.", "Serve chops alongside salad and tzatziki."]},
            {"name": "Egg & Bacon Stuffed Avocados",
             "ingredients": ["2 large avocados", "4 eggs", "4 rashers bacon", "cheddar", "chives", "salt & pepper"],
             "steps": ["Preheat oven to 200°C.", "Halve avocados; remove enough flesh to hold an egg.", "Lay avocados in a tray; crack one egg into each.", "Bake 15 min.", "Top with crumbled bacon, cheddar, and chives."]},
        ],
        "paleo": [
            {"name": "Herb-Crusted Baked Salmon",
             "ingredients": ["200g salmon fillet", "parsley", "dill", "lemon zest", "garlic", "olive oil", "asparagus"],
             "steps": ["Mix herbs, lemon zest, and garlic with olive oil.", "Spread over salmon.", "Bake at 200°C for 15 min.", "Steam asparagus alongside."]},
            {"name": "Grass-Fed Beef & Sweet Potato Bowl",
             "ingredients": ["200g grass-fed beef (strips)", "200g sweet potato", "100g kale", "1 tbsp coconut aminos", "coconut oil"],
             "steps": ["Roast sweet potato cubes at 200°C for 25 min.", "Stir-fry beef in coconut oil until cooked.", "Wilt kale; add coconut aminos.", "Assemble bowl."]},
            {"name": "Chicken Cacciatore",
             "ingredients": ["2 chicken thighs", "400g canned tomatoes", "1 onion", "1 bell pepper", "garlic", "olives", "rosemary"],
             "steps": ["Brown chicken all over.", "Sauté onion and pepper.", "Return chicken; add tomatoes, olives, and rosemary.", "Cover and simmer 30 min."]},
            {"name": "Grilled Lamb Kofta with Tabbouleh",
             "ingredients": ["250g lamb mince", "cumin", "coriander", "mint", "cauliflower tabbouleh", "cucumber", "lemon"],
             "steps": ["Mix lamb with spices and mint; shape onto skewers.", "Grill 8–10 min, turning often.", "Prepare cauliflower tabbouleh with cucumber and lemon.", "Serve kofta over tabbouleh."]},
            {"name": "One-Pan Roast Chicken & Vegetables",
             "ingredients": ["2 chicken thighs", "150g carrot (sliced)", "100g parsnip", "1 courgette", "garlic", "thyme", "olive oil"],
             "steps": ["Toss vegetables with olive oil, garlic, and thyme.", "Place chicken thighs on top.", "Roast at 200°C for 35–40 min until chicken is golden."]},
            {"name": "Prawn & Avocado Ceviche",
             "ingredients": ["200g cooked prawns", "1 avocado (diced)", "1 tomato", "1/2 red onion", "jalapeño", "lime juice", "coriander"],
             "steps": ["Marinate prawns in lime juice for 10 min.", "Combine with avocado, tomato, onion, and jalapeño.", "Toss with coriander.", "Serve immediately with lettuce cups."]},
            {"name": "Pork Tenderloin with Apple & Cabbage",
             "ingredients": ["200g pork tenderloin", "1 apple (sliced)", "200g red cabbage (shredded)", "1 tbsp apple cider vinegar", "coconut oil", "thyme"],
             "steps": ["Sear pork in coconut oil; roast at 190°C for 18 min.", "Sauté cabbage with apple, vinegar, and thyme for 10 min.", "Rest pork 5 min, slice, and serve over cabbage."]},
        ],
        "mediterranean": [
            {"name": "Baked Sea Bream with Lemon & Olive Oil",
             "ingredients": ["1 whole sea bream (or fillets)", "lemon", "garlic", "olive oil", "fresh thyme", "cherry tomatoes", "olives"],
             "steps": ["Score fish; stuff with lemon slices and thyme.", "Place on cherry tomatoes and olives.", "Drizzle olive oil; roast at 200°C for 25 min."]},
            {"name": "Lamb Souvlaki with Tzatziki & Pita",
             "ingredients": ["200g lamb (cubed)", "pita bread", "tzatziki", "salad leaves", "lemon", "cumin", "garlic"],
             "steps": ["Marinate lamb with lemon, cumin, and garlic for 30 min.", "Thread onto skewers; grill 8–10 min.", "Warm pita.", "Fill with lamb and salad; top with tzatziki."]},
            {"name": "Prawn Saganaki",
             "ingredients": ["200g large prawns", "200g feta", "400g canned tomatoes", "1 onion", "garlic", "chilli flakes", "crusty bread"],
             "steps": ["Sauté onion and garlic.", "Add tomatoes and chilli flakes; simmer 10 min.", "Add prawns and feta chunks.", "Bake at 200°C for 10 min.", "Serve with crusty bread."]},
            {"name": "Chicken Souvlaki Bowl",
             "ingredients": ["200g chicken breast", "100g bulgur wheat", "cucumber", "tomatoes", "feta", "hummus", "tzatziki", "olives"],
             "steps": ["Marinate chicken in lemon, garlic, and oregano; grill.", "Cook bulgur wheat.", "Assemble bowl with all toppings.", "Drizzle tzatziki."]},
            {"name": "Baked Cod with White Beans & Tomatoes",
             "ingredients": ["200g cod fillet", "400g white beans", "400g cherry tomatoes", "garlic", "thyme", "olive oil", "white wine"],
             "steps": ["Arrange beans, tomatoes, and garlic in a baking dish.", "Splash with wine and olive oil.", "Place cod on top; season.", "Bake at 200°C for 20 min."]},
            {"name": "Moussaka",
             "ingredients": ["200g lamb mince", "1 aubergine", "400g canned tomatoes", "1 onion", "cinnamon", "allspice", "béchamel sauce"],
             "steps": ["Slice and roast aubergine.", "Cook mince with onion and spices; add tomatoes.", "Layer mince, aubergine, and béchamel in a dish.", "Bake at 190°C for 35 min."]},
            {"name": "Grilled Swordfish with Caponata",
             "ingredients": ["200g swordfish steak", "1 aubergine", "1 celery stalk", "capers", "olives", "canned tomatoes", "red wine vinegar"],
             "steps": ["Dice aubergine and celery; sauté in olive oil.", "Add tomatoes, capers, olives, and vinegar; simmer 15 min.", "Grill swordfish 4 min per side.", "Serve over caponata."]},
        ],
    }

    SNACKS = {
        "standard": [
            {"name": "Apple & Peanut Butter",
             "ingredients": ["1 apple", "2 tbsp peanut butter"],
             "steps": ["Slice apple.", "Dip in peanut butter."]},
            {"name": "Mixed Nuts & Dried Fruit",
             "ingredients": ["30g mixed nuts", "20g raisins or cranberries"],
             "steps": ["Combine in a small bowl and enjoy."]},
            {"name": "Hummus & Veggie Sticks",
             "ingredients": ["80g hummus", "1 carrot", "1 celery stalk", "bell pepper strips"],
             "steps": ["Cut vegetables into sticks.", "Dip in hummus."]},
            {"name": "Rice Cakes with Cottage Cheese",
             "ingredients": ["2 rice cakes", "80g cottage cheese", "chives", "black pepper"],
             "steps": ["Spread cottage cheese on rice cakes.", "Garnish with chives and pepper."]},
            {"name": "Banana & Almond Butter",
             "ingredients": ["1 banana", "2 tbsp almond butter"],
             "steps": ["Slice banana.", "Serve with almond butter for dipping."]},
        ],
        "high_protein": [
            {"name": "Greek Yogurt & Berries",
             "ingredients": ["200g Greek yogurt", "80g blueberries", "1 tsp honey"],
             "steps": ["Top yogurt with berries and honey."]},
            {"name": "Hard-Boiled Eggs",
             "ingredients": ["2 hard-boiled eggs", "salt & pepper"],
             "steps": ["Boil eggs for 8 min.", "Cool, peel, and season."]},
            {"name": "Protein Bar (Homemade)",
             "ingredients": ["2 scoops protein powder", "60g oat flour", "3 tbsp peanut butter", "2 tbsp honey", "milk to bind"],
             "steps": ["Mix all ingredients until combined.", "Press into a lined tray.", "Refrigerate 1 hour; cut into bars."]},
            {"name": "Edamame with Sea Salt",
             "ingredients": ["150g edamame (in pod)", "flaky sea salt"],
             "steps": ["Boil edamame 5 min.", "Drain and season with sea salt."]},
            {"name": "Cottage Cheese with Cucumber",
             "ingredients": ["150g cottage cheese", "1/2 cucumber (sliced)", "black pepper", "dill"],
             "steps": ["Arrange cucumber slices.", "Top with cottage cheese, dill, and pepper."]},
        ],
        "vegetarian": [
            {"name": "Guacamole with Tortilla Chips",
             "ingredients": ["1 avocado", "1 lime", "salt", "50g tortilla chips"],
             "steps": ["Mash avocado with lime juice and salt.", "Serve with chips."]},
            {"name": "Cheese & Oat Crackers",
             "ingredients": ["40g cheddar", "6 oat crackers"],
             "steps": ["Slice cheese.", "Serve on crackers."]},
            {"name": "Roasted Chickpeas",
             "ingredients": ["200g canned chickpeas", "1 tsp paprika", "1 tsp cumin", "1 tbsp olive oil", "salt"],
             "steps": ["Toss chickpeas with oil and spices.", "Roast at 200°C for 25–30 min until crispy."]},
            {"name": "Yogurt & Granola",
             "ingredients": ["150g yogurt", "50g granola", "honey"],
             "steps": ["Layer yogurt and granola.", "Drizzle honey."]},
        ],
        "vegan": [
            {"name": "Fruit & Nut Mix",
             "ingredients": ["30g cashews", "20g almonds", "20g dried mango", "20g raisins"],
             "steps": ["Combine all ingredients in a bag or bowl."]},
            {"name": "Banana & Walnut",
             "ingredients": ["1 banana", "30g walnuts"],
             "steps": ["Peel banana; serve with walnuts."]},
            {"name": "Rice Cakes with Avocado",
             "ingredients": ["2 rice cakes", "1/2 avocado", "lemon juice", "chilli flakes"],
             "steps": ["Mash avocado with lemon and chilli.", "Spread on rice cakes."]},
            {"name": "Date & Almond Bliss Balls",
             "ingredients": ["6 Medjool dates", "80g almonds", "2 tbsp cocoa powder", "1 tsp vanilla"],
             "steps": ["Blend all ingredients in a food processor.", "Roll into balls.", "Refrigerate 30 min."]},
        ],
        "keto": [
            {"name": "Cheese & Pepperoni Plate",
             "ingredients": ["40g cheddar", "30g pepperoni slices"],
             "steps": ["Arrange on a plate and serve."]},
            {"name": "Celery & Cream Cheese",
             "ingredients": ["3 celery stalks", "80g cream cheese"],
             "steps": ["Cut celery into sticks.", "Fill with cream cheese."]},
            {"name": "Macadamia Nuts",
             "ingredients": ["40g macadamia nuts", "pinch of salt"],
             "steps": ["Serve nuts lightly salted."]},
            {"name": "Bacon-Wrapped Asparagus",
             "ingredients": ["6 asparagus spears", "3 rashers bacon"],
             "steps": ["Wrap 2 spears per bacon rasher.", "Grill or bake at 200°C for 15 min."]},
        ],
        "paleo": [
            {"name": "Apple & Walnut Mix",
             "ingredients": ["1 apple", "30g walnuts"],
             "steps": ["Slice apple; serve with walnuts."]},
            {"name": "Beef Jerky & Almonds",
             "ingredients": ["40g paleo beef jerky", "30g almonds"],
             "steps": ["Combine in a small bag for a portable snack."]},
            {"name": "Coconut Chips & Berries",
             "ingredients": ["20g toasted coconut chips", "80g strawberries"],
             "steps": ["Combine in a bowl and enjoy."]},
            {"name": "Carrot Sticks & Guacamole",
             "ingredients": ["1 large carrot", "80g guacamole"],
             "steps": ["Cut carrot into sticks.", "Dip in guacamole."]},
        ],
        "mediterranean": [
            {"name": "Hummus & Pita Triangles",
             "ingredients": ["80g hummus", "1 pita (toasted)"],
             "steps": ["Toast and cut pita into triangles.", "Serve alongside hummus."]},
            {"name": "Olives & Feta Cube Plate",
             "ingredients": ["30g kalamata olives", "50g feta (cubed)"],
             "steps": ["Arrange on a small plate."]},
            {"name": "Walnuts & Dried Figs",
             "ingredients": ["30g walnuts", "2 dried figs"],
             "steps": ["Eat together as a snack."]},
            {"name": "Tzatziki & Cucumber",
             "ingredients": ["80g tzatziki", "1/2 cucumber (sliced)"],
             "steps": ["Slice cucumber; dip in tzatziki."]},
        ],
    }

    # pick the diet key for lookups, fall back to standard
    dk = diet if diet in BREAKFASTS else "standard"

    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

    b_list = BREAKFASTS[dk].copy()
    l_list = LUNCHES[dk].copy()
    d_list = DINNERS[dk].copy()
    s_list = SNACKS.get(dk, SNACKS["standard"]).copy()

    # shuffle so days vary
    _random.shuffle(b_list)
    _random.shuffle(l_list)
    _random.shuffle(d_list)
    _random.shuffle(s_list)

    plan = {}
    for i, day in enumerate(days):
        b_cal = round(daily_cal * 0.25)
        l_cal = round(daily_cal * 0.35)
        d_cal = round(daily_cal * 0.30)
        s_cal = round(daily_cal * 0.10)

        bm = b_list[i % len(b_list)]
        lm = l_list[i % len(l_list)]
        dm = d_list[i % len(d_list)]
        sm = s_list[i % len(s_list)]

        meals = [
            {"type": "Breakfast",      "name": bm["name"], "calories": b_cal,
             "ingredients": bm["ingredients"], "steps": bm["steps"], "macros": macros(b_cal)},
            {"type": "Lunch",          "name": lm["name"], "calories": l_cal,
             "ingredients": lm["ingredients"], "steps": lm["steps"], "macros": macros(l_cal)},
            {"type": "Dinner",         "name": dm["name"], "calories": d_cal,
             "ingredients": dm["ingredients"], "steps": dm["steps"], "macros": macros(d_cal)},
        ]

        if meals_per_day >= 4:
            meals.insert(2, {"type": "Afternoon Snack", "name": sm["name"], "calories": s_cal,
                              "ingredients": sm["ingredients"], "steps": sm["steps"], "macros": macros(s_cal)})
        if meals_per_day >= 5:
            ms = s_list[(i + 3) % len(s_list)]
            meals.insert(1, {"type": "Morning Snack", "name": ms["name"], "calories": round(s_cal * 0.5),
                              "ingredients": ms["ingredients"], "steps": ms["steps"], "macros": macros(round(s_cal * 0.5))})

        plan[day] = meals

    return plan


def _try_openai(prompt, want_json):
    """Try OpenAI API if key is configured."""
    if not OPENAI_API_KEY:
        return None, "No API key"
    system = "Respond with valid JSON only — no markdown, no code fences, just raw JSON." if want_json else "You are an expert sports nutritionist and fitness coach for ALEFIT."
    messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
    payload = {"model": "gpt-4o-mini", "messages": messages}
    if want_json:
        payload["response_format"] = {"type": "json_object"}
    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        return result["choices"][0]["message"]["content"], None
    except Exception as e:
        return None, str(e)


@app.route("/api/apps/<app_id>/integration-endpoints/Core/InvokeLLM", methods=["POST"])
def invoke_llm(app_id):
    user, token, err = require_auth()
    if err:
        return err

    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    response_json_schema = data.get("response_json_schema")
    # Treat meal-plan prompts as JSON requests even when schema not sent
    want_json = bool(response_json_schema) or "meal plan" in prompt.lower() or "7-day" in prompt.lower()

    # Try OpenAI first if key exists
    if OPENAI_API_KEY:
        text, ai_err = _try_openai(prompt, want_json)
        if not ai_err:
            if want_json:
                try:
                    result = json.loads(text)
                except Exception:
                    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
                    result = json.loads(cleaned)
                _save_meal_plan(user["id"], result, prompt)
                return jsonify(result)
            return jsonify({"result": text})

    # --- Server-side meal plan generation (always works, no external API needed) ---
    if want_json:
        goal, diet, meals_per_day, allergies = _parse_meal_prefs(prompt)
        result = _generate_meal_plan(goal, diet, meals_per_day, allergies)
        _save_meal_plan(user["id"], result, prompt)
        return jsonify(result)

    # Non-JSON prompt (general advice) — return a useful text response
    return jsonify({"result": _generate_advice(prompt)})


def _save_meal_plan(user_id, plan, prompt):
    try:
        conn = get_db()
        cur = conn.cursor()
        entity_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO entities (id, user_id, entity_type, data) VALUES (%s, %s, %s, %s)",
            (entity_id, user_id, "MealPlan", json.dumps({"plan": plan, "prompt": prompt, "generated_at": now_iso()}))
        )
        conn.close()
    except Exception:
        pass


def _generate_advice(prompt):
    p = prompt.lower()
    if "protein" in p:
        return "Aim for 1.6–2.2g of protein per kg of bodyweight daily. Great sources include chicken breast, eggs, Greek yogurt, cottage cheese, and legumes."
    if "calorie" in p or "weight" in p:
        return "To lose weight, create a moderate calorie deficit of 300–500 kcal/day. Prioritise whole foods, lean proteins, and vegetables to stay full while staying in deficit."
    if "muscle" in p or "bulk" in p:
        return "For muscle gain, eat in a slight calorie surplus (200–300 kcal above maintenance) with 1.8–2.2g protein per kg bodyweight. Time carbohydrates around your workouts."
    return "Consistency is the foundation of great nutrition. Focus on whole foods, adequate protein, balanced meals, and proper hydration. Small, sustainable changes compound over time."


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
