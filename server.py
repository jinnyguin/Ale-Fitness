import os
import json
import re
import base64
import hashlib
import hmac
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
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
APP_ID = "6a1f3d189ebdbe71fa7d256c"
LOCAL_AUTH_SECRET = os.environ.get("SESSION_SECRET", "")

# ---------------------------------------------------------------------------
# Postgres helpers (Supabase for app data; legacy DB remains local-auth storage)
# ---------------------------------------------------------------------------

def get_db():
    database_url = os.environ.get("SUPABASE_DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("Supabase database connection is not configured.")
    conn = psycopg2.connect(database_url, connect_timeout=10)
    conn.autocommit = True
    return conn


def get_local_auth_db():
    """Keep local-fallback credentials on their existing database."""
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("Database", "")
    if not database_url:
        raise RuntimeError("Local account database connection is not configured.")
    conn = psycopg2.connect(database_url, connect_timeout=10)
    conn.autocommit = True
    return conn


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Supabase Auth helpers
# ---------------------------------------------------------------------------

def _supabase_http_error(error):
    raw = error.read()
    try:
        data = json.loads(raw)
    except Exception:
        data = {"error": "Authentication provider returned an invalid response."}
    message = json.dumps(data).lower()
    if error.code in (401, 403) and any(marker in message for marker in (
        "invalid api key", "invalid_api_key", "no api key found", "api key is invalid"
    )):
        app.logger.warning("Supabase Auth rejected its configured API key.")
        return 503, {"error": "Auth service unavailable."}
    app.logger.warning("Supabase Auth returned HTTP %s.", error.code)
    return error.code, data


def _supabase_transport_error(error):
    reason = getattr(error, "reason", None)
    category = type(reason).__name__ if reason is not None else type(error).__name__
    app.logger.warning("Supabase Auth connection failed (%s).", category)
    return 503, {"error": "Auth service unavailable."}


def _supabase_json_response(response):
    raw = response.read()
    if not raw:
        return response.status, {}
    try:
        return response.status, json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        headers = getattr(response, "headers", {})
        content_type = (headers.get("Content-Type", "unknown") or "unknown")
        content_type = content_type.split(";", 1)[0].strip().lower()[:80]
        app.logger.warning(
            "Supabase Auth returned HTTP %s with non-JSON content (%s).",
            response.status,
            content_type or "unknown",
        )
        return 503, {"error": "Auth service unavailable."}


def supabase_auth(method, path, body=None, token=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        app.logger.warning("Supabase Auth configuration is incomplete.")
        return 503, {"error": "Auth service unavailable."}
    url = f"{SUPABASE_URL.rstrip('/')}{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token or SUPABASE_KEY}",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return _supabase_json_response(resp)
    except urllib.error.HTTPError as e:
        return _supabase_http_error(e)
    except urllib.error.URLError as e:
        return _supabase_transport_error(e)
    except Exception as e:
        app.logger.warning("Supabase Auth request failed (%s).", type(e).__name__)
        return 503, {"error": "Auth service unavailable."}


def supabase_admin(method, path, body=None):
    """Call Supabase admin API using the service role key."""
    key = SUPABASE_SERVICE_KEY
    if not SUPABASE_URL or not key:
        app.logger.warning("Supabase Auth admin configuration is incomplete.")
        return 503, {"error": "Auth service unavailable."}
    url = f"{SUPABASE_URL.rstrip('/')}{path}"
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return _supabase_json_response(resp)
    except urllib.error.HTTPError as e:
        return _supabase_http_error(e)
    except urllib.error.URLError as e:
        return _supabase_transport_error(e)
    except Exception as e:
        app.logger.warning("Supabase Auth admin request failed (%s).", type(e).__name__)
        return 503, {"error": "Auth service unavailable."}


def get_supabase_user_result(token):
    if not token:
        return None, None
    status, data = supabase_auth("GET", "/auth/v1/user", token=token)
    if status == 200:
        if (
            isinstance(data, dict)
            and isinstance(data.get("id"), str)
            and data["id"].strip()
        ):
            return data, status
        app.logger.warning("Supabase Auth user lookup returned an incomplete success response.")
        return None, 503
    return None, status


def get_supabase_user(token):
    user, _status = get_supabase_user_result(token)
    return user


def get_current_user_with_status():
    auth = request.headers.get("Authorization", "")
    token = None
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    if not token:
        token = request.args.get("token") or request.args.get("access_token")
    if not token:
        token = request.cookies.get("sb_token")
    if token and token.startswith("local."):
        user = local_user_from_token(token)
        return user, token, 200 if user else 401
    if not token:
        return None, None, None
    user, status = get_supabase_user_result(token)
    return user, token, 200 if user else status


def get_current_user():
    user, token, _status = get_current_user_with_status()
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


def _b64url_encode(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value):
    return base64.urlsafe_b64decode(value + ("=" * (-len(value) % 4)))


def local_password_hash(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return _b64url_encode(salt + digest)


def local_password_matches(password, stored_hash):
    try:
        raw = _b64url_decode(stored_hash)
        salt, expected = raw[:16], raw[16:]
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def local_user_to_auth_user(row):
    if not row:
        return None
    created_at = row.get("created_at")
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return {
        "id": row.get("id", ""),
        "email": row.get("email", ""),
        "created_at": created_at or "",
        "user_metadata": {"full_name": row.get("full_name") or ""},
        "_local": True,
    }


def ensure_local_auth_table():
    """Create the local auth store used when the remote auth service is down."""
    global _LOCAL_AUTH_TABLE_READY
    if _LOCAL_AUTH_TABLE_READY:
        return True
    conn = None
    try:
        conn = get_local_auth_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        finally:
            conn.close()
        _LOCAL_AUTH_TABLE_READY = True
        return True
    except Exception as exc:
        # The application can still serve public pages if the database is
        # temporarily unavailable; auth endpoints report the real issue.
        print("Local auth table setup failed:", type(exc).__name__)
        return False


_LOCAL_AUTH_TABLE_READY = False


def local_user_by_email(email):
    if not ensure_local_auth_table():
        return None
    try:
        conn = get_local_auth_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM auth_users WHERE LOWER(email)=LOWER(%s)", (email,))
        row = cur.fetchone()
        conn.close()
        return local_user_to_auth_user(row)
    except Exception:
        return None


def local_user_by_id(user_id):
    if not ensure_local_auth_table():
        return None
    try:
        conn = get_local_auth_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM auth_users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        return local_user_to_auth_user(row)
    except Exception:
        return None


def create_local_token(user):
    if not LOCAL_AUTH_SECRET:
        raise RuntimeError("Local authentication is not configured.")
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "exp": int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60),
    }
    encoded = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        LOCAL_AUTH_SECRET.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256
    ).digest()
    return "local." + encoded + "." + _b64url_encode(signature)


def local_user_from_token(token):
    try:
        if not LOCAL_AUTH_SECRET:
            return None
        prefix, encoded, signature = token.split(".", 2)
        if prefix != "local":
            return None
        expected = hmac.new(
            LOCAL_AUTH_SECRET.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_b64url_encode(expected), signature):
            return None
        payload = json.loads(_b64url_decode(encoded).decode("utf-8"))
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return local_user_by_id(payload.get("sub", ""))
    except Exception:
        return None


