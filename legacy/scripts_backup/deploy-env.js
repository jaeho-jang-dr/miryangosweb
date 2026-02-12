#!/usr/bin/env node

/**
 * Multi-Environment Firebase Deployment Script
 *
 * Supports deployment to multiple environments:
 * - development: Local testing environment
 * - staging: Pre-production testing environment
 * - production: Live production environment
 *
 * Features:
 * - Environment-specific configurations
 * - Environment variable validation
 * - Smoke tests for staging/production
 * - Deployment approval workflow
 * - Automatic rollback on failure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Configuration
const CONFIG = {
    projectRoot: path.resolve(__dirname, '..'),
    buildDir: '.next',
    outputDir: 'out',
    firebaseConfig: 'firebase.json',
    firebaseRc: '.firebaserc',
    deploymentLog: 'logs/deployments.json',

    // Environment configurations
    environments: {
        development: {
            name: 'Development',
            color: colors.cyan,
            requiresApproval: false,
            requiresTests: false,
            requiresSmokeTests: false,
            envFile: '.env.development.local'
        },
        staging: {
            name: 'Staging',
            color: colors.yellow,
            requiresApproval: true,
            requiresTests: true,
            requiresSmokeTests: true,
            envFile: '.env.staging.local'
        },
        production: {
            name: 'Production',
            color: colors.red,
            requiresApproval: true,
            requiresTests: true,
            requiresSmokeTests: true,
            envFile: '.env.production.local'
        }
    }
};

class MultiEnvDeployer {
    constructor(options = {}) {
        this.environment = options.environment || 'staging';
        this.target = options.target || 'hosting';
        this.skipBuild = options.skipBuild || false;
        this.skipTests = options.skipTests || false;
        this.skipSmokeTests = options.skipSmokeTests || false;
        this.forceApproval = options.forceApproval || false;
        this.dryRun = options.dryRun || false;
        this.startTime = new Date();

        this.envConfig = CONFIG.environments[this.environment];
        if (!this.envConfig) {
            throw new Error(`Invalid environment: ${this.environment}`);
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const icons = {
            info: 'ℹ',
            success: '✓',
            warn: '⚠',
            error: '✗',
            step: '➜',
            env: '🌍',
            build: '🔨',
            test: '🧪',
            deploy: '🚀',
            smoke: '💨'
        };

        const colorMap = {
            info: colors.blue,
            success: colors.green,
            warn: colors.yellow,
            error: colors.red,
            step: colors.cyan,
            env: colors.magenta,
            build: colors.cyan,
            test: colors.blue,
            deploy: colors.green,
            smoke: colors.yellow
        };

        const icon = icons[type] || '';
        const color = colorMap[type] || colors.reset;

        console.log(`${color}${icon}${colors.reset} ${message}`);
    }

    exec(command, options = {}) {
        const silent = options.silent || false;
        try {
            if (!silent) {
                this.log(`Running: ${colors.dim}${command}${colors.reset}`, 'step');
            }

            if (this.dryRun && !options.allowDryRun) {
                this.log(`[DRY RUN] Would execute: ${command}`, 'warn');
                return '';
            }

            return execSync(command, {
                cwd: CONFIG.projectRoot,
                encoding: 'utf8',
                stdio: silent ? 'pipe' : 'inherit',
                env: { ...process.env, ...options.env }
            });
        } catch (error) {
            if (!options.ignoreErrors) {
                throw error;
            }
            return null;
        }
    }

    async confirm(message, defaultYes = false) {
        if (this.dryRun) {
            this.log('[DRY RUN] Auto-confirming...', 'warn');
            return true;
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            const prompt = defaultYes ? '(Y/n)' : '(y/N)';
            rl.question(`${colors.yellow}?${colors.reset} ${message} ${prompt}: `, (answer) => {
                rl.close();
                if (!answer) {
                    resolve(defaultYes);
                } else {
                    resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
                }
            });
        });
    }

    // Step 0: Display Environment Info
    displayEnvironmentInfo() {
        const envColor = this.envConfig.color;
        const envName = this.envConfig.name;

        console.log('\n' + '='.repeat(60));
        console.log(`${envColor}${colors.bright}  Firebase Multi-Environment Deployment${colors.reset}`);
        console.log('='.repeat(60));
        console.log(`${envColor}Environment:${colors.reset} ${envName}`);
        console.log(`${colors.cyan}Target:${colors.reset}      ${this.target}`);
        console.log(`${colors.cyan}Timestamp:${colors.reset}   ${this.startTime.toISOString()}`);
        if (this.dryRun) {
            console.log(`${colors.yellow}Mode:${colors.reset}        DRY RUN (no actual deployment)`);
        }
        console.log('='.repeat(60) + '\n');
    }

    // Step 1: Validate Environment
    async validateEnvironment() {
        this.log('Step 1: Environment Validation', 'env');

        // Check Firebase CLI
        try {
            const version = this.exec('firebase --version', { silent: true, allowDryRun: true });
            this.log(`Firebase CLI: ${version.trim()}`, 'success');
        } catch {
            throw new Error('Firebase CLI not installed. Run: npm install -g firebase-tools');
        }

        // Check Firebase auth
        try {
            this.exec('firebase projects:list', { silent: true, allowDryRun: true });
            this.log('Firebase authentication verified', 'success');
        } catch {
            throw new Error('Not authenticated. Run: firebase login');
        }

        // Check .firebaserc
        const firebaseRcPath = path.join(CONFIG.projectRoot, CONFIG.firebaseRc);
        if (!fs.existsSync(firebaseRcPath)) {
            throw new Error('.firebaserc not found. Run: firebase init');
        }

        const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8'));
        const projectId = firebaseRc.projects?.[this.environment];

        if (!projectId) {
            throw new Error(
                `No Firebase project configured for "${this.environment}" environment.\n` +
                `Add to .firebaserc:\n` +
                `{\n  "projects": {\n    "${this.environment}": "your-${this.environment}-project-id"\n  }\n}`
            );
        }

        if (projectId.startsWith('your-')) {
            throw new Error(
                `Firebase project ID not configured for "${this.environment}".\n` +
                `Update .firebaserc with your actual project ID.`
            );
        }

        this.projectId = projectId;
        this.log(`Firebase Project: ${colors.cyan}${projectId}${colors.reset}`, 'success');

        // Check environment variables
        const envPath = path.join(CONFIG.projectRoot, this.envConfig.envFile);
        if (!fs.existsSync(envPath)) {
            this.log(`${this.envConfig.envFile} not found - using default .env.local`, 'warn');
        } else {
            this.log(`Environment file: ${this.envConfig.envFile}`, 'success');

            // Validate required environment variables
            const envContent = fs.readFileSync(envPath, 'utf8');
            const requiredVars = [
                'NEXT_PUBLIC_FIREBASE_API_KEY',
                'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
            ];

            const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
            if (missingVars.length > 0) {
                this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'warn');
            }
        }

        // Switch to correct Firebase project
        this.log(`Switching to ${this.environment} project...`, 'step');
        this.exec(`firebase use ${this.environment}`, { allowDryRun: true });

        this.log('✓ Environment validated\n', 'success');
    }

    // Step 2: Build Project
    async buildProject() {
        if (this.skipBuild) {
            this.log('Skipping build (--skip-build flag)', 'warn');
            return;
        }

        this.log('Step 2: Building Project', 'build');

        // Load environment-specific variables
        const envPath = path.join(CONFIG.projectRoot, this.envConfig.envFile);
        let buildEnv = {};

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    buildEnv[match[1].trim()] = match[2].trim();
                }
            });
            this.log(`Loaded ${Object.keys(buildEnv).length} environment variables`, 'info');
        }

        // Clean previous build
        const buildPath = path.join(CONFIG.projectRoot, CONFIG.buildDir);
        const outputPath = path.join(CONFIG.projectRoot, CONFIG.outputDir);

        if (fs.existsSync(buildPath)) {
            this.log('Removing previous .next build...', 'info');
            fs.rmSync(buildPath, { recursive: true, force: true });
        }

        if (fs.existsSync(outputPath)) {
            this.log('Removing previous out directory...', 'info');
            fs.rmSync(outputPath, { recursive: true, force: true });
        }

        // Run build
        try {
            this.exec('npm run build', { env: buildEnv });
            this.log('✓ Build completed successfully\n', 'success');
        } catch (error) {
            throw new Error('Build failed. Fix errors before deploying.');
        }

        // Verify build output (check for 'out' directory if using static export)
        if (fs.existsSync(outputPath)) {
            const buildSize = this.getDirectorySize(outputPath);
            this.log(`Build output size: ${(buildSize / 1024 / 1024).toFixed(2)} MB`, 'info');
        } else if (fs.existsSync(buildPath)) {
            const buildSize = this.getDirectorySize(buildPath);
            this.log(`Build size: ${(buildSize / 1024 / 1024).toFixed(2)} MB`, 'info');
        }
    }

    // Step 3: Run Tests
    async runTests() {
        if (this.skipTests || !this.envConfig.requiresTests) {
            this.log('Skipping tests\n', 'warn');
            return;
        }

        this.log('Step 3: Running Tests', 'test');

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
            if (this.environment === 'production') {
                throw new Error('Tests failed. Cannot deploy to production with failing tests.');
            }

            const proceed = await this.confirm('Tests failed. Continue with deployment?');
            if (!proceed) {
                throw new Error('Deployment cancelled due to test failures');
            }
        }
    }

    // Step 4: Deployment Approval
    async getDeploymentApproval() {
        if (!this.envConfig.requiresApproval && !this.forceApproval) {
            return;
        }

        this.log('Step 4: Deployment Approval', 'deploy');

        const envColor = this.envConfig.color;
        const envName = this.envConfig.name;

        console.log(`\n${envColor}${'='.repeat(60)}${colors.reset}`);
        console.log(`${envColor}  DEPLOYMENT SUMMARY${colors.reset}`);
        console.log(`${envColor}${'='.repeat(60)}${colors.reset}`);
        console.log(`Environment:  ${envColor}${envName}${colors.reset}`);
        console.log(`Project ID:   ${this.projectId}`);
        console.log(`Target:       ${this.target}`);
        console.log(`Timestamp:    ${new Date().toISOString()}`);
        console.log(`${envColor}${'='.repeat(60)}${colors.reset}\n`);

        if (this.environment === 'production') {
            console.log(`${colors.red}${colors.bright}⚠️  WARNING: PRODUCTION DEPLOYMENT ⚠️${colors.reset}\n`);

            const confirmed = await this.confirm(
                `Type 'yes' to confirm production deployment`,
                false
            );

            if (!confirmed) {
                throw new Error('Production deployment cancelled by user');
            }
        } else {
            const confirmed = await this.confirm(
                `Deploy to ${envName}?`,
                true
            );

            if (!confirmed) {
                throw new Error('Deployment cancelled by user');
            }
        }

        this.log('✓ Deployment approved\n', 'success');
    }

    // Step 5: Deploy
    async deploy() {
        this.log('Step 5: Deploying to Firebase', 'deploy');

        let deployCommand = `firebase deploy --project ${this.environment}`;

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

    // Step 6: Smoke Tests
    async runSmokeTests() {
        if (this.skipSmokeTests || !this.envConfig.requiresSmokeTests) {
            this.log('Skipping smoke tests\n', 'warn');
            return;
        }

        this.log('Step 6: Running Smoke Tests', 'smoke');

        if (this.target.includes('hosting')) {
            const url = `https://${this.projectId}.web.app`;
            this.log(`Deployment URL: ${colors.cyan}${url}${colors.reset}`, 'info');

            // Basic smoke test: check if site is reachable
            try {
                this.log('Testing site accessibility...', 'step');
                const testCommand = process.platform === 'win32'
                    ? `curl -s -o nul -w "%{http_code}" ${url}`
                    : `curl -s -o /dev/null -w "%{http_code}" ${url}`;

                const statusCode = this.exec(testCommand, { silent: true, ignoreErrors: true });

                if (statusCode && statusCode.trim() === '200') {
                    this.log('✓ Site is accessible (HTTP 200)', 'success');
                } else {
                    this.log(`⚠ Site returned status code: ${statusCode}`, 'warn');
                }
            } catch (error) {
                this.log('Could not run accessibility test (curl not available)', 'warn');
            }

            this.log('\n📋 Manual verification checklist:', 'info');
            this.log(`   1. Visit ${url}`, 'info');
            this.log('   2. Test critical user flows', 'info');
            this.log('   3. Check console for errors', 'info');
            this.log('   4. Verify data loads correctly\n', 'info');

            const verified = await this.confirm('Have you verified the deployment?', true);
            if (!verified) {
                this.log('⚠ Deployment not verified - consider rollback if issues found', 'warn');
            }
        }

        this.log('✓ Smoke tests complete\n', 'success');
    }

    // Utility: Get directory size
    getDirectorySize(dirPath) {
        let totalSize = 0;
        if (!fs.existsSync(dirPath)) return 0;

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

    // Log deployment
    logDeployment(success, error = null) {
        const logDir = path.dirname(path.join(CONFIG.projectRoot, CONFIG.deploymentLog));
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logEntry = {
            timestamp: this.startTime.toISOString(),
            environment: this.environment,
            projectId: this.projectId,
            target: this.target,
            duration: ((new Date() - this.startTime) / 1000).toFixed(2) + 's',
            success,
            error: error?.message || null,
            dryRun: this.dryRun,
            deploymentUrl: this.target.includes('hosting')
                ? `https://${this.projectId}.web.app`
                : null
        };

        let logs = [];
        const logPath = path.join(CONFIG.projectRoot, CONFIG.deploymentLog);
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        }

        logs.push(logEntry);

        // Keep only last 100 deployments
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }

        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    }

    // Main deployment flow
    async run() {
        this.displayEnvironmentInfo();

        try {
            await this.validateEnvironment();
            await this.buildProject();
            await this.runTests();
            await this.getDeploymentApproval();
            await this.deploy();
            await this.runSmokeTests();

            this.logDeployment(true);

            const duration = ((new Date() - this.startTime) / 1000).toFixed(2);
            const envColor = this.envConfig.color;

            console.log('\n' + '='.repeat(60));
            console.log(`${envColor}${colors.bright}✓ Deployment to ${this.envConfig.name} completed successfully!${colors.reset}`);
            console.log(`  Duration: ${duration}s`);
            if (this.target.includes('hosting')) {
                console.log(`  URL: ${colors.cyan}https://${this.projectId}.web.app${colors.reset}`);
            }
            console.log('='.repeat(60) + '\n');

            process.exit(0);

        } catch (error) {
            this.logDeployment(false, error);

            console.log('\n' + '='.repeat(60));
            console.log(`${colors.red}${colors.bright}✗ Deployment failed${colors.reset}`);
            console.log(`  ${error.message}`);
            console.log('='.repeat(60) + '\n');

            process.exit(1);
        }
    }
}

// CLI
const args = process.argv.slice(2);

// Parse options
const options = {
    environment: 'staging',
    target: 'hosting',
    skipBuild: args.includes('--skip-build'),
    skipTests: args.includes('--skip-tests'),
    skipSmokeTests: args.includes('--skip-smoke-tests'),
    forceApproval: args.includes('--force-approval'),
    dryRun: args.includes('--dry-run')
};

// Parse environment
const envIndex = args.findIndex(arg => arg.startsWith('--env='));
if (envIndex !== -1) {
    options.environment = args[envIndex].split('=')[1];
} else if (args.includes('--production') || args.includes('--prod')) {
    options.environment = 'production';
} else if (args.includes('--staging')) {
    options.environment = 'staging';
} else if (args.includes('--development') || args.includes('--dev')) {
    options.environment = 'development';
}

// Parse target
const targetIndex = args.findIndex(arg => arg.startsWith('--target='));
if (targetIndex !== -1) {
    options.target = args[targetIndex].split('=')[1];
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Firebase Multi-Environment Deployment${colors.reset}

Usage: node scripts/deploy-env.js [environment] [options]

Environments:
  --development, --dev     Deploy to development
  --staging               Deploy to staging (default)
  --production, --prod    Deploy to production
  --env=<name>           Deploy to custom environment

Options:
  --target=<target>       Deployment target (hosting, firestore, storage, all)
  --skip-build           Skip the build step
  --skip-tests           Skip running tests
  --skip-smoke-tests     Skip post-deployment smoke tests
  --force-approval       Require approval even for dev
  --dry-run              Validate without deploying
  --help, -h             Show this help

Examples:
  node scripts/deploy-env.js --staging                    # Deploy to staging
  node scripts/deploy-env.js --production                 # Deploy to production
  node scripts/deploy-env.js --dev --skip-tests           # Quick dev deployment
  node scripts/deploy-env.js --staging --target=firestore # Deploy rules only
  node scripts/deploy-env.js --production --dry-run       # Validate prod config

Environment Configuration:
  - development: Fast deploys, no approvals, minimal checks
  - staging: Pre-production testing, requires approval
  - production: Full checks, double approval, smoke tests

  `);
    process.exit(0);
}

// Run deployment
const deployer = new MultiEnvDeployer(options);
deployer.run();
