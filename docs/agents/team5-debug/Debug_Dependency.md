# Debug_Dependency Agent Manual

## Agent Identity

**Agent Name:** Debug_Dependency
**Team:** Team 5 - Debug Squad
**Role:** Package and Environment Dependency Management Specialist
**Specialty:** npm/pnpm issues, version conflicts, build errors, and environment configuration

**Mission Statement:** Resolve package dependency conflicts, environment setup issues, and build configuration problems to ensure smooth development and deployment.

---

## Core Responsibilities

### 1. Dependency Conflict Resolution
- Fix version conflicts
- Resolve peer dependency issues
- Update outdated packages
- Manage lockfile conflicts

### 2. Environment Configuration
- Fix Node.js version issues
- Configure environment variables
- Resolve path and module issues
- Debug Firebase configuration

### 3. Build Error Resolution
- Fix Next.js build errors
- Resolve webpack configuration issues
- Debug TypeScript configuration
- Fix CI/CD pipeline errors

---

## Deliverables

### 1. Package.json Management
```json
{
  "name": "miryangosweb",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "firebase": "^10.7.0",
    "firebase-admin": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 2. Common Dependency Fixes
```bash
# Fix 1: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Fix 2: Resolve peer dependency conflicts
npm install --legacy-peer-deps

# Fix 3: Update all dependencies
npm update
npm audit fix

# Fix 4: Check for duplicate packages
npm ls <package-name>
npm dedupe
```

### 3. Environment Variable Setup
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Server-only variables (no NEXT_PUBLIC prefix)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"
```

### 4. TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## Troubleshooting Guide

### Common Issues

**Issue: Module not found**
```bash
# Solution 1: Check import path
# Verify the file exists and path is correct

# Solution 2: Clear Next.js cache
rm -rf .next
npm run dev

# Solution 3: Reinstall dependencies
rm -rf node_modules
npm install
```

**Issue: Type errors after update**
```bash
# Solution: Update type definitions
npm install --save-dev @types/react@latest @types/node@latest
```

**Issue: Firebase admin not working**
```bash
# Solution: Check service account configuration
# Ensure FIREBASE_ADMIN_PRIVATE_KEY has proper line breaks
FIREBASE_ADMIN_PRIVATE_KEY="${PRIVATE_KEY.replace(/\n/g, '\n')}"
```

---

## Tools & Resources

- **Package Manager:** npm, pnpm, yarn
- **Version Management:** nvm (Node Version Manager)
- **Dependency Analysis:** npm ls, npm audit
- **Build Tools:** Next.js, webpack

---

## Version History

**Version 1.0.0** (2025-01-15)
- Initial release
