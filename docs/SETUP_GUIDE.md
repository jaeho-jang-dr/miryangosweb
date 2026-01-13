# Multi-Environment Setup Quick Start

Get your development, staging, and production environments configured in 10 minutes.

## Prerequisites

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Three Firebase projects created (dev, staging, prod)

## Step-by-Step Setup

### 1. Create Firebase Projects (5 minutes)

Go to https://console.firebase.google.com and create three projects:

```
miryangosweb-dev       # Development
miryangosweb-staging   # Staging
miryangosweb-prod      # Production
```

For each project, enable:
- ✅ Firebase Hosting
- ✅ Cloud Firestore
- ✅ Cloud Storage

### 2. Configure .firebaserc (1 minute)

Update `.firebaserc` with your project IDs:

```json
{
  "projects": {
    "development": "miryangosweb-dev",
    "staging": "miryangosweb-staging",
    "default": "miryangosweb-prod"
  }
}
```

### 3. Setup Environment Variables (3 minutes)

For each environment, create the local config file:

```bash
# Development
cp .env.development .env.development.local

# Staging
cp .env.staging .env.staging.local

# Production
cp .env.production .env.production.local
```

Get your Firebase credentials:
1. Firebase Console → Project Settings → Your apps
2. Select your web app (or create one)
3. Copy config values

Edit each `.env.<env>.local` file:

**Development** (`.env.development.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=miryangosweb-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=miryangosweb-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=miryangosweb-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...

GEMINI_API_KEY=AIza...

NEXT_PUBLIC_ENV=development
```

Repeat for staging and production with their respective values.

### 4. Initialize Firebase Hosting (1 minute)

```bash
# Initialize Firebase features
firebase init

# Select:
# ☑ Firestore
# ☑ Hosting
# ☑ Storage

# Configuration:
# - Public directory: out
# - Single-page app: Yes
# - Automatic builds: No
```

### 5. Test Your Setup (Quick)

```bash
# Validate development environment
npm run deploy:dev -- --dry-run

# Should see:
# ✓ Firebase CLI installed
# ✓ Firebase authentication verified
# ✓ Firebase Project: miryangosweb-dev
# ✓ Environment validated
```

## Quick Test Deployment

Deploy to development to verify everything works:

```bash
npm run deploy:dev
```

Expected output:
```
=============================================================
  Firebase Multi-Environment Deployment
=============================================================
Environment: Development
Target:      hosting
...
✓ Deployment to Development completed successfully!
  URL: https://miryangosweb-dev.web.app
=============================================================
```

## Verification Checklist

- [ ] Three Firebase projects created
- [ ] `.firebaserc` configured with all three project IDs
- [ ] `.env.development.local` created and filled
- [ ] `.env.staging.local` created and filled
- [ ] `.env.production.local` created and filled
- [ ] Firebase initialized (`firebase.json` exists)
- [ ] Dry-run successful
- [ ] Test deployment to development works

## Next Steps

1. **Deploy to Staging:**
   ```bash
   npm run deploy:staging
   ```

2. **Read Full Documentation:**
   - [Multi-Environment Deployment Guide](./MULTI_ENV_DEPLOYMENT.md)
   - [Firebase Deployment Guide](./FIREBASE_DEPLOYMENT.md)

3. **Setup Your Workflow:**
   - Decide on deployment strategy (linear, hotfix, feature branch)
   - Configure CI/CD (optional, see guides)

## Common Setup Issues

### "No Firebase project configured for environment"

**Fix:** Double-check `.firebaserc` has all three environments with correct project IDs.

### "Not authenticated"

**Fix:**
```bash
firebase logout
firebase login
```

### "Build fails"

**Fix:** The build has some current issues. For now, use `--skip-build` to deploy existing builds:
```bash
npm run deploy:dev -- --skip-build
```

See the main troubleshooting guide for build fixes.

## File Structure After Setup

```
miryangosweb/
├── .env.development         # Template (committed)
├── .env.staging            # Template (committed)
├── .env.production         # Template (committed)
├── .env.development.local  # Your values (NOT committed)
├── .env.staging.local      # Your values (NOT committed)
├── .env.production.local   # Your values (NOT committed)
├── .firebaserc             # Project IDs (committed)
├── firebase.json           # Firebase config (committed)
├── scripts/
│   ├── deploy-env.js       # Multi-env deployment script
│   └── firebase-deploy.js  # Basic deployment script
└── docs/
    ├── MULTI_ENV_DEPLOYMENT.md  # Full guide
    └── SETUP_GUIDE.md           # This file
```

## Support

Stuck? Check the [troubleshooting section](./MULTI_ENV_DEPLOYMENT.md#troubleshooting) in the full guide.