def local_register(email, password, full_name):
    email = email.strip().lower()
    if not LOCAL_AUTH_SECRET:
        return None, (jsonify({"error": "Account sign-in is not configured."}), 503)
    if not ensure_local_auth_table():
        return None, (
            jsonify({"error": "Account storage is temporarily unavailable. Please try again."}),
            503,
        )
    if len(password) < 8:
        return None, (jsonify({"error": "Password must be at least 8 characters."}), 400)
    if local_user_by_email(email):
        return None, (
            jsonify({"error": "An account with this email already exists. Please log in."}),
            409,
        )
    user_id = str(uuid.uuid4())
    try:
        conn = get_local_auth_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO auth_users (id, email, password_hash, full_name)
            VALUES (%s, %s, %s, %s)
            RETURNING id, email, full_name, created_at
            """,
            (user_id, email, local_password_hash(password), full_name.strip()),
        )
        row = cur.fetchone()
        conn.close()
    except psycopg2.IntegrityError:
        return None, (
            jsonify({"error": "An account with this email already exists. Please log in."}),
            409,
        )
    except Exception:
        return None, (
            jsonify({"error": "Could not create your account right now. Please try again."}),
            503,
        )

    user = local_user_to_auth_user(
        {"id": row[0], "email": row[1], "full_name": row[2], "created_at": row[3]}
    )
    ensure_profile(user["id"], user["email"], full_name)
    return user, None


def local_login(email, password):
    user = local_user_by_email(email.strip().lower())
    if user and local_password_matches(password, _local_password_hash_for(user["id"])):
        return user
    return None


def _local_password_hash_for(user_id):
    try:
        conn = get_local_auth_db()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM auth_users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else ""
    except Exception:
        return ""


ensure_local_auth_table()


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
    return html_content.replace("<head>", '<head><script src="/auth-session.js"></script>' + AUTH_GUARD_SCRIPT, 1)


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
@app.route("/login.html")
def login_page():
    resp = make_response(send_file("Login.html"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@app.route("/register")
@app.route("/register.html")
def register_page():
    resp = make_response(send_file("Register.html"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@app.route("/forgot-password")
@app.route("/forgotpassword.html")
def forgot_password_page():
    return send_file("ForgotPassword.html")


@app.route("/reset-password")
@app.route("/resetpassword.html")
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
    if filename.startswith("programs/"):
        return redirect("/Register.html?from_program=1")

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
    provider = (request.args.get("provider") or "").lower()
    if provider not in SUPPORTED_OAUTH_PROVIDERS:
        return jsonify({"error": f"Unsupported provider: {provider}"}), 400
    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({
            "error": f"{provider.capitalize()} sign-in is not configured yet. Please use email sign-in."
        }), 503

    redirect_to = request.args.get("redirect_to") or (
        request.host_url.rstrip("/") + "/auth/callback"
    )
    parsed_redirect = urllib.parse.urlparse(redirect_to)
    request_hostname = urllib.parse.urlparse(request.host_url).hostname or ""
    same_callback_host = parsed_redirect.netloc.lower() == request.host.lower()
    # Replit's HTTPS port preview can omit the external port in the forwarded
    # Host header. Allow only port 5000 on that exact preview hostname.
    preview_port = (
        request_hostname.endswith(".replit.dev")
        and parsed_redirect.hostname == request_hostname
        and parsed_redirect.netloc.lower() == request_hostname.lower() + ":5000"
    )
    if (
        parsed_redirect.scheme not in ("http", "https")
        or not (same_callback_host or preview_port)
        or parsed_redirect.path != "/auth/callback"
        or parsed_redirect.username or parsed_redirect.password
        or parsed_redirect.fragment
    ):
        return jsonify({"error": "Google sign-in must return to this site's authentication callback."}), 400

    return_to = urllib.parse.parse_qs(parsed_redirect.query).get("from_url", ["/"])[0]
    parsed_return = urllib.parse.urlparse(return_to)
    if (
        parsed_return.scheme
        or parsed_return.netloc
        or not return_to.startswith("/")
        or return_to.startswith("//")
        or "\\" in return_to
    ):
        return jsonify({"error": "Google sign-in has an invalid return page."}), 400

    settings_status, settings = supabase_auth("GET", "/auth/v1/settings")
    if settings_status != 200 or not isinstance(settings, dict):
        return jsonify({
            "error": f"{provider.capitalize()} sign-in is temporarily unavailable. Please use email sign-in."
        }), 503
    if not (settings.get("external") or {}).get(provider):
        return jsonify({
            "error": f"{provider.capitalize()} sign-in is not enabled yet. Enable it in Supabase Auth settings, then try again."
        }), 400

    url = (
        f"{SUPABASE_URL.rstrip('/')}/auth/v1/authorize"
        f"?provider={urllib.parse.quote(provider, safe='')}"
        f"&redirect_to={urllib.parse.quote(redirect_to, safe='')}"
    )
    challenge = request.args.get("code_challenge")
    if challenge:
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", challenge):
            return jsonify({"error": "Invalid sign-in challenge. Please start again."}), 400
        url += "&code_challenge=" + challenge + "&code_challenge_method=s256"
    return jsonify({"url": url})


@app.route("/api/oauth/session", methods=["POST"])
def oauth_session():
    """Exchange a browser-owned PKCE code or refresh the same provider account."""
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid sign-in request."}), 400
    if body.get("code"):
        verifier = body.get("code_verifier", "")
        if not isinstance(verifier, str) or not re.fullmatch(r"[A-Za-z0-9._~-]{43,128}", verifier):
            return jsonify({"error": "Sign-in expired. Please start again in this browser."}), 400
        grant = "pkce"
        payload = {"auth_code": body["code"], "code_verifier": verifier}
    elif isinstance(body.get("refresh_token"), str) and body["refresh_token"]:
        grant = "refresh_token"
        payload = {"refresh_token": body["refresh_token"]}
    else:
        return jsonify({"error": "Sign-in expired. Please start again."}), 400
    status, data = supabase_auth("POST", "/auth/v1/token?grant_type=" + grant, payload)
    if status != 200 or not isinstance(data, dict) or not data.get("access_token") or not data.get("refresh_token"):
        return jsonify({"error": (
            "Sign-in is temporarily unavailable. Your saved plan is unchanged. Please try again."
            if status >= 500 or status in (200, 429) else
            "This sign-in has expired or was already used. Please sign in again."
        )}), (503 if status >= 500 or status == 200 else 429 if status == 429 else 401)
    user = data.get("user") or {}
    if not isinstance(user, dict) or not user.get("id"):
        return jsonify({"error": "The sign-in service returned an incomplete session."}), 503
    # Preserve the provider UUID; never merge users based only on an email match.
    ensure_profile(user["id"], user.get("email", ""),
                   (user.get("user_metadata") or {}).get("full_name", ""))
    response = jsonify({key: data.get(key) for key in (
        "access_token", "refresh_token", "expires_in", "expires_at"
    )})
    response.headers["Cache-Control"] = "no-store"
    return response


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
    providers = ["email"]
    if SUPABASE_URL and SUPABASE_KEY:
        oauth_status, auth_settings = supabase_auth("GET", "/auth/v1/settings")
        if (
            oauth_status == 200
            and isinstance(auth_settings, dict)
            and (auth_settings.get("external") or {}).get("google")
        ):
            providers.append("google")
    return jsonify({
        "id": app_id,
        "name": "ALEFIT",
        "app_base_url": "",          # tells SPA to redirect to /Login.html etc. on THIS server
        "auth": {
            "enabled": True,
            "providers": providers,
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

@app.route("/apps/<app_id>/scan-food", methods=["POST"])
def alias_scan_food(app_id):
    return scan_food(app_id)

# ---------------------------------------------------------------------------
# Auth endpoints (proxy to Supabase)
# ---------------------------------------------------------------------------

@app.route("/api/apps/<app_id>/auth/register", methods=["POST"])
def auth_register(app_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Please submit a valid account form."}), 400
    email_value = body.get("email")
    password_value = body.get("password")
    name_value = body.get("full_name") or body.get("name")
    email = email_value.strip().lower() if isinstance(email_value, str) else ""
    password = password_value if isinstance(password_value, str) else ""
    full_name = name_value.strip() if isinstance(name_value, str) else ""

    if not full_name or len(full_name) < 2:
        return jsonify({"error": "Please enter your full name."}), 400
    if len(full_name) > 80:
        return jsonify({"error": "Full name must be 80 characters or fewer."}), 400
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(email) > 254:
        return jsonify({"error": "Email address is too long."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if len(password) > 128:
        return jsonify({"error": "Password must be 128 characters or fewer."}), 400

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
            return jsonify({
                "account_created": True,
                "message": "Your account is ready. Sign in to save your plan.",
            }), 202
        err = data.get("msg") or data.get("message") or data.get("error") or "Registration failed"
        # Handle duplicate email
        if "already" in str(err).lower() or status == 422:
            return jsonify({"error": "An account with this email already exists. Please log in."}), 409
        if status == 503:
            user, error = local_register(email, password, full_name)
            if error:
                return error
            return jsonify({
                "access_token": create_local_token(user),
                "user": format_user(user),
            }), 201
        return jsonify({"error": err}), status

    # Fallback: regular signup (may require email confirmation)
    callback_url = request.host_url.rstrip("/") + "/auth/callback?from_url=%2FRegister.html"
    signup_path = "/auth/v1/signup?redirect_to=" + urllib.parse.quote(callback_url, safe="")
    status, data = supabase_auth("POST", signup_path, {
        "email": email,
        "password": password,
        "data": {"full_name": full_name},
    })

    if status in (200, 201):
        if not data.get("access_token"):
            # Supabase email confirmation is a successful account-creation
            # state, not a failed registration. The browser keeps the plan
            # draft while the user confirms and signs in.
            user = data.get("user") or (data if data.get("id") else {})
            ensure_profile(user.get("id"), email, full_name)
            return jsonify({
                "confirmation_required": True,
                "message": "Your account was created. Confirm your email to return to your plan.",
            }), 202
        user = data.get("user", {})
        ensure_profile(user.get("id"), email, full_name)
        return jsonify({"access_token": data["access_token"], "user": format_user(user)}), 201

    if status == 503:
        user, error = local_register(email, password, full_name)
        if error:
            return error
        return jsonify({
            "access_token": create_local_token(user),
            "user": format_user(user),
        }), 201

    err = data.get("msg") or data.get("message") or data.get("error") or "Registration failed"
    if status in (409, 422) or "already" in str(err).lower():
        return jsonify({"error": "An account with this email already exists. Please log in."}), 409
    return jsonify({"error": err}), status


@app.route("/api/apps/<app_id>/auth/login", methods=["POST"])
def auth_login(app_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Please submit a valid sign-in form."}), 400
    email_value = body.get("email")
    password_value = body.get("password")
    email = email_value.strip().lower() if isinstance(email_value, str) else ""
    password = password_value if isinstance(password_value, str) else ""

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if not password:
        return jsonify({"error": "Please enter your password."}), 400

    # Prefer accounts created in ALEFIT's local auth store. This keeps sign-in
    # immediate and reliable when the optional remote auth service is offline.
    local_user_record = local_user_by_email(email)
    local_user = local_login(email, password)
    if local_user:
        if not LOCAL_AUTH_SECRET:
            return jsonify({"error": "Local sign-in is not configured. Please contact support."}), 503
        ensure_profile(local_user["id"], local_user["email"], format_user(local_user)["full_name"])
        return jsonify({
            "access_token": create_local_token(local_user),
            "user": format_user(local_user),
        })
    if local_user_record:
        return jsonify({"error": "Invalid email or password."}), 401

    status, data = supabase_auth("POST", "/auth/v1/token?grant_type=password", {
        "email": email,
        "password": password,
    })

    if not isinstance(data, dict):
        data = {}

    if status == 200:
        access_token = data.get("access_token")
        user = data.get("user")
        if (
            not isinstance(access_token, str)
            or not access_token
            or not isinstance(user, dict)
            or not isinstance(user.get("id"), str)
            or not user["id"].strip()
        ):
            app.logger.warning("Supabase Auth login returned an incomplete success response.")
            return jsonify({
                "error": "Sign-in could not be completed. Please try again."
            }), 503
        ensure_profile(user.get("id"), email)
        return jsonify({"access_token": access_token, "user": format_user(user)})

    if status == 429:
        return jsonify({
            "error": "Too many sign-in attempts. Please wait a moment and try again."
        }), 429
    if status == 503:
        return jsonify({
            "error": "Sign-in is temporarily unavailable. Please try again in a moment."
        }), 503
    if isinstance(status, int) and status >= 500:
        app.logger.warning("Supabase Auth login returned HTTP %s.", status)
        return jsonify({
            "error": "Sign-in is temporarily unavailable. Please try again in a moment."
        }), 503

    provider_error = " ".join(
        str(data.get(key) or "")
        for key in ("code", "error_code", "error", "message", "msg", "error_description")
    ).lower()
    if "email_not_confirmed" in provider_error or "email not confirmed" in provider_error:
        return jsonify({
            "error": "Please confirm your email before signing in. Check your inbox for a confirmation link."
        }), 403
    if status in (400, 401, 403, 422):
        return jsonify({"error": "Invalid email or password."}), 401

    app.logger.warning("Supabase Auth login returned unexpected HTTP status %s.", status)
    return jsonify({
        "error": "Sign-in is temporarily unavailable. Please try again in a moment."
    }), 503


@app.route("/api/apps/<app_id>/auth/reset-password-request", methods=["POST"])
def auth_reset_request(app_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Please enter a valid email address."}), 400
    email_value = body.get("email")
    email = email_value.strip().lower() if isinstance(email_value, str) else ""
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(email) > 254:
        return jsonify({"error": "Email address is too long."}), 400

    # Use the current site host, not a caller-supplied Origin, for recovery links.
    origin = request.host_url.rstrip("/")
    redirect_to = f"{origin}/ResetPassword.html"
    recover_path = "/auth/v1/recover?redirect_to=" + urllib.parse.quote(
        redirect_to, safe=""
    )
    status, data = supabase_auth(
        "POST",
        recover_path,
        {"email": email},
    )
    if status == 200 and isinstance(data, dict):
        return jsonify({"message": "If this email exists, a reset link has been sent."})
    if status == 200:
        app.logger.warning("Password reset request returned an incomplete success response.")
        return jsonify({
            "error": "Password recovery is temporarily unavailable. Please try again later."
        }), 503
    if status == 429:
        return jsonify({
            "error": "Too many password reset requests. Please wait and try again."
        }), 429
    app.logger.warning("Password reset request failed with HTTP status %s.", status)
    return jsonify({
        "error": "Password recovery is temporarily unavailable. Please try again later."
    }), 503


@app.route("/api/apps/<app_id>/auth/reset-password", methods=["POST"])
def auth_reset_password(app_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Please submit a valid password reset form."}), 400
    token = body.get("reset_token")
    new_password = body.get("new_password")
    if not isinstance(token, str) or not token.strip():
        return jsonify({"error": "This reset link is invalid or has expired."}), 400
    token = token.strip()
    if not isinstance(new_password, str) or len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if len(new_password) > 128:
        return jsonify({"error": "Password must be 128 characters or fewer."}), 400
    status, data = supabase_auth("PUT", "/auth/v1/user", {"password": new_password}, token=token)
    if status == 200 and isinstance(data, dict):
        return jsonify({"message": "Password updated successfully"})
    if status == 200:
        app.logger.warning("Password reset completion returned an incomplete success response.")
        return jsonify({
            "error": "Password recovery is temporarily unavailable. Please try again later."
        }), 503
    if status == 429:
        return jsonify({
            "error": "Too many password reset attempts. Please wait and try again."
        }), 429
    if status in (400, 401, 403, 404, 422):
        return jsonify({"error": "This reset link is invalid or has expired."}), 400
    app.logger.warning("Password reset completion failed with HTTP status %s.", status)
    return jsonify({
        "error": "Password recovery is temporarily unavailable. Please try again later."
    }), 503


@app.route("/api/apps/<app_id>/auth/change-password", methods=["POST"])
def auth_change_password(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    body = request.get_json(force=True) or {}
    new_password = body.get("new_password") or ""
    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if user.get("_local"):
        try:
            conn = get_local_auth_db()
            cur = conn.cursor()
            cur.execute(
                "UPDATE auth_users SET password_hash=%s, updated_at=NOW() WHERE id=%s",
                (local_password_hash(new_password), user["id"]),
            )
            conn.close()
            return jsonify({"message": "Password changed successfully"})
        except Exception:
            return jsonify({"error": "Failed to change password"}), 400
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


AVATAR_BUCKET = "alefit-profile-avatars"
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def supabase_storage_request(method, path, token, body=None, content_type=None):
    """Make a Storage API request with the current athlete's access scope."""
    if not SUPABASE_URL:
        return 503, {}

    api_key = SUPABASE_KEY
    bearer = token or ""
    if bearer.startswith("local."):
        # Local fallback accounts are not Supabase JWTs. Use the server-only
        # service key only after this route has independently authenticated them.
        if not SUPABASE_SERVICE_KEY:
            return 503, {}
        api_key = SUPABASE_SERVICE_KEY
        bearer = SUPABASE_SERVICE_KEY
    if not api_key or not bearer:
        return 503, {}

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {bearer}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = content_type or "application/octet-stream"
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL.rstrip('/')}/storage/v1{path}",
            data=body,
            headers=headers,
            method=method,
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read()
            try:
                data = json.loads(raw.decode("utf-8")) if raw else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                data = {}
            return response.status, data if isinstance(data, dict) else {}
    except urllib.error.HTTPError as error:
        # Do not log provider response bodies; they can contain sensitive details.
        app.logger.warning("Supabase Storage returned HTTP %s.", error.code)
        return error.code, {}
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        reason = getattr(error, "reason", None)
        category = type(reason).__name__ if reason is not None else type(error).__name__
        app.logger.warning("Supabase Storage connection failed (%s).", category)
        return 503, {}


