# Deploying cramBIT

Two pieces:

1. **OmniRoute** — the AI gateway — on a free **Oracle Cloud** ARM VM.
2. **cramBIT** — the Next.js app — on **Vercel** (free), talking to that gateway.

Do them in order. Copy values as you go into a scratch note; the last section
lists every env var Vercel needs.

---

## Part 1 — Oracle Cloud VM for OmniRoute

### 1.1 Sign up

1. Go to **cloud.oracle.com** → *Start for free*.
2. It asks for a card **for identity verification only** — Oracle does not charge
   the Always Free resources. Use your real details; mismatched name/card gets
   rejected.
3. Pick a **home region** close to India (e.g. *India South (Hyderabad)* or
   *Singapore*). You can't change this later.
4. Wait for the account email (can take 10–30 min).

### 1.2 Create the instance

Console → **Compute → Instances → Create instance**:

| Field | Value |
|---|---|
| Name | `omniroute` |
| Image | **Canonical Ubuntu 22.04** (click *Change image*) |
| Shape | *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → **2 OCPUs, 12 GB RAM** (well inside the always-free 4 OCPU / 24 GB) |
| Networking | *Create new VCN* — leave defaults, make sure **Assign a public IPv4 address** is on |
| SSH keys | *Generate a key pair for me* → **download both keys**, keep `ssh-key-*.key` safe |

Create. When it's *Running*, copy the **Public IP address** (e.g. `140.238.x.x`).

> If you get *"Out of host capacity"* for Ampere — try a different
> availability domain in the shape dialog, or retry in a few hours. It's common.

### 1.3 Open the firewall (two places)

**a) Oracle security list** — Console → *Networking → Virtual Cloud Networks →
your VCN → Public Subnet → Default Security List → Add Ingress Rules*:

| Source CIDR | Protocol | Dest Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(Port 22 is already open.)

**b) On the VM** (next step, after you SSH in):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 1.4 SSH in

```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_PUBLIC_IP
```

### 1.5 Install Docker

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
exit
```
SSH back in so the group takes effect.

### 1.6 Run OmniRoute + Caddy (auto-HTTPS, no domain needed)

We use **sslip.io** so `<your-ip-with-dashes>.sslip.io` resolves to the VM and
Caddy can get a real Let's Encrypt certificate.

Replace `140-238-1-2` below with **your public IP, dashes instead of dots**.

```bash
mkdir ~/omni && cd ~/omni

cat > docker-compose.yml <<'YAML'
services:
  omniroute:
    image: diegosouzapw/omniroute:latest
    restart: unless-stopped
    environment:
      - OMNIROUTE_MEMORY_MB=1024
    volumes:
      - omni-data:/app/data
    expose:
      - "20128"

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy-data:/data
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - omniroute

volumes:
  omni-data:
  caddy-data:
YAML

cat > Caddyfile <<'CADDY'
140-238-1-2.sslip.io {
    reverse_proxy omniroute:20128
}
CADDY

docker compose up -d
```

Give it ~60 seconds, then check:
```bash
curl -s https://140-238-1-2.sslip.io/v1/models | head -c 200
```
You should get JSON. Your gateway base URL is:
```
https://140-238-1-2.sslip.io/v1
```

### 1.7 Configure OmniRoute

Open **`https://140-238-1-2.sslip.io/`** in a browser → the OmniRoute dashboard.

1. **Providers tab** → add the keys you have. At minimum:
   - Groq (`gsk_…`)
   - OpenRouter (`sk-or-…`)
   - Google Gemini (your `GEMINI_API_KEY`)
   - Any others you want. OmniRoute also ships some pre-wired free providers.
2. **Set a dashboard password** if it prompts (Settings) — this URL is public.
3. **Endpoints tab** → create an API key → copy it. This is `LLM_GATEWAY_KEY`.
4. Note a model to use. `auto` works (OmniRoute picks per request). Or pick a
   specific strong one like `groq/openai/gpt-oss-120b`.

### 1.8 Keep it alive

Oracle occasionally reclaims *idle* Always-Free instances. A tiny cron keeps it
"active":
```bash
(crontab -l 2>/dev/null; echo "*/10 * * * * curl -s localhost:80 >/dev/null") | crontab -
```

---

## Part 2 — cramBIT on Vercel

### 2.1 Import the repo

1. **vercel.com** → sign in with GitHub → *Add New → Project* → import
   `ECL1PTO/cramBIT`.
2. Framework preset: **Next.js** (auto). Root directory: `/`. Don't deploy yet —
   add env vars first (Settings → Environment Variables), then deploy.

### 2.2 Environment variables

Add every row to **Production** (and Preview if you want preview deploys to work):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` |
| `GEMINI_API_KEY` | from `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>.vercel.app` (set after first deploy, then redeploy) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | your email |
| `LLM_GATEWAY_URL` | `https://140-238-1-2.sslip.io/v1` |
| `LLM_GATEWAY_KEY` | the OmniRoute endpoint key from 1.7.3 |
| `LLM_GATEWAY_MODEL` | `auto` (or a specific model id) |
| `GROQ_API_KEY`, `OPENROUTER_API_KEY` | keep as fallback (optional) |

Payments/email (only when you turn them on):
`NEXT_PUBLIC_UPI_VPA`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
`TELEGRAM_WEBHOOK_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM`, `RESEND_API_KEY`.

### 2.3 Deploy, then fix the URL

1. Deploy. Note the domain, e.g. `crambit.vercel.app`.
2. Set `NEXT_PUBLIC_SITE_URL=https://crambit.vercel.app` → redeploy.
3. **Supabase → Authentication → URL Configuration**: set *Site URL* to
   `https://crambit.vercel.app` and add
   `https://crambit.vercel.app/auth/callback` to *Redirect URLs*.

### 2.4 Database

In the Supabase **SQL Editor**, run (if you haven't):
- `supabase/migrations/20260910000000_rebuild.sql`
- `supabase/migrations/20260910120000_feedback.sql`

Then seed the course list from your machine:
```bash
node scripts/seed-subjects.mjs
```

### 2.5 Smoke test

Open the Vercel URL → sign in with an `@bitmesra.ac.in` email → generate a paper
for a real course code. If generation works, the gateway is wired correctly.

---

## Ongoing

- **Update cramBIT**: push to `main` → Vercel auto-deploys.
- **Update OmniRoute**: `cd ~/omni && docker compose pull && docker compose up -d`.
- **Add PYQ data**: run `scripts/scrape-archive.mjs` → `extract-pyqs.mjs` →
  `build-index.mjs` → `seed-subjects.mjs`, commit the `src/data/` changes.
- **Payments**: see `project_reference/EMAIL_SETUP.md` and the UPI/Telegram env
  vars; migration already has the tables.
