# Multi-Environment Deployment Workflow

Complete guide for managing deployments across Development, Staging, and Production environments.

## Table of Contents

- [Overview](#overview)
- [Environment Setup](#environment-setup)
- [Workflow Strategies](#workflow-strategies)
- [Deployment Commands](#deployment-commands)
- [Environment Configurations](#environment-configurations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project supports three deployment environments:

| Environment | Purpose | Approvals | Tests | Smoke Tests |
|-------------|---------|-----------|-------|-------------|
| **Development** | Quick iteration, feature testing | ❌ No | ❌ No | ❌ No |
| **Staging** | Pre-production testing, QA | ✅ Yes | ✅ Yes | ✅ Yes |
| **Production** | Live user-facing site | ✅✅ Double | ✅ Yes | ✅ Yes |

### Key Features

- 🌍 **Environment isolation**: Separate Firebase projects for each environment
- 🔒 **Safety controls**: Approval workflows and validation checks
- 🧪 **Automated testing**: Run tests before deployment
- 💨 **Smoke tests**: Post-deployment validation
- 📊 **Deployment logging**: Track all deployments with timestamps
- 🎨 **Color-coded output**: Visual distinction between environments

---

## Environment Setup

### 1. Create Firebase Projects

Create three separate Firebase projects:

```bash
# Example naming convention:
# - miryangosweb-dev
# - miryangosweb-staging
# - miryangosweb-prod
```

**In Firebase Console:**
1. Go to https://console.firebase.google.com
2. Create three projects (one for each environment)
3. Enable required services in each:
   - Firebase Hosting
   - Cloud Firestore
   - Cloud Storage

### 2. Configure .firebaserc

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

**Notes:**
- `default` is used as the production environment
- Replace with your actual Firebase project IDs
- Keep this file in version control

### 3. Setup Environment Variables

For each environment, create an environment-specific file:

```bash
# Development
cp .env.development .env.development.local

# Staging
cp .env.staging .env.staging.local

# Production
cp .env.production .env.production.local
```

**Edit each `.env.<environment>.local` file:**

```env
# Example for .env.staging.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-staging-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=miryangosweb-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=miryangosweb-staging
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=miryangosweb-staging.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

GEMINI_API_KEY=your-gemini-api-key

NEXT_PUBLIC_ENV=staging
```

**Get Firebase credentials:**
1. Go to Firebase Console → Project Settings
2. Select "Your apps" → Web app
3. Copy the SDK configuration values

### 4. Update .gitignore

Ensure sensitive files are not committed:

```gitignore
# Environment variables
.env.local
.env.development.local
.env.staging.local
.env.production.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log

# Logs
logs/
*.log
```

---

## Workflow Strategies

### Strategy 1: Linear Progression (Recommended)

**Development → Staging → Production**

```bash
# 1. Deploy to development for initial testing
npm run deploy:dev

# 2. Test thoroughly in development
# Verify features, run manual tests

# 3. Deploy to staging for pre-production testing
npm run deploy:staging

# 4. Perform QA in staging
# Run smoke tests, user acceptance testing

# 5. Deploy to production
npm run deploy:prod
```

**Best for:**
- Major releases
- New features
- Critical bug fixes

### Strategy 2: Hotfix Workflow

**Development → Production (skip staging)**

```bash
# 1. Fix bug in development
npm run deploy:dev

# 2. Verify fix works

# 3. Deploy directly to production
npm run deploy:prod
```

**Best for:**
- Critical production bugs
- Security patches
- Minor urgent fixes

**⚠️ Use with caution - staging validation is skipped**

### Strategy 3: Feature Branch Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Deploy to development
npm run deploy:dev

# 3. Test feature

# 4. Merge to main
git checkout main
git merge feature/new-feature

# 5. Deploy to staging
npm run deploy:staging

# 6. After QA approval, deploy to production
npm run deploy:prod
```

**Best for:**
- Team workflows
- Large features
- Multiple concurrent developments

---

## Deployment Commands

### Quick Reference

```bash
# Development
npm run deploy:dev                    # Fast deployment, no approvals

# Staging
npm run deploy:staging                # Full checks, requires approval
npm run deploy:staging:dry-run        # Validate without deploying

# Production
npm run deploy:prod                   # Double approval, all checks
npm run deploy:prod:dry-run           # Validate production config
```

### Advanced Commands

```bash
# Deploy specific targets
node scripts/deploy-env.js --staging --target=firestore
node scripts/deploy-env.js --production --target=hosting

# Skip build (use existing build)
node scripts/deploy-env.js --staging --skip-build

# Skip tests (not recommended for production)
node scripts/deploy-env.js --staging --skip-tests

# Skip smoke tests
node scripts/deploy-env.js --staging --skip-smoke-tests

# Force approval for development
node scripts/deploy-env.js --dev --force-approval
```

### Complete Command Options

```
Usage: node scripts/deploy-env.js [environment] [options]

Environments:
  --development, --dev     Deploy to development
  --staging               Deploy to staging (default)
  --production, --prod    Deploy to production

Options:
  --target=<target>       hosting, firestore, storage, all
  --skip-build           Skip npm run build
  --skip-tests           Skip npm test
  --skip-smoke-tests     Skip post-deployment validation
  --force-approval       Require approval even for dev
  --dry-run              Validate without deploying
```

---

## Environment Configurations

### Development Environment

**Purpose:** Rapid iteration and feature development

**Characteristics:**
- ⚡ Fast deployments
- ❌ No approval required
- ❌ Tests optional
- ❌ No smoke tests
- 🎨 Cyan color scheme

**When to use:**
- Testing new features
- Quick bug fixes
- Experimentation
- Development previews

**Example:**
```bash
npm run deploy:dev
```

### Staging Environment

**Purpose:** Pre-production testing and QA

**Characteristics:**
- ✅ Approval required
- ✅ Tests run automatically
- ✅ Smoke tests performed
- 🎨 Yellow color scheme

**When to use:**
- Before production deployments
- User acceptance testing
- Integration testing
- Performance testing
- QA validation

**Example:**
```bash
npm run deploy:staging
# ✓ Validates configuration
# ✓ Runs build
# ✓ Runs tests
# ? Requests approval
# ✓ Deploys to Firebase
# ✓ Runs smoke tests
```

### Production Environment

**Purpose:** Live user-facing deployment

**Characteristics:**
- ✅✅ **Double approval** required
- ✅ **Mandatory** tests
- ✅ **Mandatory** smoke tests
- 🎨 Red color scheme
- ⚠️ Extra confirmation prompts

**When to use:**
- Final deployments
- Going live
- Hotfixes (after staging verification)

**Example:**
```bash
npm run deploy:prod
# ⚠️  WARNING: PRODUCTION DEPLOYMENT ⚠️
# ? Type 'yes' to confirm production deployment: yes
```

---

## Best Practices

### 1. Environment Parity

Keep environments as similar as possible:

- ✅ Use same Next.js version across all environments
- ✅ Same dependencies (package.json)
- ✅ Same Firebase rules structure
- ✅ Similar data in Firestore (sanitized production data in staging)

### 2. Testing Strategy

**Development:**
```bash
# Manual testing
npm run deploy:dev
# Test features manually
```

**Staging:**
```bash
# Automated + Manual testing
npm run deploy:staging
# Automated tests run automatically
# Perform manual smoke tests
# Run user acceptance testing
```

**Production:**
```bash
# Only deploy after staging validation
npm run deploy:staging        # First
# ✓ Complete QA
npm run deploy:prod          # Then
```

### 3. Version Control Integration

```bash
# Tag releases
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Deploy tagged version to production
git checkout v1.0.0
npm run deploy:prod
```

### 4. Rollback Procedures

**Quick Rollback:**

Firebase Hosting maintains version history:

1. Go to Firebase Console → Hosting → Release History
2. Find previous working version
3. Click "Rollback"

**Git-based Rollback:**

```bash
# Find last good commit
git log --oneline

# Checkout previous version
git checkout <commit-hash>

# Redeploy
npm run deploy:prod --skip-tests  # Emergency only

# Return to main
git checkout main
```

### 5. Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing locally
- [ ] Code reviewed and merged to main
- [ ] Environment variables configured
- [ ] Database migrations prepared (if any)
- [ ] Backup current production data

**During Deployment:**
- [ ] Monitor deployment progress
- [ ] Check for errors in console
- [ ] Verify build completes successfully

**Post-Deployment:**
- [ ] Run smoke tests
- [ ] Check critical user flows
- [ ] Monitor error rates
- [ ] Verify analytics tracking
- [ ] Notify team of deployment

### 6. Security Best Practices

**Environment Variables:**
- ✅ Never commit `.env.*.local` files
- ✅ Use different API keys per environment
- ✅ Rotate production keys regularly
- ✅ Store secrets in Firebase Functions config (if using)

**Firebase Rules:**
- ✅ Test rules in staging before production
- ✅ Use strict security rules in production
- ✅ Review rules before each deployment

**Access Control:**
- ✅ Limit production Firebase access
- ✅ Use role-based permissions
- ✅ Audit deployment logs regularly

### 7. Monitoring and Alerts

**Setup monitoring in each environment:**

```javascript
// Add to your app
if (process.env.NEXT_PUBLIC_ENV === 'production') {
  // Enable production monitoring
  // - Firebase Performance Monitoring
  // - Error tracking (Sentry, etc.)
  // - Analytics
}
```

**Monitor these metrics:**
- Deployment success/failure rate
- Build times
- Test pass rates
- Error rates post-deployment
- Performance metrics

---

## Troubleshooting

### Common Issues

#### 1. "No Firebase project configured for environment"

**Error:**
```
No Firebase project configured for "staging" environment.
```

**Solution:**
```bash
# Add to .firebaserc
{
  "projects": {
    "staging": "your-staging-project-id"
  }
}
```

#### 2. "Environment variables missing"

**Error:**
```
Missing environment variables: NEXT_PUBLIC_FIREBASE_API_KEY
```

**Solution:**
```bash
# Create environment-specific file
cp .env.staging .env.staging.local

# Edit and add your values
# Get values from Firebase Console → Project Settings
```

#### 3. "Build fails on specific environment"

**Issue:** Build works locally but fails in deployment script

**Solution:**
```bash
# Test build with environment variables
cp .env.staging.local .env.local
npm run build

# Check for environment-specific issues
```

#### 4. "Wrong Firebase project deployed to"

**Issue:** Accidentally deployed to production instead of staging

**Solution:**
```bash
# Check current Firebase project
firebase use

# Switch to correct project
firebase use staging

# Or use environment-specific commands
npm run deploy:staging  # This handles project switching
```

#### 5. "Smoke tests fail but site works"

**Issue:** curl test fails but manual check works

**Cause:** Site takes time to propagate to CDN

**Solution:**
```bash
# Wait 1-2 minutes and retry
# Or skip smoke tests if urgent
node scripts/deploy-env.js --staging --skip-smoke-tests
```

### Debugging Deployments

**View deployment logs:**
```bash
# Recent deployments
cat logs/deployments.json | jq '.[-5:]'

# Failed deployments
cat logs/deployments.json | jq '.[] | select(.success == false)'

# Production deployments only
cat logs/deployments.json | jq '.[] | select(.environment == "production")'

# Last 24 hours
cat logs/deployments.json | jq '.[] | select(.timestamp > "2026-01-13")'
```

**Firebase logs:**
```bash
# Switch to environment
firebase use staging

# View hosting logs
firebase hosting:channel:list

# View Firestore logs (if using Functions)
firebase functions:log
```

---

## Deployment Workflow Diagram

```
┌─────────────────┐
│  Development    │
│  (Fast & Loose) │
└────────┬────────┘
         │
         ├─> Feature Testing
         ├─> Bug Fixes
         ├─> Experiments
         │
         ↓
┌─────────────────┐
│    Staging      │
│ (QA & Testing)  │
└────────┬────────┘
         │
         ├─> Integration Tests
         ├─> User Acceptance
         ├─> Performance Tests
         ├─> Security Review
         │
         ↓
┌─────────────────┐
│   Production    │
│  (Live Users)   │
└─────────────────┘
```

---

## Quick Command Reference

```bash
# Development
npm run deploy:dev                 # Quick deploy, no checks

# Staging
npm run deploy:staging             # Full checks, approval required
npm run deploy:staging:dry-run     # Validate only

# Production
npm run deploy:prod                # Double approval, all checks
npm run deploy:prod:dry-run        # Validate prod config

# Advanced
node scripts/deploy-env.js --help  # Show all options
```

---

## Additional Resources

- [Main Firebase Deployment Guide](./FIREBASE_DEPLOYMENT.md)
- [Scripts README](../scripts/README.md)
- [Firebase Console](https://console.firebase.google.com)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## Support

For issues:
1. Check deployment logs: `cat logs/deployments.json`
2. Review this guide's [Troubleshooting](#troubleshooting) section
3. Check Firebase Console for deployment status
4. Verify environment configuration in `.firebaserc`