def _profile_avatar_url(user_id, stored_value, token):
    if not isinstance(stored_value, str) or not stored_value:
        return ""
    if not stored_value.startswith("storage://"):
        # Keep compatibility with older, locally saved avatar paths.
        return stored_value

    object_name = stored_value[len("storage://"):]
    parts = object_name.split("/")
    if (
        len(parts) != 2
        or parts[0] != str(user_id)
        or not re.fullmatch(r"[a-f0-9-]{36}\.(?:jpg|png|webp)", parts[1], re.IGNORECASE)
    ):
        return ""
    quoted_name = urllib.parse.quote(object_name, safe="/")
    status, data = supabase_storage_request(
        "POST",
        f"/object/sign/{AVATAR_BUCKET}/{quoted_name}",
        token,
        body=json.dumps({"expiresIn": 3600}).encode("utf-8"),
        content_type="application/json",
    )
    signed_url = data.get("signedURL") or data.get("signedUrl")
    if status != 200 or not isinstance(signed_url, str) or not signed_url:
        return ""
    if signed_url.startswith(("https://", "http://")):
        return signed_url
    if signed_url.startswith("/storage/v1/"):
        return f"{SUPABASE_URL.rstrip('/')}{signed_url}"
    return f"{SUPABASE_URL.rstrip('/')}/storage/v1/{signed_url.lstrip('/')}"


