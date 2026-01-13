# Firebase Deployment Scripts

Automated deployment tools for miryangosweb Firebase project with multi-environment support.

## Quick Start

### Single Environment Deployment

```bash
# Full deployment (recommended)
npm run deploy

# Dry run (validation only, no deployment)
npm run deploy:dry-run

# Deploy specific services
npm run deploy:hosting
npm run deploy:firestore
npm run deploy:storage
npm run deploy:all
```

### Multi-Environment Deployment (Recommended)

```bash
# Deploy to development (fast, no approvals)
npm run deploy:dev

# Deploy to staging (with tests and approvals)
npm run deploy:staging

# Deploy to production (double approval, full checks)
npm run deploy:prod

# Validate configurations
npm run deploy:staging:dry-run
npm run deploy:prod:dry-run
```

## Scripts Overview

### 1. firebase-deploy.js (Basic Deployment)

Simple, single-environment deployment with validation.

### Features

✅ **Pre-deployment validation**
- Firebase CLI installed and authenticated
- Configuration files exist
- Environment variables present

✅ **Automated building**
- Cleans previous builds
- Runs `npm run build`
- Verifies build output

✅ **Testing** (optional)
- Runs test suite if configured
- Can skip with `--skip-tests`

✅ **Safe deployment**
- User confirmation required
- Target-specific deployments
- Dry-run mode available

✅ **Deployment logging**
- Logs all deployments to `logs/deployments.json`
- Tracks success/failure, duration, timestamp

### Usage

```bash
# Basic deployment
node scripts/firebase-deploy.js

# With options
node scripts/firebase-deploy.js [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--target=<service>` | Deploy specific service (hosting, firestore, storage, all) |
| `--skip-build` | Skip the build step |
| `--skip-tests` | Skip running tests |
| `--dry-run` | Validate without deploying |
| `--help, -h` | Show help message |

### Examples

```bash
# Deploy only hosting (default)
node scripts/firebase-deploy.js

# Deploy all Firebase services
node scripts/firebase-deploy.js --target=all

# Quick deploy (skip build and tests)
node scripts/firebase-deploy.js --skip-build --skip-tests

# Validate configuration without deploying
node scripts/firebase-deploy.js --dry-run

# Deploy only Firestore rules
node scripts/firebase-deploy.js --target=firestore

# Deploy only Storage rules
node scripts/firebase-deploy.js --target=storage
```

## Deployment Workflow

The script follows a 5-step process:

### Step 1: Pre-deployment Validation
- ✓ Check Firebase CLI installed
- ✓ Verify firebase.json exists
- ✓ Check Firebase authentication
- ✓ Validate environment variables

### Step 2: Build Project
- Clean previous build directory
- Run `npm run build`
- Verify build output
- Report build size

### Step 3: Run Tests (Optional)
- Execute `npm test` if script exists
- Can skip with `--skip-tests`
- Prompts to continue if tests fail

### Step 4: Deploy to Firebase
- Confirm deployment with user
- Execute `firebase deploy --only <target>`
- Monitor deployment progress

### Step 5: Post-deployment Validation
- Display deployment URL
- Prompt for manual verification
- Log deployment details

## Deployment Logs

All deployments are logged to `logs/deployments.json`:

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
# Last 5 deployments
cat logs/deployments.json | jq '.[-5:]'

# Failed deployments only
cat logs/deployments.json | jq '.[] | select(.success == false)'
```

## NPM Scripts Reference

### Basic Deployment Scripts

```json
{
  "scripts": {
    "deploy": "node scripts/firebase-deploy.js",
    "deploy:hosting": "node scripts/firebase-deploy.js --target=hosting",
    "deploy:firestore": "node scripts/firebase-deploy.js --target=firestore",
    "deploy:storage": "node scripts/firebase-deploy.js --target=storage",
    "deploy:all": "node scripts/firebase-deploy.js --target=all",
    "deploy:dry-run": "node scripts/firebase-deploy.js --dry-run"
  }
}
```

### Multi-Environment Scripts (Recommended)

```json
{
  "scripts": {
    "deploy:dev": "node scripts/deploy-env.js --development",
    "deploy:staging": "node scripts/deploy-env.js --staging",
    "deploy:prod": "node scripts/deploy-env.js --production",
    "deploy:staging:dry-run": "node scripts/deploy-env.js --staging --dry-run",
    "deploy:prod:dry-run": "node scripts/deploy-env.js --production --dry-run"
  }
}
```

---

## 2. deploy-env.js (Multi-Environment Deployment)

**Advanced deployment script with full environment support.**

### Features

✅ **Environment isolation**
- Separate Firebase projects for dev, staging, production
- Environment-specific configurations
- Automatic project switching

✅ **Enhanced safety**
- Double approval for production
- Environment-specific validation
- Color-coded output per environment

✅ **Smoke testing**
- Post-deployment validation
- Automated accessibility checks
- Manual verification checklist

✅ **Environment-aware builds**
- Loads environment-specific variables
- Validates required configurations
- Builds with correct env settings

### Usage

```bash
# Deploy to specific environment
node scripts/deploy-env.js --staging

