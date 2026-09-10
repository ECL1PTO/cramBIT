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
| Shape | *Change shape* → **Ampere** `VM.Standard.A1.Flex` → **2 OCPUs / 12 GB** if you can get it. Ampere is almost always *"out of capacity"* in a free home region — if so, switch to the **"Specialty and previous generation"** tab → **`VM.Standard.E2.1.Micro`** (AMD, 1 OCPU / 1 GB). That's what this guide's setup block is tuned for. |
| Networking | *Create new VCN* — leave defaults, make sure **Assign a public IPv4 address** is on |
| SSH keys | *Generate a key pair for me* → **download both keys**; the one you SSH with is the ~1.7 KB file **without** the `.pub` extension |

Create. When it's *Running*, copy the **Public IP address** (this guide's example: `140.245.237.93`).

> "Out of host capacity" for Ampere is the norm on Free Tier and it's locked to one
> region — don't wait for it, just use the E2.1.Micro. The 1 GB RAM is fine with the
> 2 GB swap file the setup block adds.

### 1.3 Open the firewall (two places)

**a) Oracle security list** — Console → *Networking → Virtual Cloud Networks →
your VCN → Public Subnet → Default Security List → Add Ingress Rules*:

| Source CIDR | Protocol | Dest Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(Port 22 is already open.)

Make sure the two new rows have **Destination Port Range** = `80` / `443` and
**Source Port Range** = blank/All (easy to fill the wrong column).

**b) On the VM** (after you SSH in — included in the setup block below).

### 1.4 SSH in

```bash
chmod 600 ~/Downloads/ssh-key-2026-09-10.key
ssh -i ~/Downloads/ssh-key-2026-09-10.key ubuntu@YOUR_PUBLIC_IP
```
Type `yes` at the authenticity prompt.

### 1.5 One-time setup (swap + firewall + Docker)

Paste this whole block into the VM:
```bash
# 2 GB swap — the E2.1.Micro only has 1 GB RAM
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# open 80/443 on the VM's own firewall
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker (the distro packages are missing on Oracle's Ubuntu image — use the script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo systemctl enable --now docker
```
Then `exit` and SSH back in so the docker group takes effect.

### 1.6 Run OmniRoute + Caddy (auto-HTTPS, no domain needed)

We use **sslip.io** so `<your-ip-with-dashes>.sslip.io` resolves to the VM and
Caddy can get a real Let's Encrypt certificate.

Replace `140-245-237-93` below with **your public IP, dashes instead of dots**.

```bash
mkdir -p ~/omni && cd ~/omni

cat > docker-compose.yml <<'YAML'
services:
  omniroute:
    image: diegosouzapw/omniroute:latest
    restart: unless-stopped
    environment:
      - OMNIROUTE_MEMORY_MB=512
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
140-245-237-93.sslip.io {
    reverse_proxy omniroute:20128
}
CADDY

docker compose up -d
```

Give it ~90 seconds (first run pulls images + Caddy fetches a cert), then check:
```bash
docker compose ps
curl -sk https://140-245-237-93.sslip.io/api/v1/models
```
`{"error":{"message":"Authentication required",...}}` is the **success** response —
it means OmniRoute is up and HTTPS works; it just wants an API key. Your gateway
base URL is:
```
https://140-245-237-93.sslip.io/api/v1
```

### 1.7 Configure OmniRoute

Open **`https://140-245-237-93.sslip.io/`** in a browser → the OmniRoute dashboard.
Walk the 6-step onboarding wizard (add Groq when it asks; add the rest after).

1. **Providers** → add every free source you can:
   - **API-key providers** you hold keys for: Groq (`gsk_…`), OpenRouter
     (`sk-or-…`, leave *"Import only free models"* ON), Google AI (`GEMINI_API_KEY`),
     NVIDIA NIM.
   - **OAuth providers** (no key, sign in once): Antigravity, Kiro AI — these give
     frontier models (Claude / Gemini Pro / GPT-5.x) for free but the access is
     unofficial and can break; keep them as deep fallback, not primary.
   - The **Free Tier** pool (~150 no-signup providers) — enable in bulk.
2. **Combos** → **Create Combo** named **`crambit`**, strategy **Priority**
   (strict order: best model first, fall through only on error/exhausted quota —
   *not* Round Robin, which would send each pass of one generation to a different
   model). Add ~50 general-purpose text models, strongest first. Skip anything
   Vision/VL, TTS, Audio, `lyria`, Guard/Content-Safety, Translate, Embedding, and
   sub-10B models. **Delete `openrouter/auto`** if it gets auto-added — it's a paid
   product.
3. Set a **dashboard password** (Configuration → Security) — this URL is public.
4. **API Keys** → **Create** (Management Access: Disabled) → copy it. This is
   `LLM_GATEWAY_KEY`.
5. The model string is just the combo name: `crambit`.
6. **Keep-alive:** `(crontab -l 2>/dev/null; echo "*/10 * * * * curl -s localhost:80 >/dev/null") | crontab -`

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
| `LLM_GATEWAY_URL` | `https://<dashed-ip>.sslip.io/api/v1` (note `/api/v1`) |
| `LLM_GATEWAY_KEY` | the OmniRoute API key from step 1.7.4 |
| `LLM_GATEWAY_MODEL` | `crambit` (your combo name) |
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