def _remove_profile_avatar(token, object_name):
    return supabase_storage_request(
        "DELETE",
        f"/object/{AVATAR_BUCKET}",
        token,
        body=json.dumps({"prefixes": [object_name]}).encode("utf-8"),
        content_type="application/json",
    )


def get_profile_extras(user_id, token=None):
    """Return bio, a displayable avatar URL, and goals from the profiles table."""
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT bio, avatar_url, daily_calorie_goal FROM profiles WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "bio": row["bio"] or "",
                "avatar_url": _profile_avatar_url(user_id, row["avatar_url"], token),
                "daily_calorie_goal": row["daily_calorie_goal"] or 2000,
            }
    except Exception:
        pass
    return {"bio": "", "avatar_url": "", "daily_calorie_goal": 2000}


@app.route("/api/apps/<app_id>/auth/me", methods=["GET"])
def auth_me(app_id):
    user, token, auth_status = get_current_user_with_status()
    if not user:
        if auth_status == 429:
            return jsonify({
                "error": "Sign-in verification is temporarily rate limited. Please try again."
            }), 429
        if auth_status == 503 or (isinstance(auth_status, int) and auth_status >= 500):
            return jsonify({
                "error": "Sign-in verification is temporarily unavailable. Please try again."
            }), 503
        return jsonify({"error": "Unauthorized"}), 401
    result = format_user(user)
    ensure_profile(result["id"], result["email"], result["full_name"])
    result.update(get_profile_extras(user["id"], token))
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

    if full_name is not None and not user.get("_local"):
        supabase_auth("PUT", "/auth/v1/user", {"data": {"full_name": full_name}}, token=token)

    if full_name is not None and user.get("_local"):
        try:
            conn = get_local_auth_db()
            cur = conn.cursor()
            cur.execute(
                "UPDATE auth_users SET full_name=%s, updated_at=NOW() WHERE id=%s",
                (full_name, user["id"]),
            )
            conn.close()
        except Exception:
            pass

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
    result.update(get_profile_extras(user["id"], token))
    return jsonify(result)


