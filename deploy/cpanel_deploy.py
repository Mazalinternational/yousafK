"""
Deploy Yousuf Keyhan MIS to cPanel (https://yousuf-kaihan.com).

SSH: yousu687@server1.shahhost.net (embedded key from deploy/vps_deploy.py)
Frontend → ~/public_html (static Vite build)
Backend  → ~/backend (Passenger Node app; .env preserved)
Restart  → touch ~/backend/tmp/restart.txt

Usage:
  python deploy/cpanel_deploy.py
  $env:SKIP_LOCAL_BUILD = "1"; python deploy/cpanel_deploy.py
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("CPANEL_HOST", "server1.shahhost.net")
USER = os.environ.get("CPANEL_USER", "yousu687")
REMOTE_FE = "public_html"
REMOTE_BE = "backend"
API_BASE = os.environ.get("VITE_API_BASE_URL", "https://api.yousuf-kaihan.com")


def safe_print(text: str) -> None:
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))
    sys.stdout.flush()


def run_local(cmd: list[str], cwd: Path) -> None:
    print("local>", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=str(cwd))


def load_pkey() -> paramiko.PKey:
    # Reuse embedded key from vps_deploy (same PPK the user converted).
    from vps_deploy import load_ssh_pkey

    return load_ssh_pkey()


def build_frontend() -> None:
    fe = ROOT / "y-frontend"
    (fe / ".env.production").write_text(f"VITE_API_BASE_URL={API_BASE}\n", encoding="utf-8")
    npm = shutil.which("npm") or r"C:\Program Files\nodejs\npm.cmd"
    run_local([npm, "ci"], fe)
    run_local([npm, "run", "build"], fe)


def build_backend() -> None:
    be = ROOT / "y-backend"
    npm = shutil.which("npm") or r"C:\Program Files\nodejs\npm.cmd"
    run_local([npm, "ci"], be)
    run_local([npm, "run", "build"], be)


def make_tar() -> Path:
    tar_path = Path(tempfile.gettempdir()) / "yk-cpanel-deploy.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        fe_dist = ROOT / "y-frontend" / "dist"
        for path in fe_dist.rglob("*"):
            if path.is_file():
                tar.add(path, arcname=f"frontend/{path.relative_to(fe_dist).as_posix()}")

        be = ROOT / "y-backend"
        for rel in ("dist", "prisma", "package.json", "package-lock.json", "prisma.config.ts"):
            src = be / rel
            if not src.exists():
                continue
            if src.is_file():
                tar.add(src, arcname=f"backend/{rel}")
            else:
                for path in src.rglob("*"):
                    if path.is_file():
                        tar.add(path, arcname=f"backend/{path.relative_to(be).as_posix()}")
    print(f"Archive: {tar_path.stat().st_size // 1024} KB", flush=True)
    return tar_path


def main() -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

    if os.environ.get("SKIP_LOCAL_BUILD") == "1":
        print("SKIP_LOCAL_BUILD=1 — using existing dist/", flush=True)
    else:
        build_frontend()
        build_backend()

    tar_path = make_tar()
    key = load_pkey()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}...", flush=True)
    client.connect(
        HOST,
        username=USER,
        pkey=key,
        timeout=45,
        look_for_keys=False,
        allow_agent=False,
    )
    if client.get_transport():
        client.get_transport().set_keepalive(30)

    def ssh(cmd: str, timeout: int = 600) -> tuple[int, str, str]:
        _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out, err

    def run_step(name: str, cmd: str, timeout: int = 600) -> None:
        print(f"remote> {name}", flush=True)
        code, out, err = ssh(cmd, timeout=timeout)
        if out.strip():
            safe_print(out.rstrip())
        if code != 0:
            if err.strip():
                safe_print(err[-4000:])
            client.close()
            raise SystemExit(f"{name} failed ({code})")

    sftp = client.open_sftp()
    remote_tar = "/home/yousu687/tmp/yk-cpanel-deploy.tar.gz"
    total = tar_path.stat().st_size
    state = {"next": max(total // 10, 1)}

    def progress(sent: int, _size: int) -> None:
        if sent >= state["next"] or sent == total:
            print(f"  upload: {sent * 100 // max(total, 1)}%", flush=True)
            state["next"] += max(total // 10, 1)

    print("Uploading archive...", flush=True)
    ssh("mkdir -p ~/tmp")
    sftp.put(str(tar_path), remote_tar, callback=progress)
    sftp.close()
    tar_path.unlink(missing_ok=True)

    run_step(
        "extract + sync (preserve .env / api / htaccess)",
        f"""
set -e
EXTRACT=~/tmp/yk-deploy-extract
rm -rf "$EXTRACT"
mkdir -p "$EXTRACT"
tar -xzf {remote_tar} -C "$EXTRACT"
rm -f {remote_tar}

# Frontend: sync built files only; keep api/, .htaccess, cgi-bin, etc.
FE=~/{REMOTE_FE}
mkdir -p "$FE/assets" "$FE/fonts"
# Replace hashed assets cleanly
rm -rf "$FE/assets"
cp -a "$EXTRACT/frontend/assets" "$FE/" 2>/dev/null || mkdir -p "$FE/assets"
if [ -d "$EXTRACT/frontend/fonts" ]; then
  rm -rf "$FE/fonts"
  cp -a "$EXTRACT/frontend/fonts" "$FE/"
fi
cp -f "$EXTRACT/frontend/index.html" "$FE/index.html"
# Optional static files from build
for f in vite.svg logo.png favicon.ico favicon.svg robots.txt; do
  if [ -f "$EXTRACT/frontend/$f" ]; then
    cp -f "$EXTRACT/frontend/$f" "$FE/$f"
  fi
done

# Backend: replace dist + prisma; never touch .env or node_modules
BE=~/{REMOTE_BE}
rm -rf "$BE/dist"
cp -a "$EXTRACT/backend/dist" "$BE/"
rm -rf "$BE/prisma"
cp -a "$EXTRACT/backend/prisma" "$BE/"
cp -f "$EXTRACT/backend/package.json" "$BE/package.json"
cp -f "$EXTRACT/backend/package-lock.json" "$BE/package-lock.json"
if [ -f "$EXTRACT/backend/prisma.config.ts" ]; then
  cp -f "$EXTRACT/backend/prisma.config.ts" "$BE/prisma.config.ts"
fi

rm -rf "$EXTRACT"
echo "sync ok"
ls -la "$FE/index.html" "$BE/dist" | head
""",
    )

    run_step(
        "prisma generate + migrate + passenger restart",
        f"""
set -e
cd ~/{REMOTE_BE}
# CloudLinux Node app venv (no npx — call local prisma with explicit schema path)
export PATH="$HOME/nodevenv/backend/24/bin:$PATH"
hash -r
node -v
./node_modules/.bin/prisma generate --schema=prisma/schema.prisma
./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
mkdir -p tmp
touch tmp/restart.txt
echo "restart touched"
sleep 2
echo done
""",
        timeout=600,
    )

    client.close()
    print("\nOK — https://yousuf-kaihan.com/", flush=True)
    print("API — https://api.yousuf-kaihan.com/health", flush=True)


if __name__ == "__main__":
    main()
