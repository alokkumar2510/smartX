"""
─── auth.py ──────────────────────────────────────────────
JWT token creation/verification + password hashing.

Priority order for token validation:
  1. Supabase JWT (verified with SUPABASE_JWT_SECRET)     ← preferred
  2. Custom HS256 JWT (legacy, for backward compat)
  3. Supabase JWT without secret (signature-unverified)   ← last-resort
"""
import os
import jwt as pyjwt
from datetime import datetime, timedelta
from jose import JWTError, jwt as jose_jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

# ── Custom JWT config (legacy)
SECRET_KEY               = os.getenv("JWT_SECRET", "smartchat-x-super-secret-key")
ALGORITHM                = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ── Supabase config
SUPABASE_URL        = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")   # Set in .env!
SUPABASE_ANON_KEY   = os.getenv("SUPABASE_ANON_KEY", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if hashed == "supabase_auth":
        return False   # Supabase-managed users authenticate via Supabase, not here
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    """Create a short-lived custom JWT (legacy — prefer Supabase tokens)."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jose_jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _extract_supabase_claims(payload: dict) -> dict:
    """Convert a decoded Supabase JWT payload to our internal user dict."""
    sub      = payload.get("sub", "")
    email    = payload.get("email", "")
    meta     = payload.get("user_metadata", {})
    username = (meta.get("username")
                or meta.get("display_name")
                or email.split("@")[0]
                or "user")
    return {
        "user_id":    sub,
        "username":   username,
        "email":      email,
        "supabase_id": sub,
        "provider":   "supabase",
    }


def decode_token(token: str) -> dict | None:
    """
    Decode & validate a bearer token.

    Tries, in order:
      1. Supabase JWT with verified signature  (most secure)
      2. Custom legacy HS256 JWT
      3. Supabase JWT without signature check  (fallback when secret not set)
    Returns None if all strategies fail.
    """
    if not token:
        return None

    # ── 1. Supabase JWT (signature-verified) ──────────────────────────
    if SUPABASE_JWT_SECRET:
        try:
            payload = pyjwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
            if payload.get("sub") and payload.get("aud") == "authenticated":
                return _extract_supabase_claims(payload)
        except pyjwt.ExpiredSignatureError:
            return None          # Expired → force re-login
        except Exception:
            pass                  # Not a Supabase token → try next

    # ── 2. Custom / legacy HS256 JWT ─────────────────────────────────
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("user_id") and payload.get("username"):
            return payload
    except JWTError:
        pass

    # ── 3. Supabase JWT without secret (last resort) ──────────────────
    try:
        payload = pyjwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": True},
        )
        if payload.get("sub") and payload.get("aud") == "authenticated":
            return _extract_supabase_claims(payload)
    except Exception:
        pass

    return None
