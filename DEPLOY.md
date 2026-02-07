# Deploy for Testing

## Option 1: Vercel (recommended for Next.js)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. **Add New Project** → Import your GitHub repo
3. Add environment variables (Settings → Environment Variables):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (full JSON string, one line)

4. Deploy

### 3. Firebase Console
- **Authentication** → **Settings** → **Authorized domains** → Add your Vercel URL (e.g. `your-app.vercel.app`)

### 4. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

---

## Option 2: Vercel CLI (no GitHub)

```bash
npm i -g vercel
cd barber-saas
vercel
```

Follow prompts. Then add env vars in Vercel dashboard (Project → Settings → Environment Variables).

---

## Env vars from .env.local

Copy all values from `.env.local` to Vercel. For `FIREBASE_SERVICE_ACCOUNT`, use the JSON as a single-line string (no newlines).
