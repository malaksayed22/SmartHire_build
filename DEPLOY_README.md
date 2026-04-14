# SmartHire — Deployment Guide

## What's Fixed
- `VITE_API_BASE_URL` now points to Railway: `https://intelligent-cv-production.up.railway.app`
- `vite.config.js` dev proxy updated to hit Railway (no more localhost:3000 needed)
- `.env.production` added for clean production builds
- `dist/` folder contains the ready-to-deploy production build

## Deploy Options

### Option A — Deploy `dist/` folder directly (recommended)
Upload the `dist/` folder to:
- **Vercel**: `vercel --prod` (or drag & drop dist/ in Vercel dashboard)
- **Netlify**: drag & drop `dist/` folder
- **GitHub Pages**: push `dist/` contents to gh-pages branch

### Option B — Deploy source (auto-build on host)
Push this folder to GitHub and set in your hosting platform:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://intelligent-cv-production.up.railway.app`

## Backend CORS Requirement
The Railway backend must allow your frontend domain. If you see CORS errors,
ask your backend team to add your deployed URL to the CORS allowed origins.
The backend must also allow `credentials: true` since the frontend uses cookies.

## API Endpoints (all via Railway base URL)
- POST   /hr/registration
- POST   /hr/login
- POST   /hr/logout
- GET    /hr/get-posts
- POST   /hr/add-post
- PUT    /hr/update-post
- DELETE /hr/delete-post
- GET    /hr/rank-candidates?post_id=...
- POST   /candidate/registration
- POST   /candidate/login
- POST   /candidate/logout
- GET    /candidate/get-posts
- POST   /candidate/submit-application
- GET    /candidate/my-applications
- POST   /candidate/score-resume
- POST   /candidate/chat