@app.route("/api/apps/<app_id>/auth/avatar", methods=["POST"])
def auth_avatar(app_id):
    user, token = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f or f.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if token and token.startswith("local.") and not SUPABASE_SERVICE_KEY:
        return jsonify({"error": "Photo storage is not enabled for this account type yet."}), 503

    if request.content_length and request.content_length > MAX_AVATAR_BYTES + 65536:
        return jsonify({"error": "Choose a photo smaller than 2 MB."}), 413
    image_bytes = f.stream.read(MAX_AVATAR_BYTES + 1)
    if len(image_bytes) > MAX_AVATAR_BYTES:
        return jsonify({"error": "Choose a photo smaller than 2 MB."}), 413
    if not image_bytes:
        return jsonify({"error": "The selected photo is empty."}), 400

    if image_bytes.startswith(b"\xff\xd8\xff"):
        extension, content_type = "jpg", "image/jpeg"
    elif image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        extension, content_type = "png", "image/png"
    elif image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        extension, content_type = "webp", "image/webp"
    else:
        return jsonify({"error": "Use a valid JPG, PNG, or WebP image."}), 415

    user_id = str(user["id"])
    object_name = f"{user_id}/{uuid.uuid4()}.{extension}"
    quoted_name = urllib.parse.quote(object_name, safe="/")
    upload_status, _upload_data = supabase_storage_request(
        "POST",
        f"/object/{AVATAR_BUCKET}/{quoted_name}",
        token,
        body=image_bytes,
        content_type=content_type,
    )
    if upload_status not in (200, 201):
        if upload_status == 403:
            return jsonify({"error": "Photo storage access is not configured for this account yet."}), 503
        return jsonify({"error": "Your photo could not be uploaded. Please try again."}), 503

    old_avatar = ""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT avatar_url FROM profiles WHERE id=%s", (user_id,))
        old_row = cur.fetchone()
        old_avatar = old_row[0] if old_row else ""
        cur.execute(
            "UPDATE profiles SET avatar_url=%s, updated_at=NOW() WHERE id=%s",
            (f"storage://{object_name}", user_id),
        )
        if cur.rowcount != 1:
            raise RuntimeError("Profile row is unavailable.")
        conn.close()
    except Exception:
        try:
            if conn:
                conn.close()
        except Exception:
            pass
        _remove_profile_avatar(token, object_name)
        app.logger.warning("Profile photo could not be saved to the profile record.")
        return jsonify({"error": "Your photo uploaded, but the profile could not be updated. Please retry."}), 503

    old_path = old_avatar[len("storage://"):] if isinstance(old_avatar, str) and old_avatar.startswith("storage://") else ""
    old_parts = old_path.split("/")
    if (
        len(old_parts) == 2
        and old_parts[0] == user_id
        and re.fullmatch(r"[a-f0-9-]{36}\.(?:jpg|png|webp)", old_parts[1], re.IGNORECASE)
        and old_path != object_name
    ):
        _remove_profile_avatar(token, old_path)

    display_url = _profile_avatar_url(user_id, f"storage://{object_name}", token)
    if not display_url:
        return jsonify({"error": "The photo was saved, but its preview could not be prepared. Refresh the page to see it."}), 503
    return jsonify({"avatar_url": display_url})


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
# Generic entity CRUD — stored in Supabase Postgres
# ---------------------------------------------------------------------------

def require_auth():
    user, token = get_current_user()
    if not user:
        return None, None, (jsonify({"error": "Unauthorized"}), 401)
    return user, token, None


def ensure_onboarding_plan_index():
    """Guarantee atomic idempotency for onboarding retries."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """CREATE UNIQUE INDEX IF NOT EXISTS entities_onboarding_session_unique
               ON entities (user_id, ((data->>'onboarding_id')))
               WHERE entity_type='OnboardingPlan' AND data ? 'onboarding_id'"""
        )
        conn.close()
    except Exception:
        pass


def ensure_workout_log_index():
    """Guarantee one workout log per owner-bound feedback identifier."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """CREATE UNIQUE INDEX IF NOT EXISTS entities_workout_feedback_unique
               ON entities (user_id, ((data->>'feedback_id')))
               WHERE entity_type='WorkoutLog' AND data ? 'feedback_id'"""
        )
        conn.close()
    except Exception:
        pass


ensure_onboarding_plan_index()
ensure_workout_log_index()


@app.route("/api/apps/<app_id>/onboarding-plan", methods=["POST"])
def save_onboarding_plan(app_id):
    """Idempotently save the exact plan reviewed during onboarding."""
    user, token, err = require_auth()
    if err:
        return err

    body = request.get_json(force=True) or {}
    onboarding_id = str(body.get("onboarding_id") or "").strip()
    replace_id = str(body.get("replace_id") or "").strip()
    preferences = body.get("preferences")
    plan = body.get("generated_plan")

    if not onboarding_id or len(onboarding_id) > 100:
        return jsonify({"error": "Invalid onboarding session."}), 400
    if not isinstance(preferences, dict) or not isinstance(plan, dict):
        return jsonify({"error": "Preferences and generated plan are required."}), 400
    if len(json.dumps({"preferences": preferences, "generated_plan": plan})) > 50000:
        return jsonify({"error": "Onboarding plan is too large."}), 413

    allowed_sports = {
        "basketball", "football", "soccer", "baseball", "swimming", "track",
        "running", "cross-country", "volleyball", "tennis", "rugby", "lacrosse",
        "hockey", "golf", "cycling", "rowing", "combat-sports", "strength",
        "hiit", "crossfit", "mobility", "general",
    }
    allowed_paths = {
        "/programs/baseball.html", "/programs/basketball.html",
        "/programs/crosscountry.html", "/programs/football.html",
        "/programs/hiit.html", "/programs/mobility.html",
        "/programs/soccer.html", "/programs/strength.html",
        "/programs/swimming.html", "/programs/track.html", "/my-plan.html",
    }
    if preferences.get("sport") not in allowed_sports:
        return jsonify({"error": "Choose a supported training focus."}), 400
    if plan.get("path") not in allowed_paths:
        return jsonify({"error": "Generated plan contains an invalid program path."}), 400

    stored = {
        "onboarding_id": onboarding_id,
        "preferences": preferences,
        "generated_plan": plan,
    }
    try:
        conn = get_db()
        cur = conn.cursor()
        if replace_id:
            cur.execute(
                """UPDATE entities SET data=%s, updated_at=NOW()
                   WHERE id=%s AND user_id=%s AND entity_type='OnboardingPlan'
                   RETURNING id, created_at, updated_at""",
                (json.dumps(stored), replace_id, user["id"]),
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return jsonify({"error": "The existing plan could not be found."}), 404
            status = 200
        else:
            entity_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO entities (id, user_id, entity_type, data)
                   VALUES (%s, %s, 'OnboardingPlan', %s)
                   ON CONFLICT (user_id, ((data->>'onboarding_id')))
                     WHERE entity_type='OnboardingPlan' AND data ? 'onboarding_id'
                   DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
                   RETURNING id, created_at, updated_at""",
                (entity_id, user["id"], json.dumps(stored)),
            )
            row = cur.fetchone()
            status = 200
        conn.close()
    except Exception:
        return jsonify({"error": "Could not save your plan right now. Please retry."}), 503

    stored["id"] = row[0]
    stored["created_date"] = row[1].isoformat() if row[1] else ""
    stored["updated_date"] = row[2].isoformat() if row[2] else ""
    return jsonify(stored), status


