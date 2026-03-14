# Deployment Guide — Supabase + Render + Vercel + Google OAuth

## Prerequisites

- GitHub repository with the project pushed
- Accounts on: [Supabase](https://supabase.com), [Render](https://render.com), [Vercel](https://vercel.com), [Google Cloud Console](https://console.cloud.google.com)

---

## 1. Supabase Database Setup

1. Create a new Supabase project.
2. Go to **Settings → Database → Connection string → JDBC**.
3. Copy the connection string — it looks like:
   ```
   jdbc:postgresql://db.<ref>.supabase.co:5432/postgres
   ```
4. Note the **database password** you set during project creation.
5. Connection details for Render env vars:
   - `DB_URL` = the JDBC connection string above
   - `DB_USERNAME` = `postgres`
   - `DB_PASSWORD` = your Supabase database password

Flyway migrations will run automatically on first backend start.

---

## 2. Google Cloud OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (or select existing).
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://your-app.vercel.app` (production — update after Vercel deploy)
7. Click **Create** and copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`).

You'll also need to configure the **OAuth consent screen** (APIs & Services → OAuth consent screen):
- User type: External
- App name, support email, developer email
- No scopes needed beyond default (email, profile, openid)

---

## 3. Render Backend Deployment

### Option A: Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New → Web Service**.
2. Connect your GitHub repo.
3. Configure:
   - **Name**: `kirana-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile` (relative to root directory)
   - **Plan**: Free (or Starter for production)
4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `SERVER_PORT` | `5000` |
   | `DB_URL` | `jdbc:postgresql://db.<ref>.supabase.co:5432/postgres` |
   | `DB_USERNAME` | `postgres` |
   | `DB_PASSWORD` | *(Supabase DB password)* |
   | `JWT_SECRET` | *(generate: `openssl rand -base64 48`)* |
   | `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
   | `GOOGLE_CLIENT_ID` | *(from Google Cloud Console)* |

5. Click **Create Web Service** and wait for the build.
6. Note the Render URL (e.g., `https://kirana-backend.onrender.com`).

### Option B: Blueprint (render.yaml)

Push the repo and use **New → Blueprint** in Render Dashboard. It will read `render.yaml` from the repo root. You'll still need to manually set secret env vars.

### Verify Backend Health

```bash
curl https://kirana-backend.onrender.com/actuator/health
# Expected: {"status":"UP"}
```

---

## 4. Vercel Frontend Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New → Project**.
2. Import your GitHub repo.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://kirana-backend.onrender.com/api` |
   | `VITE_GOOGLE_CLIENT_ID` | *(same Client ID from Google Cloud)* |

5. Click **Deploy**.
6. Note the Vercel URL (e.g., `https://your-app.vercel.app`).

---

## 5. Post-Deploy Configuration

After both services are deployed:

1. **Update CORS on Render**: Set `CORS_ALLOWED_ORIGINS` to your actual Vercel URL.
2. **Update Google OAuth origins**: Add your Vercel production URL to the authorized JavaScript origins in Google Cloud Console.
3. **Redeploy backend** on Render (if you changed env vars, Render auto-restarts).

---

## 6. Smoke Tests

Run these checks on the deployed URLs:

- [ ] Backend health: `GET /actuator/health` returns `{"status":"UP"}`
- [ ] Email/password login: `POST /api/auth/login` with valid credentials
- [ ] Email/password register: `POST /api/auth/register` with new user data
- [ ] Google OAuth login: Click Google button on auth page
- [ ] Google OAuth auto-signup: Sign in with a Google account not yet registered
- [ ] Protected API: Access dashboard/items with JWT token
- [ ] Auth rejection: Access protected endpoint without token → 401

---

## Environment Variable Summary

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `SPRING_PROFILES_ACTIVE` | Yes | Set to `prod` |
| `SERVER_PORT` | Yes | `5000` |
| `DB_URL` | Yes | Supabase JDBC URL |
| `DB_USERNAME` | Yes | `postgres` |
| `DB_PASSWORD` | Yes | Supabase DB password |
| `JWT_SECRET` | Yes | 256-bit+ secret key |
| `CORS_ALLOWED_ORIGINS` | Yes | Vercel frontend URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Render backend URL + `/api` |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
