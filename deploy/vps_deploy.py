"""
Deploy Yousuf Keyhan MIS to VPS http://157.180.86.19:9060

Uses existing PostgreSQL database `rice_management` (data preserved).
Public nginx :9060  →  Nest API on 127.0.0.1:9061

Usage:
  python deploy/vps_deploy.py

Optional override (password auth fallback):
  $env:VPS_PASSWORD = "..."
"""
from __future__ import annotations

import io
import os
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Install paramiko: pip install paramiko")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("VPS_HOST", "157.180.86.19")
USER = os.environ.get("VPS_USER", "root")
PASSWORD = os.environ.get("VPS_PASSWORD", "")
REMOTE = "/var/www/yousuf-keyhan-mis"
PUBLIC_PORT = "9060"
API_PORT = "9061"
SERVICE = "yousuf-keyhan-mis"
DB_NAME = "rice_management"
DB_USER = "rice_user"

# Converted from PuTTY PPK v3 (id_rsa (4).ppk) — unencrypted OpenSSH PEM for paramiko.
# Do not upload this file to the remote host (excluded from deploy tar).
EMBEDDED_SSH_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAp1Uvl6xjnpIZbgUgx5Voa2qwAp10XD30Ic0TGPTgQ21hdUDa
L1OLeFJMjbsIWIwABHrTx2vgYjToQoSOe7ms2V2dz1tLPNGuPCJPCQGNjkEPC0IV
6iPSvUMFPpmEY0EwRy5iOUdIBWJveO0ljhfl7QQ6JsmKKJiVivjjN3l6qOdsi8ou
eo29Ye+OF95Z3MDl90H5weH5E8aDZZNi59D+iK7HgxjR6U8rqUyG9R7OwYAvjq/N
dOpXrbf7pXQO809F8+MHvQ+RcKvllwBT4vEozMoCeRq5M1+VmWGeZOVVka8Q1ygA
wbzuprycBDWaBDqJnunmRQIb+N8l6iB3gG7scQIDAQABAoIBAA3BV5Y075jQvb0T
jYGalejZQ6VouBtVDxqFjHUCvDoOuxzeZeZ6DFRUakKZsLKcCkGpWdC3h3cgjkSE
N7ToAH4lz0aFD1xCiFDH0+No+JqhsnuPGn9oI8y3E66frrL8tYaZw4Kd33JsiGlS
ZUHsU6mg1/7pllfb+H8MvUY0JZHOF5enFxfgSYZ4M9niA7O7Sxbk25V/MEb8fVKG
H3pQeRSAKw0pOicH/vYpzQfihJHDOJcnD8F8ubpQJKk0czSBqM5LS9vpoNZrvoRM
LwmTfQ50dXo2NAWvnCbNXy+CEFuihv8BcFbr3+VzwxrizQEIVRNcUDrHXIpKaqWr
zToZ2qECgYEA211O48ngDKIlhx3d6fOOO+mS+TMRU21F+5R2XklRaKDQMn8/fiXy
3/vStYuIqF8b4ptvhm+MXEdd3sGBM8QKjpF3vSAS77U4jTywq/FvV9dw0rauzn81
IWpo5LYcZL5Acc0sCL8snIobRvP6SjLjtf/WIJ/gFh5dWK1fwAhG/l0CgYEAw0dR
P+er4ahcBYwEiyKuHGgZQ2p5UXBLS3OPKIXKeO+ywmFB/xJ8/Ss858r9bzOci9DV
EDiyQSPMzw3GnMtf1bQljuNOtW8z4POjGV3TO8iTs4uBQewIqOjrc8nHlbsPdV8N
1de5JetquPLuz8czoDh3K1jOKygTYvsfrhjQPSUCgYAtIHLcNWlb7/dcZm6CdFIs
TQ6pKTJFQVOGP7JiDx8qMPrjiH3dS509KqbcJgpE6NvpsCQvOb9cNGpBKvmTVp79
WTuSsohyu4sYswV9Obu4DF/vWRl47X5Wk3dkpXoN132Wa6jFW96njVmzLPmuTe2+
QRUhvQHySujVF0V9UbaZGQKBgQCFPGSgUIZCqedXVYhIEjpvYUtTZxMtUIvfCBJ2
GIrj5s+1tjwcN9YVummM0UAHnlRCRRMKRVTCAxYbc4++rThPC+HQUyEBw8TGyBTR
GuYj1R+JkjZ37v6dmIYFc3f8nivW7ir3a3+E8tHXLNFp7MU5nS0Z4zaP1YEcuLCN
zZpPDQKBgQCYdKGk3PblwWvg8WlGHq3SxB+kbyna0/TW9vIXOXyw18MhJsYArrSB
azhlAxz9p3Iijw/+8suE0IGots5Kh3CYeYMI1tg+xBbvOwc7rBjbwW2idwqRljnG
F5vPuAYO5rBzZ0k2w9xLpYPyQlqV0OQMji15/qOrK83gUKofjh4AAg==
-----END RSA PRIVATE KEY-----
"""

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".cursor",
    "__pycache__",
    "coverage",
    ".nestjs",
}
SKIP_SUFFIXES = (".pdf", ".log", ".zip", ".key", ".ppk", ".pem")
SKIP_NAMES = {
    "vps_deploy.py",
    "convert_ppk.py",
    "vps_openssh.key",
}


def should_skip(rel: Path) -> bool:
    if any(p in SKIP_DIRS for p in rel.parts):
        return True
    if rel.name in {".env", ".env.local", ".env.production"} | SKIP_NAMES:
        return True
    return rel.suffix.lower() in SKIP_SUFFIXES


def load_ssh_pkey() -> paramiko.PKey:
    """Load embedded OpenSSH key (converted from PuTTY PPK). Optional file override."""
    override = os.environ.get("VPS_SSH_KEY_FILE", "").strip()
    if override:
        return paramiko.RSAKey.from_private_key_file(override)
    local_key = Path(__file__).with_name("vps_openssh.key")
    if local_key.is_file():
        return paramiko.RSAKey.from_private_key_file(str(local_key))
    return paramiko.RSAKey.from_private_key(io.StringIO(EMBEDDED_SSH_PRIVATE_KEY))


def safe_print(text: str) -> None:
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))
    sys.stdout.flush()


def run_local(cmd: list[str], cwd: Path) -> None:
    print("local>", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=str(cwd))


def build_frontend() -> None:
    fe = ROOT / "y-frontend"
    env_path = fe / ".env.production"
    # Same-origin empty base → relative /auth, /customers, etc. through nginx
    # Same-origin root — empty string would break relative axios URLs under /yk/*
    env_path.write_text("VITE_API_BASE_URL=/\n", encoding="utf-8")
    npm = shutil.which("npm") or r"C:\Program Files\nodejs\npm.cmd"
    run_local([npm, "ci"], fe)
    run_local([npm, "run", "build"], fe)


def build_backend() -> None:
    be = ROOT / "y-backend"
    npm = shutil.which("npm") or r"C:\Program Files\nodejs\npm.cmd"
    run_local([npm, "ci"], be)
    run_local([npm, "run", "build"], be)


def make_tar() -> Path:
    tar_path = Path(tempfile.gettempdir()) / "yousuf-keyhan-deploy.tar.gz"
    count = 0
    with tarfile.open(tar_path, "w:gz") as tar:
        # Backend: source needed? Only dist + prisma + package files + uploads dir
        include = [
            ROOT / "y-backend" / "dist",
            ROOT / "y-backend" / "prisma",
            ROOT / "y-backend" / "prisma.config.ts",
            ROOT / "y-backend" / "package.json",
            ROOT / "y-backend" / "package-lock.json",
            ROOT / "y-frontend" / "dist",
            ROOT / "deploy",
        ]
        for base in include:
            if not base.exists():
                continue
            if base.is_file():
                rel = base.relative_to(ROOT)
                tar.add(base, arcname=rel.as_posix())
                count += 1
                continue
            for path in base.rglob("*"):
                if not path.is_file():
                    continue
                rel = path.relative_to(ROOT)
                if should_skip(rel):
                    continue
                tar.add(path, arcname=rel.as_posix())
                count += 1
    print(f"Archive: {count} files, {tar_path.stat().st_size // 1024} KB", flush=True)
    return tar_path


def main() -> None:
    if os.environ.get("SKIP_LOCAL_BUILD") == "1":
        print("SKIP_LOCAL_BUILD=1 — using existing dist/", flush=True)
    else:
        build_frontend()
        build_backend()
    tar_path = make_tar()

    db_pass = os.environ.get("YK_DB_PASSWORD") or secrets.token_urlsafe(18)
    jwt_access = secrets.token_urlsafe(48)
    jwt_refresh = secrets.token_urlsafe(48)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}...", flush=True)
    connect_kwargs: dict = {
        "hostname": HOST,
        "username": USER,
        "timeout": 45,
        "look_for_keys": False,
        "allow_agent": False,
    }
    try:
        connect_kwargs["pkey"] = load_ssh_pkey()
        client.connect(**connect_kwargs)
        print("Auth: embedded SSH key", flush=True)
    except Exception as key_err:
        if not PASSWORD:
            raise SystemExit(
                f"SSH key auth failed ({key_err}). "
                'Set VPS_PASSWORD as fallback, e.g. $env:VPS_PASSWORD = "..."'
            ) from key_err
        print(f"SSH key auth failed ({key_err}); trying VPS_PASSWORD...", flush=True)
        connect_kwargs.pop("pkey", None)
        connect_kwargs["password"] = PASSWORD
        client.connect(**connect_kwargs)
        print("Auth: password", flush=True)
    if client.get_transport():
        client.get_transport().set_keepalive(30)

    def ssh(cmd: str, timeout: int = 900) -> tuple[int, str, str]:
        _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out, err

    def run_step(name: str, cmd: str, timeout: int = 900) -> None:
        print(f"remote> {name}", flush=True)
        code, out, err = ssh(cmd, timeout=timeout)
        if out.strip():
            safe_print(out.rstrip())
        if code != 0:
            if err.strip():
                safe_print(err[-4000:])
            client.close()
            raise SystemExit(f"{name} failed ({code})")

    # Upload archive with progress
    sftp = client.open_sftp()
    total = tar_path.stat().st_size
    state = {"next": max(total // 10, 1)}

    def progress(sent: int, _size: int) -> None:
        if sent >= state["next"] or sent == total:
            print(f"  upload: {sent * 100 // max(total, 1)}%", flush=True)
            state["next"] += max(total // 10, 1)

    sftp.put(str(tar_path), "/tmp/yousuf-keyhan-deploy.tar.gz", callback=progress)
    sftp.close()
    tar_path.unlink(missing_ok=True)

    # Escape password for SQL/env (single quotes)
    def esc_sql(s: str) -> str:
        return s.replace("'", "''")

    def esc_env(s: str) -> str:
        # URL-encode @ and : for DATABASE_URL userinfo if needed
        from urllib.parse import quote

        return quote(s, safe="")

    db_pass_sql = esc_sql(db_pass)
    db_pass_url = esc_env(db_pass)

    run_step(
        "install node 22 if needed",
        r"""