@app.route("/api/apps/<app_id>/workout-log", methods=["POST"])
def save_workout_log(app_id):
    """Idempotently store an immutable completed-session snapshot."""
    user, token, err = require_auth()
    if err:
        return err

    body = request.get_json(force=True) or {}
    feedback_id = str(body.get("feedback_id") or "").strip()
    session_snapshot = body.get("session_snapshot")
    feedback = body.get("feedback")
    if not feedback_id or len(feedback_id) > 180:
        return jsonify({"error": "A valid feedback identifier is required."}), 400
    if not isinstance(session_snapshot, dict) or not isinstance(feedback, dict):
        return jsonify({"error": "Session snapshot and feedback are required."}), 400

    stored = {
        "feedback_id": feedback_id,
        "session_snapshot": session_snapshot,
        "feedback": feedback,
    }
    try:
        conn = get_db()
        cur = conn.cursor()
        entity_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO entities (id, user_id, entity_type, data)
               VALUES (%s, %s, 'WorkoutLog', %s)
               ON CONFLICT (user_id, ((data->>'feedback_id')))
                 WHERE entity_type='WorkoutLog' AND data ? 'feedback_id'
               DO NOTHING
               RETURNING id, created_at, updated_at""",
            (entity_id, user["id"], json.dumps(stored)),
        )
        row = cur.fetchone()
        created = bool(row)
        if not row:
            cur.execute(
                """SELECT id, created_at, updated_at
                   FROM entities
                   WHERE user_id=%s AND entity_type='WorkoutLog'
                     AND data->>'feedback_id'=%s
                   LIMIT 1""",
                (user["id"], feedback_id),
            )
            row = cur.fetchone()
        conn.close()
    except Exception:
        return jsonify({"error": "Could not save workout feedback. Please retry."}), 503

    if not row:
        return jsonify({"error": "Could not verify workout feedback."}), 503
    stored["id"] = row[0]
    stored["created"] = created
    stored["created_date"] = row[1].isoformat() if row[1] else ""
    stored["updated_date"] = row[2].isoformat() if row[2] else ""
    return jsonify(stored), 201 if created else 200


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
    if entity_type == "WorkoutLog":
        return jsonify({"error": "Workout logs are immutable. Use the workout feedback endpoint."}), 405

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
    if entity_type == "WorkoutLog":
        return jsonify({"error": "Completed workout snapshots cannot be changed."}), 405

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
    if entity_type == "WorkoutLog":
        return jsonify({"error": "Completed workout snapshots cannot be deleted."}), 405
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
    if entity_type == "WorkoutLog":
        return jsonify({"error": "Completed workout snapshots cannot be deleted."}), 405
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


# ---------------------------------------------------------------------------
# Food nutrition lookup (works without external API)
# ---------------------------------------------------------------------------

# Values are per 100g unless the entry is marked countable, in which case
# cal/p/c/f are per single item and item_g is the typical weight of one item.
_FOOD_DB = {
    # Proteins
    "chicken breast": {"cal": 165, "p": 31, "c": 0, "f": 3.6},
    "chicken thigh": {"cal": 209, "p": 26, "c": 0, "f": 11},
    "chicken": {"cal": 165, "p": 31, "c": 0, "f": 3.6},
    "turkey": {"cal": 135, "p": 30, "c": 0, "f": 1},
    "beef": {"cal": 250, "p": 26, "c": 0, "f": 15},
    "steak": {"cal": 271, "p": 25, "c": 0, "f": 19},
    "ground beef": {"cal": 254, "p": 26, "c": 0, "f": 17},
    "pork": {"cal": 242, "p": 27, "c": 0, "f": 14},
    "bacon": {"cal": 541, "p": 37, "c": 1.4, "f": 42},
    "salmon": {"cal": 208, "p": 20, "c": 0, "f": 13},
    "tuna": {"cal": 132, "p": 28, "c": 0, "f": 1.3},
    "cod": {"cal": 82, "p": 18, "c": 0, "f": 0.7},
    "shrimp": {"cal": 99, "p": 24, "c": 0.2, "f": 0.3},
    "tofu": {"cal": 76, "p": 8, "c": 1.9, "f": 4.8},
    "egg": {"cal": 78, "p": 6.3, "c": 0.6, "f": 5.3, "countable": True, "item_g": 50},
    "eggs": {"cal": 78, "p": 6.3, "c": 0.6, "f": 5.3, "countable": True, "item_g": 50},
    "egg white": {"cal": 17, "p": 3.6, "c": 0.2, "f": 0.1, "countable": True, "item_g": 33},
    # Dairy
    "milk": {"cal": 42, "p": 3.4, "c": 5, "f": 1},
    "whole milk": {"cal": 61, "p": 3.2, "c": 4.8, "f": 3.3},
    "greek yogurt": {"cal": 59, "p": 10, "c": 3.6, "f": 0.4},
    "yogurt": {"cal": 59, "p": 10, "c": 3.6, "f": 0.4},
    "cheese": {"cal": 402, "p": 25, "c": 1.3, "f": 33},
    "cheddar": {"cal": 402, "p": 25, "c": 1.3, "f": 33},
    "mozzarella": {"cal": 280, "p": 28, "c": 3.1, "f": 17},
    "cottage cheese": {"cal": 98, "p": 11, "c": 3.4, "f": 4.3},
    "butter": {"cal": 717, "p": 0.9, "c": 0.1, "f": 81},
    # Grains / carbs
    "rice": {"cal": 130, "p": 2.7, "c": 28, "f": 0.3},
    "white rice": {"cal": 130, "p": 2.7, "c": 28, "f": 0.3},
    "brown rice": {"cal": 112, "p": 2.6, "c": 24, "f": 0.9},
    "pasta": {"cal": 131, "p": 5, "c": 25, "f": 1.1},
    "spaghetti": {"cal": 131, "p": 5, "c": 25, "f": 1.1},
    "bread": {"cal": 79, "p": 2.7, "c": 14, "f": 1, "countable": True, "item_g": 30},
    "white bread": {"cal": 79, "p": 2.7, "c": 14, "f": 1, "countable": True, "item_g": 30},
    "whole wheat bread": {"cal": 82, "p": 4, "c": 14, "f": 1.1, "countable": True, "item_g": 32},
    "bagel": {"cal": 245, "p": 10, "c": 48, "f": 1.5, "countable": True, "item_g": 95},
    "oats": {"cal": 389, "p": 17, "c": 66, "f": 7},
    "oatmeal": {"cal": 71, "p": 2.5, "c": 12, "f": 1.5},
    "potato": {"cal": 77, "p": 2, "c": 17, "f": 0.1},
    "sweet potato": {"cal": 86, "p": 1.6, "c": 20, "f": 0.1},
    "quinoa": {"cal": 120, "p": 4.4, "c": 21, "f": 1.9},
    "cereal": {"cal": 379, "p": 8, "c": 84, "f": 4},
    "tortilla": {"cal": 218, "p": 6, "c": 36, "f": 5, "countable": True, "item_g": 49},
    # Fruits
    "banana": {"cal": 105, "p": 1.3, "c": 27, "f": 0.4, "countable": True, "item_g": 118},
    "apple": {"cal": 95, "p": 0.5, "c": 25, "f": 0.3, "countable": True, "item_g": 182},
    "orange": {"cal": 62, "p": 1.2, "c": 15, "f": 0.2, "countable": True, "item_g": 131},
    "strawberry": {"cal": 32, "p": 0.7, "c": 7.7, "f": 0.3},
    "strawberries": {"cal": 32, "p": 0.7, "c": 7.7, "f": 0.3},
    "blueberries": {"cal": 57, "p": 0.7, "c": 14, "f": 0.3},
    "grapes": {"cal": 69, "p": 0.7, "c": 18, "f": 0.2},
    "mango": {"cal": 60, "p": 0.8, "c": 15, "f": 0.4},
    "avocado": {"cal": 160, "p": 2, "c": 9, "f": 15},
    # Vegetables
    "broccoli": {"cal": 34, "p": 2.8, "c": 7, "f": 0.4},
    "spinach": {"cal": 23, "p": 2.9, "c": 3.6, "f": 0.4},
    "carrot": {"cal": 41, "p": 0.9, "c": 10, "f": 0.2},
    "tomato": {"cal": 18, "p": 0.9, "c": 3.9, "f": 0.2},
    "lettuce": {"cal": 15, "p": 1.4, "c": 2.9, "f": 0.2},
    "cucumber": {"cal": 15, "p": 0.7, "c": 3.6, "f": 0.1},
    "onion": {"cal": 40, "p": 1.1, "c": 9.3, "f": 0.1},
    "corn": {"cal": 86, "p": 3.2, "c": 19, "f": 1.2},
    "peas": {"cal": 81, "p": 5.4, "c": 14, "f": 0.4},
    "beans": {"cal": 127, "p": 8.7, "c": 23, "f": 0.5},
    "black beans": {"cal": 132, "p": 8.9, "c": 24, "f": 0.5},
    "chickpeas": {"cal": 164, "p": 8.9, "c": 27, "f": 2.6},
    "lentils": {"cal": 116, "p": 9, "c": 20, "f": 0.4},
    # Nuts / fats
    "almonds": {"cal": 579, "p": 21, "c": 22, "f": 50},
    "peanuts": {"cal": 567, "p": 26, "c": 16, "f": 49},
    "peanut butter": {"cal": 588, "p": 25, "c": 20, "f": 50},
    "walnuts": {"cal": 654, "p": 15, "c": 14, "f": 65},
    "cashews": {"cal": 553, "p": 18, "c": 30, "f": 44},
    "olive oil": {"cal": 884, "p": 0, "c": 0, "f": 100},
    # Common meals / fast food
    "pizza": {"cal": 266, "p": 11, "c": 33, "f": 10},
    "burger": {"cal": 295, "p": 17, "c": 24, "f": 14, "countable": True, "item_g": 110},
    "hamburger": {"cal": 295, "p": 17, "c": 24, "f": 14, "countable": True, "item_g": 110},
    "cheeseburger": {"cal": 303, "p": 15, "c": 26, "f": 15, "countable": True, "item_g": 115},
    "fries": {"cal": 312, "p": 3.4, "c": 41, "f": 15},
    "french fries": {"cal": 312, "p": 3.4, "c": 41, "f": 15},
    "hot dog": {"cal": 290, "p": 10, "c": 23, "f": 18, "countable": True, "item_g": 98},
    "sandwich": {"cal": 250, "p": 12, "c": 30, "f": 9},
    "salad": {"cal": 33, "p": 1.5, "c": 6, "f": 0.5},
    "sushi": {"cal": 145, "p": 5, "c": 30, "f": 0.5},
    "chocolate": {"cal": 546, "p": 4.9, "c": 61, "f": 31},
    "ice cream": {"cal": 207, "p": 3.5, "c": 24, "f": 11},
    "cookie": {"cal": 502, "p": 5.9, "c": 64, "f": 25, "countable": True, "item_g": 16},
    "donut": {"cal": 452, "p": 4.9, "c": 51, "f": 25, "countable": True, "item_g": 60},
    "protein shake": {"cal": 120, "p": 24, "c": 3, "f": 1.5},
    "protein bar": {"cal": 350, "p": 20, "c": 40, "f": 12, "countable": True, "item_g": 60},
}

# rough grams for common volumetric / imperial units
_UNIT_GRAMS = {
    "g": 1, "gram": 1, "grams": 1, "gm": 1,
    "kg": 1000, "kilogram": 1000,
    "oz": 28.35, "ounce": 28.35, "ounces": 28.35,
    "lb": 453.6, "lbs": 453.6, "pound": 453.6,
    "ml": 1, "milliliter": 1,
    "l": 1000, "liter": 1000, "litre": 1000,
    "cup": 240, "cups": 240,
    "tbsp": 15, "tablespoon": 15, "tablespoons": 15,
    "tsp": 5, "teaspoon": 5, "teaspoons": 5,
    "slice": None, "slices": None, "piece": None, "pieces": None,
}

_NUM_WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4,
              "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
              "half": 0.5, "dozen": 12}


def _lookup_food(query):
    """Estimate nutrition for a free-text food description. Returns dict or None."""
    if not query:
        return None
    q = query.strip().lower()
    q = re.sub(r"[^\w\s\./]", " ", q)
    q = re.sub(r"\s+", " ", q).strip()

    # parse quantity
    qty = None
    unit = None
    tokens = q.split()
    # number word at start
    if tokens and tokens[0] in _NUM_WORDS:
        qty = _NUM_WORDS[tokens[0]]
        tokens = tokens[1:]
    else:
        m = re.match(r"^(\d+(?:\.\d+)?)\s*([a-z]*)", q)
        if m:
            qty = float(m.group(1))
            if m.group(2):
                unit = m.group(2)
            tokens = q[m.end():].split()
    # detect a unit token if not already found
    if unit is None and tokens and tokens[0] in _UNIT_GRAMS:
        unit = tokens[0]
        tokens = tokens[1:]
    # strip filler words
    tokens = [t for t in tokens if t not in ("of", "a", "an")]
    name_part = " ".join(tokens).strip()
    if not name_part:
        name_part = q

    # find best matching food (longest key contained in the name)
    match_key = None
    for key in sorted(_FOOD_DB.keys(), key=len, reverse=True):
        if key in name_part:
            match_key = key
            break
    if not match_key:
        # try matching individual words
        for key in sorted(_FOOD_DB.keys(), key=len, reverse=True):
            if any(w == key or key.startswith(w) for w in name_part.split()):
                match_key = key
                break
    if not match_key:
        return None

    food = _FOOD_DB[match_key]
    countable = food.get("countable", False)
    item_g = food.get("item_g", 100)

    # determine grams or item count
    grams = None
    items = None
    if unit and unit in _UNIT_GRAMS:
        ug = _UNIT_GRAMS[unit]
        if ug is None:  # slice/piece -> treat as items
            items = qty or 1
        else:
            grams = (qty or 1) * ug
    elif qty is not None:
        # bare number -> items for countable foods, else servings
        if countable:
            items = qty
        else:
            grams = qty * 100 if qty <= 10 else qty  # 1 => one 100g serving
    else:
        items = 1 if countable else None
        grams = None if countable else 100

    if countable:
        if grams is not None:
            factor = grams / item_g
        else:
            factor = items if items is not None else 1
        cal = food["cal"] * factor
        p = food["p"] * factor
        c = food["c"] * factor
        f = food["f"] * factor
        display_qty = items if items is not None else round(factor, 1)
        nice_name = "%s %s" % (
            int(display_qty) if float(display_qty).is_integer() else display_qty,
            match_key,
        )
    else:
        g = grams if grams is not None else 100
        factor = g / 100.0
        cal = food["cal"] * factor
        p = food["p"] * factor
        c = food["c"] * factor
        f = food["f"] * factor
        nice_name = "%s (%dg)" % (match_key, int(round(g)))

    return {
        "name": nice_name.title(),
        "calories": round(cal),
        "protein": round(p, 1),
        "carbs": round(c, 1),
        "fat": round(f, 1),
    }


def _is_food_lookup_schema(schema):
    """True when the JSON schema describes a single food's nutrition."""
    if not isinstance(schema, dict):
        return False
    props = schema.get("properties") or {}
    keys = set(props.keys())
    return {"calories", "protein"}.issubset(keys) and "name" in keys


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
    is_food_lookup = _is_food_lookup_schema(response_json_schema)

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
                if not is_food_lookup:
                    _save_meal_plan(user["id"], result, prompt)
                return jsonify(result)
            return jsonify({"result": text})

    # --- Food nutrition lookup (single item) ---
    if is_food_lookup:
        # extract the food description from the prompt (text inside quotes if present)
        m = re.search(r'["\u201c]([^"\u201d]+)["\u201d]', prompt)
        food_query = m.group(1) if m else prompt
        result = _lookup_food(food_query)
        if not result:
            return jsonify({"error": "Could not find nutrition info for that food. Try being more specific (e.g. \"100g chicken breast\") or add it manually."}), 422
        return jsonify(result)

    # --- Server-side meal plan generation (always works, no external API needed) ---
    if want_json:
        goal, diet, meals_per_day, allergies = _parse_meal_prefs(prompt)
        result = _generate_meal_plan(goal, diet, meals_per_day, allergies)
        _save_meal_plan(user["id"], result, prompt)
        return jsonify(result)

    # Non-JSON prompt (general advice) — return a useful text response
    return jsonify({"result": _generate_advice(prompt)})


