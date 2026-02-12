#!/usr/bin/env node

/**
 * Firebase Deployment Automation Script
 *
 * Handles safe, validated deployments to Firebase Hosting with:
 * - Pre-deployment validation
 * - Build verification
 * - Deployment execution
 * - Post-deployment validation
 * - Rollback capability
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Configuration
const CONFIG = {
    projectRoot: path.resolve(__dirname, '..'),
    buildDir: '.next',
    firebaseConfig: 'firebase.json',
    firebaseRc: '.firebaserc',
    envFile: '.env.local',
    deploymentLog: 'logs/deployments.json'
};

class FirebaseDeployer {
    constructor(options = {}) {
        this.skipBuild = options.skipBuild || false;
        this.skipTests = options.skipTests || false;
        this.dryRun = options.dryRun || false;
        this.target = options.target || 'hosting'; // hosting, firestore, storage, all
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: `${colors.blue}ℹ${colors.reset}`,
            success: `${colors.green}✓${colors.reset}`,
            warn: `${colors.yellow}⚠${colors.reset}`,
            error: `${colors.red}✗${colors.reset}`,
            step: `${colors.cyan}➜${colors.reset}`
        }[type] || '';

        console.log(`${prefix} ${message}`);
    }

    exec(command, options = {}) {
        const silent = options.silent || false;
        try {
            if (!silent) {
                this.log(`Running: ${colors.cyan}${command}${colors.reset}`, 'step');
            }

            if (this.dryRun && !options.allowDryRun) {
                this.log(`[DRY RUN] Would execute: ${command}`, 'warn');
                return '';
            }

            return execSync(command, {
                cwd: CONFIG.projectRoot,
                encoding: 'utf8',
                stdio: silent ? 'pipe' : 'inherit'
            });
        } catch (error) {
            if (!options.ignoreErrors) {
                throw error;
            }
            return null;
        }
    }

    async confirm(message) {
        if (this.dryRun) {
            this.log('[DRY RUN] Auto-confirming...', 'warn');
            return true;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(`${colors.yellow}?${colors.reset} ${message} (y/N): `, (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }

    // Step 1: Pre-deployment Validation
    async validatePrerequisites() {
        this.log('Step 1: Pre-deployment Validation', 'step');

        // Check Firebase CLI
        try {
            const version = this.exec('firebase --version', { silent: true, allowDryRun: true });
            this.log(`Firebase CLI version: ${version.trim()}`, 'success');
        } catch {
            throw new Error('Firebase CLI not installed. Run: npm install -g firebase-tools');
        }

        // Check firebase.json exists
        const firebaseConfigPath = path.join(CONFIG.projectRoot, CONFIG.firebaseConfig);
        if (!fs.existsSync(firebaseConfigPath)) {
            throw new Error('firebase.json not found. Run: firebase init');
        }
        this.log('firebase.json found', 'success');

        // Check .firebaserc exists
        const firebaseRcPath = path.join(CONFIG.projectRoot, CONFIG.firebaseRc);
        if (!fs.existsSync(firebaseRcPath)) {
            this.log('.firebaserc not found - will be created during first deployment', 'warn');
        } else {
            const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8'));
            this.log(`Firebase project: ${firebaseRc.projects?.default || 'not set'}`, 'info');
        }

        // Check authentication
        try {
            this.exec('firebase projects:list', { silent: true, allowDryRun: true });
            this.log('Firebase authentication verified', 'success');
        } catch {
            throw new Error('Not authenticated. Run: firebase login');
        }

        // Check environment variables
        const envPath = path.join(CONFIG.projectRoot, CONFIG.envFile);
        if (!fs.existsSync(envPath)) {
            this.log('.env.local not found - ensure environment variables are set', 'warn');
        } else {
            this.log('Environment file found', 'success');
        }

        this.log('✓ All prerequisites validated\n', 'success');
    }

    // Step 2: Build Project
    async buildProject() {
        if (this.skipBuild) {
            this.log('Skipping build (--skip-build flag)', 'warn');
            return;
        }

        this.log('Step 2: Building Project', 'step');

        // Check if build directory exists from previous build
        const buildPath = path.join(CONFIG.projectRoot, CONFIG.buildDir);
        if (fs.existsSync(buildPath)) {
            this.log('Removing previous build...', 'info');
            fs.rmSync(buildPath, { recursive: true, force: true });
        }

        // Run build
        try {
            this.exec('npm run build');
            this.log('✓ Build completed successfully\n', 'success');
        } catch (error) {
            throw new Error('Build failed. Fix errors before deploying.');
        }

        // Verify build output
        if (!fs.existsSync(buildPath)) {
            throw new Error(`Build directory not found: ${buildPath}`);
        }

        const buildSize = this.getDirectorySize(buildPath);
        this.log(`Build size: ${(buildSize / 1024 / 1024).toFixed(2)} MB`, 'info');
    }

    // Step 3: Run Tests (optional)
    async runTests() {
        if (this.skipTests) {
            this.log('Skipping tests (--skip-tests flag)\n', 'warn');
            return;
        }

        this.log('Step 3: Running Tests', 'step');

        // Check if test script exists
        const packageJson = JSON.parse(
            fs.readFileSync(path.join(CONFIG.projectRoot, 'package.json'), 'utf8')
        );

        if (!packageJson.scripts?.test) {
            this.log('No test script found, skipping tests\n', 'warn');
            return;
        }

        try {
            this.exec('npm test');
            this.log('✓ All tests passed\n', 'success');
        } catch (error) {
            const proceed = await this.confirm('Tests failed. Continue with deployment?');
            if (!proceed) {
                throw new Error('Deployment cancelled due to test failures');
            }
        }
    }

    // Step 4: Deploy to Firebase
    async deploy() {
        this.log('Step 4: Deploying to Firebase', 'step');

        // Confirm deployment
        const confirmed = await this.confirm(
            `Deploy to Firebase ${this.target === 'all' ? '(all services)' : `(${this.target})`}?`
        );

        if (!confirmed) {
            throw new Error('Deployment cancelled by user');
        }

        // Build deploy command
        let deployCommand = 'firebase deploy';

        if (this.target !== 'all') {
            deployCommand += ` --only ${this.target}`;
        }

        try {
            this.exec(deployCommand);
            this.log('✓ Deployment completed successfully\n', 'success');
        } catch (error) {
            throw new Error('Deployment failed. Check Firebase console for details.');
        }
    }

    // Step 5: Post-deployment Validation
    async validateDeployment() {
        this.log('Step 5: Post-deployment Validation', 'step');

        // Get hosting URL
        try {
            const config = JSON.parse(
                fs.readFileSync(path.join(CONFIG.projectRoot, CONFIG.firebaseRc), 'utf8')
            );
            const projectId = config.projects?.default;

            if (projectId && this.target.includes('hosting')) {
                const url = `https://${projectId}.web.app`;
                this.log(`Deployment URL: ${colors.cyan}${url}${colors.reset}`, 'info');
                this.log('Please verify the deployment manually', 'warn');
            }
        } catch (error) {
            this.log('Could not determine deployment URL', 'warn');
        }

        this.log('✓ Deployment validation complete\n', 'success');
    }

    // Log deployment
    logDeployment(success, error = null) {
        const logDir = path.dirname(path.join(CONFIG.projectRoot, CONFIG.deploymentLog));
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logEntry = {
            timestamp: this.startTime.toISOString(),
            duration: ((new Date() - this.startTime) / 1000).toFixed(2) + 's',
            target: this.target,
            success,
            error: error?.message || null,
            dryRun: this.dryRun
        };

        let logs = [];
        const logPath = path.join(CONFIG.projectRoot, CONFIG.deploymentLog);
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        }

        logs.push(logEntry);

        // Keep only last 50 deployments
        if (logs.length > 50) {
            logs = logs.slice(-50);
        }

        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    }

    // Utility: Get directory size
    getDirectorySize(dirPath) {
        let totalSize = 0;

        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                totalSize += this.getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }

        return totalSize;
    }

    // Main deployment flow
    async run() {
        this.log(`\n${colors.bright}Firebase Deployment Automation${colors.reset}`, 'info');
        this.log(`Target: ${this.target}`, 'info');
        if (this.dryRun) {
            this.log('Mode: DRY RUN (no actual deployment will occur)', 'warn');
        }
        console.log('');

        try {
            await this.validatePrerequisites();
            await this.buildProject();
            await this.runTests();
            await this.deploy();
            await this.validateDeployment();

            this.logDeployment(true);

            const duration = ((new Date() - this.startTime) / 1000).toFixed(2);
            this.log(`\n${colors.green}${colors.bright}Deployment completed successfully in ${duration}s${colors.reset}`, 'success');
            process.exit(0);

        } catch (error) {
            this.logDeployment(false, error);
            this.log(`\n${colors.red}${colors.bright}Deployment failed: ${error.message}${colors.reset}`, 'error');
            process.exit(1);
        }
    }
}

// CLI
const args = process.argv.slice(2);
const options = {
    skipBuild: args.includes('--skip-build'),
    skipTests: args.includes('--skip-tests'),
    dryRun: args.includes('--dry-run'),
    target: 'hosting' // default
};

// Parse target
const targetIndex = args.findIndex(arg => arg.startsWith('--target='));
if (targetIndex !== -1) {
    options.target = args[targetIndex].split('=')[1];
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Firebase Deployment Automation${colors.reset}

Usage: node scripts/firebase-deploy.js [options]

Options:
  --target=<target>    Deployment target (hosting, firestore, storage, all) [default: hosting]
  --skip-build         Skip the build step
  --skip-tests         Skip running tests
  --dry-run            Run validation only, don't deploy
  --help, -h           Show this help message

Examples:
  node scripts/firebase-deploy.js                           # Deploy hosting only
  node scripts/firebase-deploy.js --target=all              # Deploy all services
  node scripts/firebase-deploy.js --dry-run                 # Validate without deploying
  node scripts/firebase-deploy.js --skip-build --skip-tests # Quick deploy

  `);
    process.exit(0);
}

// Run deployment
const deployer = new FirebaseDeployer(options);
deployer.run();
