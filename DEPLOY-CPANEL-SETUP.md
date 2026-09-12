
## Project  — Yousuf Keyhan MIS (`yousu687`)

### Confirmed from this PC

| Field | Value |
|------|--------|
| Local folder | `E:\Projects\Yousuf Keyhan MIS` |
| Frontend | `y-frontend` → **React + Vite** (not Next.js) |
| Backend | `y-backend` → **NestJS + Prisma + PostgreSQL** |
| SSH user | `yousu687` |
| Home | `/home/yousu687` |
| SSH host | `server1.shahhost.net` |
| Port | `22` |
| Downloaded key | `C:\Users\DELL\Downloads\id_rsa (2).ppk` |
| Local OpenSSH key | `C:\Users\DELL\.ssh\yousu687_key` _(create below)_ |
| Public fingerprint | `SHA256:5wPZGgjrhuhWYb89DTQ9gEMq+ifhFHn4p0CmLmyhq7w` |
| Likely domain | `https://yousuf-kaihan.com` _(from `.env` examples)_ |

### Still discover on the server (after first SSH)

| Field | Fill after `ls` |
|------|------------------|
| Frontend live path | `/home/yousu687/public_html` |
| Nest API path | `/home/yousu687/backend` (Passenger via `public_html/api`) |
| Node on host | `nodevenv/backend/24` |
| Process manager | CloudLinux Passenger (`PassengerStartupFile dist/main.js`) |
| Restart command | `touch ~/backend/tmp/restart.txt` |
| Site | `https://yousuf-kaihan.com` |
| API | `https://api.yousuf-kaihan.com` |
| Last deployed | 2026-08-22 — role permission persistence fix + `permissions_customized_at` migration |

### 1) Convert the private key (one time)

`id_rsa (2).ppk` is **encrypted**. Convert with PuTTYgen:

1. Open **PuTTYgen**
2. **Load** → `C:\Users\DELL\Downloads\id_rsa (2).ppk`
3. Enter the key passphrase
4. **Conversions → Export OpenSSH key**
5. Save as: `C:\Users\DELL\.ssh\yousu687_key`
6. In PowerShell:

```powershell
icacls $env:USERPROFILE\.ssh\yousu687_key /inheritance:r
icacls $env:USERPROFILE\.ssh\yousu687_key /grant:r "$($env:USERNAME):(R)"
```

### 2) Connect

```powershell
ssh -i $env:USERPROFILE\.ssh\yousu687_key yousu687@server1.shahhost.net
```

### 3) Discover layout (run on the server)

```bash
pwd
ls -la
ls -la public_html
find ~ -maxdepth 4 -type f \( -name package.json -o -name ecosystem.config.js -o -name .env -o -name passenger_wsgi.py \) 2>/dev/null
node -v
npm -v
which pm2 || true
pm2 list || true
# cPanel Node apps often live under:
ls -la ~/nodevenv 2>/dev/null
ls -la ~/apis 2>/dev/null
```

Paste that output into Cursor Agent chat so upload paths can be finalized.

---

## How to update Yousuf Keyhan MIS on cPanel

### A. Build on your PC

**Frontend** (`y-frontend`):

```powershell
cd "E:\Projects\Yousuf Keyhan MIS\y-frontend"
# Ensure .env.production has production API, e.g.:
#   VITE_API_BASE_URL=https://yousuf-kaihan.com   (or your API subdomain)
npm ci
npm run build
# Output: y-frontend\dist\
```

**Backend** (`y-backend`):

```powershell
cd "E:\Projects\Yousuf Keyhan MIS\y-backend"
# Keep production secrets only on the server .env — do not overwrite blindly
npm ci
npm run build
# Output: y-backend\dist\  (+ prisma client)
```

Also on the server after uploading API code (preferred for DB):

```bash
cd ~/PATH_TO_API
npx prisma migrate deploy
npx prisma generate
```

### B. Upload (adjust remote paths after discovery)

```powershell
$KEY = "$env:USERPROFILE\.ssh\yousu687_key"
$USERHOST = "yousu687@server1.shahhost.net"
$ROOT = "E:\Projects\Yousuf Keyhan MIS"

# Frontend static build → usually public_html
scp -i $KEY -r "$ROOT\y-frontend\dist\*" "${USERHOST}:~/public_html/"

# Nest build → backend folder on server
scp -i $KEY -r "$ROOT\y-backend\dist" "${USERHOST}:~/backend/"
scp -i $KEY -r "$ROOT\y-backend\prisma" "${USERHOST}:~/backend/"
scp -i $KEY "$ROOT\y-backend\package.json" "${USERHOST}:~/backend/"
scp -i $KEY "$ROOT\y-backend\package-lock.json" "${USERHOST}:~/backend/"
```

**Do not** upload local `.env` over production unless you intend to replace secrets.

### C. Restart API

```bash
# If PM2:
pm2 restart all

# If cPanel “Setup Node.js App”:
#   open that app in cPanel → Restart
# or:
mkdir -p ~/backend/tmp && touch ~/backend/tmp/restart.txt
```

---

## Cursor windows — recommendation

| Work | Where |
|------|--------|
| Edit / build **Yousuf Keyhan MIS** | Open `E:\Projects\Yousuf Keyhan MIS` in **another Cursor window** |
| Edit / deploy **Dublin** | This window / this repo |
| SSH recipes for both | This file (`DEPLOY-CPANEL-SETUP.md`) |

You *can* work from this chat with the absolute path  
`E:\Projects\Yousuf Keyhan MIS` — a second window is just cleaner.

---

## Security

- Never commit private keys or passphrases
- Separate keys: `cpanel_key` (Dublin) vs `yousu687_key` (Yousuf)
- Do not paste private keys into chat
- Backend needs **PostgreSQL** on the host (or remote DB URL in server `.env`)

---

## Blank row for a third project

| Field | Value |
|------|--------|
| Project name | |
| Local folder | |
| Stack | |
| SSH user | |
| Home | `/home/` |
| Host | `server1.shahhost.net` |
| Local key | `C:\Users\DELL\.ssh\` |
| Frontend remote | |
| API remote | |
| Restart command | |
| Domain | |