def _scan_food_openai(image_data_url):
    """Identify food from an image using OpenAI vision. Returns (dict, error)."""
    if not OPENAI_API_KEY:
        return None, "no_key"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a nutrition expert. Identify the food in the image and estimate its nutrition for the portion shown. Respond with valid JSON only: {\"name\": string, \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number}. Protein, carbs and fat are in grams. If no food is visible, set name to an empty string."},
            {"role": "user", "content": [
                {"type": "text", "text": "What food is this and what is its nutrition?"},
                {"type": "image_url", "image_url": {"url": image_data_url}},
            ]},
        ],
        "response_format": {"type": "json_object"},
    }
    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read())
        content = result["choices"][0]["message"]["content"]
        cleaned = re.sub(r"```(?:json)?|```", "", content).strip()
        return json.loads(cleaned), None
    except Exception as e:
        return None, str(e)


def _scan_food_openrouter(image_data_url):
    """Identify food using a vision-capable model from OpenRouter's free router."""
    if not OPENROUTER_API_KEY:
        return None, "no_key"
    payload = {
        "model": "openrouter/free",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a nutrition expert. Identify the food in the image and "
                    "estimate nutrition for the portion shown. Respond with valid JSON "
                    'only: {"name": string, "calories": number, "protein": number, '
                    '"carbs": number, "fat": number}. Protein, carbs and fat are in '
                    "grams. If no food is visible, set name to an empty string."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What food is this and what is its nutrition?"},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            },
        ],
        "temperature": 0.2,
        "max_tokens": 400,
    }
    try:
        last_error = None
        for attempt in range(2):
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode(),
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": "AleFit",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                raw = resp.read().decode("utf-8", "replace").strip()
            try:
                result = json.loads(raw)
                content = result["choices"][0]["message"]["content"] or ""
                cleaned = re.sub(r"```(?:json)?|```", "", content).strip()
                start, end = cleaned.find("{"), cleaned.rfind("}")
                if start >= 0 and end >= start:
                    return json.loads(cleaned[start:end + 1]), None
                last_error = "The vision model returned an empty result."
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                last_error = f"Invalid vision response: {type(exc).__name__}"
            if attempt == 0:
                continue
        return None, last_error or "The vision model returned an invalid result."
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read()).get("error", {}).get("message", "")
        except Exception:
            detail = ""
        return None, f"OpenRouter vision service error ({e.code}){': ' + detail if detail else ''}"
    except Exception as e:
        return None, str(e)