# Or use npm scripts
npm run deploy:staging
```

### Environments

| Environment | Color | Approval | Tests | Smoke Tests |
|-------------|-------|----------|-------|-------------|
| Development | Cyan  | ❌ No    | ❌ No | ❌ No       |
| Staging     | Yellow| ✅ Yes   | ✅ Yes| ✅ Yes      |
| Production  | Red   | ✅✅ Double| ✅ Yes| ✅ Yes     |

### Commands

```bash
# Development
npm run deploy:dev                    # Fast, no checks
node scripts/deploy-env.js --dev

# Staging
npm run deploy:staging                # Full checks
npm run deploy:staging:dry-run        # Validate only
node scripts/deploy-env.js --staging --target=firestore

# Production
npm run deploy:prod                   # Double approval
npm run deploy:prod:dry-run           # Validate only
node scripts/deploy-env.js --production --skip-smoke-tests

# Advanced options
node scripts/deploy-env.js --help     # Show all options
```

### Setup Requirements

1. **Create Firebase projects** (dev, staging, prod)
2. **Update `.firebaserc`:**
   ```json
   {
     "projects": {
       "development": "your-dev-project-id",
       "staging": "your-staging-project-id",
       "default": "your-prod-project-id"
     }
   }
   ```

3. **Create environment files:**
   ```bash
   cp .env.development .env.development.local
   cp .env.staging .env.staging.local
   cp .env.production .env.production.local
   ```

4. **Fill in credentials** from Firebase Console

See [Setup Guide](../docs/SETUP_GUIDE.md) for detailed instructions.

## Troubleshooting

### "Firebase CLI not installed"

```bash
npm install -g firebase-tools
```

### "Not authenticated"

```bash
firebase login
```

### "Build failed"

```bash
# Check for errors
npm run build

# Fix dependencies
npm install

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### "firebase.json not found"

```bash
firebase init
```

## Best Practices

### Multi-Environment Workflow

1. **Use the right environment for the task**
   ```bash
   npm run deploy:dev          # Quick feature testing
   npm run deploy:staging      # Pre-production QA
   npm run deploy:prod         # Live deployment
   ```

2. **Always validate before production**
   ```bash
   npm run deploy:staging:dry-run   # Check staging config
   npm run deploy:staging           # Deploy to staging
   # ✓ Test thoroughly
   npm run deploy:prod:dry-run      # Validate prod config
   npm run deploy:prod              # Deploy to production
   ```

3. **Use staging for QA**
   - Create separate Firebase project for staging
   - Deploy all changes to staging first
   - Run full QA cycle
   - Then deploy to production

4. **Monitor deployments**
   - Check Firebase Console after deployment
   - Review deployment logs: `cat logs/deployments.json`
   - Test all critical features

5. **Keep backups**
   - Firebase Hosting maintains version history
   - Can rollback from Firebase Console
   - Keep Git tags for releases

## Related Documentation

- [Quick Setup Guide](../docs/SETUP_GUIDE.md) - Get started in 10 minutes
- [Multi-Environment Deployment Guide](../docs/MULTI_ENV_DEPLOYMENT.md) - Complete workflow guide
- [Complete Firebase Deployment Guide](../docs/FIREBASE_DEPLOYMENT.md) - Detailed Firebase docs
- [Firebase Console](https://console.firebase.google.com)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

## Support

For issues:
1. Check [deployment logs](#deployment-logs)
2. Review [troubleshooting guide](../docs/FIREBASE_DEPLOYMENT.md#troubleshooting)
3. Check Firebase Console for errors
