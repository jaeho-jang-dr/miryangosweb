# Firebase Deployment Guide

Complete guide for deploying the miryangosweb project to Firebase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Configuration](#configuration)
- [Deployment Methods](#deployment-methods)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)
- [Best Practices](#best-practices)

---

## Prerequisites

### Required Tools

1. **Node.js** (v20 or higher)
   ```bash
   node --version
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

3. **Git** (for version control)
   ```bash
   git --version
   ```

### Firebase Account Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable the following services:
   - **Firebase Hosting** (for static site hosting)
   - **Firestore** (for database)
   - **Cloud Storage** (for file uploads)

---

## Initial Setup

### 1. Firebase Authentication

```bash
# Login to Firebase
firebase login

# Verify authentication
firebase projects:list
```

### 2. Initialize Firebase Project

If `.firebaserc` doesn't exist:

```bash
# Initialize Firebase in your project
firebase init

# Select services:
# ☑ Firestore
# ☑ Hosting
# ☑ Storage

# Configuration:
# - Firestore rules: firestore.rules (already exists)
# - Firestore indexes: firestore.indexes.json (already exists)
# - Public directory: out (for Next.js static export)
# - Single-page app: Yes
# - Automatic builds: No
```

### 3. Update firebase.json

Your `firebase.json` should look like:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Note:** Next.js 16 with Turbopack requires special configuration. If using server-side features, deploy with Firebase Functions instead.

### 4. Create .firebaserc

If it doesn't exist, create `.firebaserc`:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Replace `your-firebase-project-id` with your actual Firebase project ID.

---

## Configuration

### Environment Variables

Create `.env.local` (not committed to Git):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

Get these values from Firebase Console → Project Settings → Your apps → SDK setup and configuration.

### Next.js Static Export Configuration

For Firebase Hosting (static), add to `next.config.ts`:

```typescript
const nextConfig = {
  output: 'export',  // Enable static export
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
```

**Warning:** This disables Next.js server features (API routes, SSR, ISR). For server features, use Firebase Functions.

---

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

```bash
# Full deployment with all checks
node scripts/firebase-deploy.js

# Quick deployment (skip build)
node scripts/firebase-deploy.js --skip-build

# Deploy all services
node scripts/firebase-deploy.js --target=all

# Dry run (validation only)
node scripts/firebase-deploy.js --dry-run

# Deploy firestore rules only
node scripts/firebase-deploy.js --target=firestore

# Deploy storage rules only
node scripts/firebase-deploy.js --target=storage
```

**Script Features:**
- ✅ Pre-deployment validation
- ✅ Automatic builds
- ✅ Test execution (if configured)
- ✅ Deployment confirmation
- ✅ Post-deployment validation
- ✅ Deployment logging

### Method 2: NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "deploy": "node scripts/firebase-deploy.js",
    "deploy:hosting": "node scripts/firebase-deploy.js --target=hosting",
    "deploy:firestore": "node scripts/firebase-deploy.js --target=firestore",
    "deploy:all": "node scripts/firebase-deploy.js --target=all",
    "deploy:dry-run": "node scripts/firebase-deploy.js --dry-run"
  }
}
```

Then deploy with:

```bash
npm run deploy
```

### Method 3: Manual Deployment

```bash
# 1. Build the project
npm run build

# 2. Export static files (if using static export)
npm run export  # Add this script: "export": "next export"

# 3. Deploy to Firebase
firebase deploy

# Or deploy specific targets
firebase deploy --only hosting
firebase deploy --only firestore
firebase deploy --only storage
```

---

## Troubleshooting

### Common Issues

#### 1. Build Errors

**Issue:** `npm run build` fails

**Solutions:**
```bash
# Fix missing dependencies
npm install

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep "Type error"
```

#### 2. Firebase CLI Not Found

**Issue:** `firebase: command not found`

**Solution:**
```bash
# Install globally
npm install -g firebase-tools

# Or use npx
npx firebase deploy
```

#### 3. Authentication Errors

**Issue:** `Error: Not authenticated`

**Solution:**
```bash
# Re-login
firebase logout
firebase login

# Use specific account
firebase login --reauth
```

#### 4. 404 Errors After Deployment

**Issue:** All routes show 404

**Causes & Solutions:**

1. **Incorrect public directory**
   - Check `firebase.json` → `hosting.public` matches build output
   - For Next.js export: `"public": "out"`
   - For static build: `"public": ".next"`

2. **Missing rewrites**
   - Add to `firebase.json`:
   ```json
   {
     "hosting": {
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

3. **Build not exported**
   - Ensure `next.config.ts` has `output: 'export'`
   - Run `next build` which should create `out` directory

#### 5. Environment Variables Not Working

**Issue:** `process.env.NEXT_PUBLIC_*` is undefined

**Solutions:**
```bash
# Verify .env.local exists
ls -la .env.local

# Rebuild after changing .env.local
npm run build

# Check variable names start with NEXT_PUBLIC_
# Client-side variables MUST have this prefix
```

#### 6. Firestore Permission Denied

**Issue:** `Error: Permission denied`

**Solutions:**

1. **Check Firestore rules** (`firestore.rules`):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated access
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

2. **Deploy rules separately:**
   ```bash
   firebase deploy --only firestore:rules
   ```

#### 7. Storage Upload Fails

**Issue:** File upload to Firebase Storage fails

**Solutions:**

1. **Check storage rules** (`storage.rules`):
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

2. **Deploy storage rules:**
   ```bash
   firebase deploy --only storage
   ```

#### 8. Large Build Size / Slow Deployment

**Issue:** Deployment takes too long

**Solutions:**

1. **Optimize build:**
   ```bash
   # Analyze bundle size
   npm install -D @next/bundle-analyzer

   # Add to next.config.ts
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   })

   module.exports = withBundleAnalyzer(nextConfig)

   # Run analysis
   ANALYZE=true npm run build
   ```

2. **Use .gitignore patterns in firebase.json:**
   ```json
   {
     "hosting": {
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**",
         "**/*.map"
       ]
     }
   }
   ```

---

## Rollback Procedures

### Quick Rollback

```bash
# View deployment history
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live

# Example:
firebase hosting:clone mysite-123:version-abc mysite-123:live
```

### Manual Rollback

1. **Find previous version:**
   ```bash
   # Go to Firebase Console
   # → Hosting → Release history
   # → Click on previous successful deployment
   # → Click "Rollback"
   ```

2. **Redeploy from Git:**
   ```bash
   # Checkout previous commit
   git log --oneline
   git checkout <commit-hash>

   # Rebuild and deploy
   npm run build
   firebase deploy --only hosting

   # Return to latest
   git checkout main
   ```

### Rollback Firestore Rules

```bash
# Firestore rules are versioned automatically
# Go to Firebase Console → Firestore → Rules → "Rules History"
# Click on previous version and publish
```

---

## Best Practices

### 1. Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Build completes without errors
- [ ] Environment variables configured
- [ ] Firestore rules updated
- [ ] Storage rules updated
- [ ] Backup current deployment version
- [ ] Notify team of deployment

### 2. Deployment Strategy

**Staging Environment:**
```bash
# Create staging project in Firebase Console
# Add to .firebaserc:
{
  "projects": {
    "default": "prod-project-id",
    "staging": "staging-project-id"
  }
}

# Deploy to staging
firebase use staging
firebase deploy

# Deploy to production
firebase use default
firebase deploy
```

**Gradual Rollout:**
```bash
# Deploy to preview channel first
firebase hosting:channel:deploy preview

# Test preview:
# https://PROJECT_ID--preview-CHANNEL_ID.web.app

# Promote to live
firebase hosting:channel:deploy live
```

### 3. Monitoring

**Setup monitoring:**

1. Enable Firebase Performance Monitoring
2. Enable Firebase Crashlytics
3. Setup alerts in Firebase Console

**Check deployment logs:**
```bash
# View hosting logs
firebase hosting:channel:list

# View function logs (if using)
firebase functions:log
```

### 4. Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Reference in deployment logs
# (Automated script logs this automatically)
```

### 5. Security

- Never commit `.env.local`
- Review security rules before deployment
- Use Firebase App Check for additional security
- Enable CORS properly for API routes
- Keep dependencies updated

### 6. Performance

- Enable HTTP/2 push (automatic with Firebase Hosting)
- Use Firebase CDN (automatic)
- Enable caching headers
- Optimize images before upload
- Use lazy loading for components

---

## Deployment Logs

All automated deployments are logged to `logs/deployments.json`:

```json
[
  {
    "timestamp": "2026-01-14T10:30:00.000Z",
    "duration": "45.2s",
    "target": "hosting",
    "success": true,
    "error": null,
    "dryRun": false
  }
]
```

View recent deployments:
```bash
cat logs/deployments.json | jq '.[-5:]'
```

---

## Quick Reference

### Common Commands

```bash
# Deploy everything
npm run deploy

# Deploy hosting only
npm run deploy:hosting

# Validate without deploying
npm run deploy:dry-run

# View deployment help
node scripts/firebase-deploy.js --help

# Manual Firebase commands
firebase deploy --only hosting
firebase deploy --only firestore
firebase deploy --only storage
firebase projects:list
firebase use <project-id>
```

### File Structure

```
miryangosweb/
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase projects
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── storage.rules          # Storage security rules
├── .env.local            # Environment variables (not committed)
├── scripts/
│   └── firebase-deploy.js # Deployment automation
├── logs/
│   └── deployments.json  # Deployment history
└── out/                  # Build output (generated)
```

---

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Next.js Static Export Guide](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage Rules](https://firebase.google.com/docs/storage/security)

---

## Support

For issues specific to this project:
1. Check [Troubleshooting](#troubleshooting) section
2. Review deployment logs: `logs/deployments.json`
3. Check Firebase Console for deployment status
4. Review build logs: `npm run build`

For Firebase-specific issues:
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)