@app.route("/api/apps/<app_id>/scan-food", methods=["POST"])
def scan_food(app_id):
    user, token, err = require_auth()
    if err:
        return err

    data = request.get_json(force=True) or {}
    image = data.get("image", "")
    if not image or not image.startswith("data:image"):
        return jsonify({"error": "No valid image provided."}), 400

    if len(image) > 12 * 1024 * 1024:
        return jsonify({"error": "That image is too large. Please choose a smaller photo."}), 413

    image_type = image.split(";", 1)[0].lower()
    if image_type not in {"data:image/jpeg", "data:image/png", "data:image/webp"}:
        return jsonify({"error": "Please upload a JPG, PNG, or WebP image."}), 400

    if not OPENROUTER_API_KEY and not OPENAI_API_KEY:
        return jsonify({"error": "Photo scanning needs the AI vision service to be configured. In the meantime, use the AI Lookup or manual entry below."}), 503

    # OpenRouter's free vision router is primary and does not require an
    # end-user account. Only use the older OpenAI path when it is not configured
    # so a free-tier rate limit never causes unexpected paid-provider usage.
    result, scan_err = _scan_food_openrouter(image)
    if scan_err and scan_err != "no_key" and not result:
        print("OpenRouter food scan failed:", scan_err)
    if not OPENROUTER_API_KEY and OPENAI_API_KEY:
        result, scan_err = _scan_food_openai(image)
    if scan_err or not result or not result.get("name"):
        return jsonify({"error": "Could not identify food in the photo. Try a clearer, well-lit photo or use AI Lookup instead."}), 422

    return jsonify({
        "name": result.get("name", ""),
        "calories": round(float(result.get("calories") or 0)),
        "protein": round(float(result.get("protein") or 0), 1),
        "carbs": round(float(result.get("carbs") or 0), 1),
        "fat": round(float(result.get("fat") or 0), 1),
    })


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