set -e
NODE_MAJOR=$(node -v | sed 's/v//;s/\..*//')
if [ "$NODE_MAJOR" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v
""",
        timeout=300,
    )

    run_step(
        "postgres user/db",
        f"""
set -e
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{DB_USER}') THEN
    CREATE ROLE {DB_USER} LOGIN PASSWORD '{db_pass_sql}';
  ELSE
    ALTER ROLE {DB_USER} WITH LOGIN PASSWORD '{db_pass_sql}';
  END IF;
END
$$;
SQL
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname='{DB_NAME}'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE {DB_NAME} OWNER {DB_USER};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d {DB_NAME} <<'SQL'
GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};
GRANT ALL ON SCHEMA public TO {DB_USER};
ALTER SCHEMA public OWNER TO {DB_USER};
GRANT ALL ON ALL TABLES IN SCHEMA public TO {DB_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO {DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {DB_USER};
SQL
echo "db ready"
""",
    )

    run_step(
        "unpack and configure",
        f"""
set -e
mkdir -p {REMOTE}/backend/uploads/profiles {REMOTE}/frontend
cd {REMOTE}
tar -xzf /tmp/yousuf-keyhan-deploy.tar.gz
rm -f /tmp/yousuf-keyhan-deploy.tar.gz
# Flatten layout: y-backend -> backend, y-frontend/dist -> frontend/dist
rm -rf {REMOTE}/backend/dist {REMOTE}/backend/prisma
mkdir -p {REMOTE}/backend
cp -a {REMOTE}/y-backend/dist {REMOTE}/backend/
cp -a {REMOTE}/y-backend/prisma {REMOTE}/backend/
cp -a {REMOTE}/y-backend/prisma.config.ts {REMOTE}/backend/ 2>/dev/null || true
cp -a {REMOTE}/y-backend/package.json {REMOTE}/backend/
cp -a {REMOTE}/y-backend/package-lock.json {REMOTE}/backend/
rm -rf {REMOTE}/frontend/dist
mkdir -p {REMOTE}/frontend
cp -a {REMOTE}/y-frontend/dist {REMOTE}/frontend/
rm -rf {REMOTE}/y-backend {REMOTE}/y-frontend
mkdir -p {REMOTE}/backend/uploads/profiles

cat > {REMOTE}/backend/.env <<EOF
DATABASE_URL=postgresql://{DB_USER}:{db_pass_url}@127.0.0.1:5432/{DB_NAME}?schema=public
DIRECT_DATABASE_URL=postgresql://{DB_USER}:{db_pass_url}@127.0.0.1:5432/{DB_NAME}?schema=public
PORT={API_PORT}
NODE_ENV=production
FRONTEND_URL=http://{HOST}:{PUBLIC_PORT}
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
JWT_ACCESS_SECRET={jwt_access}
JWT_REFRESH_SECRET={jwt_refresh}
JWT_ISSUER=yousuf-keyhan-mis
JWT_AUDIENCE=yousuf-keyhan-mis-clients
AUTH_ACCESS_TTL_MS=900000
AUTH_REFRESH_TTL_MS=1209600000
AUTH_CSRF_TTL_MS=1209600000
AUTH_RESET_TTL_MS=3600000
AUTH_PERM_CACHE_TTL_MS=60000
AUTH_MAX_FAILED_LOGINS=5
AUTH_LOCKOUT_MS=900000
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
THROTTLE_LOGIN_LIMIT=10
RUN_DB_SEED=false
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_NAME=System Administrator
SEED_ADMIN_PASSWORD=Admin@12345.com
EOF
echo "files ready"
ls -la {REMOTE}/backend/dist | head
ls -la {REMOTE}/frontend/dist | head
""",
    )

    run_step(
        "npm install + migrate",
        f"""
set -e
cd {REMOTE}/backend
npm ci --omit=dev
npx prisma generate
# Clear failed migration state from a previous deploy attempt (safe if none)
npx prisma migrate resolve --rolled-back 20260614193000_customer_ledger_pay_on_behalf 2>/dev/null || true
npx prisma migrate deploy
echo "migrate ok"
""",
        timeout=600,
    )

    run_step(
        "stop old rice-backend pm2 if any",
        """
pm2 delete rice-backend 2>/dev/null || true
pm2 save 2>/dev/null || true
echo done
""",
    )

    run_step(
        "systemd + nginx",
        f"""
set -e
cp {REMOTE}/deploy/{SERVICE}.service /etc/systemd/system/{SERVICE}.service
# Fix ExecStart to use system node
sed -i 's|/usr/bin/node|'"$(command -v node)"'|g' /etc/systemd/system/{SERVICE}.service
systemctl daemon-reload
systemctl enable {SERVICE}.service
systemctl restart {SERVICE}.service
cp {REMOTE}/deploy/nginx-yousuf-keyhan.conf /etc/nginx/sites-available/{SERVICE}
ln -sfn /etc/nginx/sites-available/{SERVICE} /etc/nginx/sites-enabled/{SERVICE}
nginx -t
systemctl reload nginx
sleep 3
echo "service: $(systemctl is-active {SERVICE}.service)"
curl -s -o /dev/null -w "site:%{{http_code}}\\n" http://127.0.0.1:{PUBLIC_PORT}/
curl -s -o /dev/null -w "health:%{{http_code}}\\n" http://127.0.0.1:{PUBLIC_PORT}/health
curl -s http://127.0.0.1:{PUBLIC_PORT}/health || true
echo
journalctl -u {SERVICE} -n 30 --no-pager || true
""",
    )

    client.close()
    print(f"\nOK — http://{HOST}:{PUBLIC_PORT}/", flush=True)
    print("API health: http://%s:%s/health" % (HOST, PUBLIC_PORT), flush=True)
    print("DB: %s (user %s) — existing data kept; migrations applied." % (DB_NAME, DB_USER), flush=True)
    print("Login with your existing admin user from the rice_management database.", flush=True)


if __name__ == "__main__":
    main()
