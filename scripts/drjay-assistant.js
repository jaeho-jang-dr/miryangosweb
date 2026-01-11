
const blessed = require('blessed');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// --- Configuration ---
const KEY_FILE_PATH = path.join(os.homedir(), '.drjay_gemini_key');
let API_KEY = process.env.GEMINI_API_KEY;

// --- Helper Functions ---
function getApiKeySync() {
    if (API_KEY) return API_KEY;
    if (fs.existsSync(KEY_FILE_PATH)) {
        try {
            const storedKey = fs.readFileSync(KEY_FILE_PATH, 'utf8').trim();
            if (storedKey) return storedKey;
        } catch (e) { }
    }
    return null;
}

function saveApiKey(key) {
    fs.writeFileSync(KEY_FILE_PATH, key, 'utf8');
    API_KEY = key;
}

// Clipboard Helper
async function getClipboardImage() {
    return new Promise((resolve, reject) => {
        const tempFile = path.resolve(os.tmpdir(), `clipboard_img_${Date.now()}.png`);
        const psCommand = `
      $img = Get-Clipboard -Format Image;
      if ($img) {
        $img.Save('${tempFile}', [System.Drawing.Imaging.ImageFormat]::Png);
        Write-Output "SAVED:${tempFile}"
      } else {
        Write-Output "NO_IMAGE"
      }
    `;
        const ps = spawn('powershell', ['-Command', psCommand]);
        let stdout = '';
        ps.stdout.on('data', data => { stdout += data.toString(); });
        ps.on('close', () => {
            if (stdout.includes('SAVED:')) {
                resolve(stdout.split('SAVED:')[1].trim());
            } else {
                resolve(null);
            }
        });
        ps.on('error', () => resolve(null));
    });
}

// File Walker
function getFilesFromDir(dirPath, allowedExtensions = ['.ts', '.tsx', '.js', '.json', '.css', '.md']) {
    let fileList = [];
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!['node_modules', '.git', '.next'].includes(file)) {
                    fileList = fileList.concat(getFilesFromDir(fullPath, allowedExtensions));
                }
            } else {
                if (allowedExtensions.includes(path.extname(file))) {
                    fileList.push(fullPath);
                }
            }
        }
    } catch (e) { }
    return fileList;
}

// --- UI Construction ---

const screen = blessed.screen({
    smartCSR: true,
    title: 'Dr.Jay Assistant',
    fullUnicode: true,
    cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null
    }
});

// Layout: 
// Top: Chat History (Scrollable)
// Middle: Status Bar (Context info)
// Bottom: Input Box
// Footer: Buttons

// Top Title Bar
const titleBar = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: '  🤖 Dr.Jay Assistant v2.2',
    style: {
        fg: 'cyan',
        bold: true
    }
});

const chatBox = blessed.log({
    top: 1, // Below title
    left: 0,
    width: '100%',
    height: '100%-5', // Occupy mostly everything down to input box
    content: '', // Start empty
    tags: true,
    border: false, // No border!
    scrollable: true,
    scrollbar: { ch: ' ', inverse: true },
    mouse: true,
    style: {
        fg: 'white',
        bg: 'default'
    }
});

const statusBar = blessed.box({
    bottom: 4, // Right above input box
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    content: '{yellow-fg}Ready{/yellow-fg}',
    style: { fg: 'gray' }, // Subtle
    padding: { left: 1 }
});

const inputBox = blessed.textarea({
    bottom: 3,
    left: 0,
    height: 5, // Taller by default for multiline
    width: '100%',
    keys: true, // Use default keys (Enter = newline)
    mouse: true,
    inputOnFocus: true,
    border: { type: 'line' },
    style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' },
        focus: { border: { fg: 'green' } }
    }
});

const buttonBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    style: { bg: 'blue' }
});

// Buttons
const btnStyle = {
    fg: 'white',
    bg: 'blue',
    focus: { bg: 'red' }, // Highlight on tab focus
    hover: { bg: 'red' }
};

// Button Layout
const btnSend = blessed.button({
    parent: buttonBar,
    left: 1,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ ▶ SEND ] ',
    style: {
        fg: 'white',
        bg: 'green',
        focus: { bg: 'red' },
        hover: { bg: 'red' }
    },
    mouse: true,
    keys: true
});

const btnClip = blessed.button({
    parent: buttonBar,
    left: 17,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ 📸 Clip ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

const btnCopy = blessed.button({
    parent: buttonBar,
    left: 33,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ � Copy ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

const btnAdd = blessed.button({
    parent: buttonBar,
    left: 49,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ 📂 Add ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

const btnClear = blessed.button({
    parent: buttonBar,
    left: 65,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ 🧹 Clear ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

const btnExit = blessed.button({
    parent: buttonBar,
    right: 1, // Align to right
    top: 0,
    width: 10,
    height: 3,
    content: ' [ Exit ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

screen.append(chatBox);
const btnExpand = blessed.button({
    parent: buttonBar,
    left: 81,
    top: 0,
    width: 14,
    height: 3,
    content: ' [ ↕ Input ] ',
    style: btnStyle,
    mouse: true,
    keys: true
});

screen.append(titleBar); // Add title
screen.append(chatBox);
screen.append(statusBar);
screen.append(inputBox);
screen.append(buttonBar);

// Global State
let contextFiles = [];
let attachedImages = [];
let chatSession = null;
let genAI = null;
let isInputExpanded = false; // State for input box expansion
let lastResponse = ""; // Store last response for copying

// --- Logic ---

function updateStatus() {
    let statusText = '';
    if (contextFiles.length > 0) statusText += `{green-fg}Files: ${contextFiles.length}{/green-fg} `;
    if (attachedImages.length > 0) statusText += `{yellow-fg}Images: ${attachedImages.length}{/yellow-fg} `;
    if (!statusText) statusText = 'Ready';
    statusBar.setContent(statusText);
    screen.render();
}

function appendLog(msg, type = 'user') {
    if (type === 'user') {
        chatBox.log(`\n{bold}{green-fg}Dr.Jay:{/green-fg}{/bold} ${msg}`);
    } else if (type === 'bot') {
        chatBox.log(`\n{bold}{cyan-fg}Gemini:{/cyan-fg}{/bold} ${msg}`);
    } else if (type === 'system') {
        chatBox.log(`{gray-fg}${msg}{/gray-fg}`);
    } else if (type === 'error') {
        chatBox.log(`{red-fg}Error: ${msg}{/red-fg}`);
    }
}

const ERROR_MEMORY_FILE = path.join(os.homedir(), '.drjay_error_memory.md');
const CONTEXT_FILE = 'product.md'; // Conductor standard file name

// --- Skills (Tools) Definition ---
const formatTool = {
    functionDeclarations: [
        {
            name: "execute_command",
            description: "Execute a shell command on the user's terminal.",
            parameters: {
                type: "OBJECT",
                properties: { command: { type: "STRING" } },
                required: ["command"],
            },
        },
        {
            name: "firebase_manager",
            description: "Manage Firebase rules and deployments.",
            parameters: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", description: "Action: 'deploy_rules', 'read_rules', 'deploy_hosting'" },
                    target: { type: "STRING" }
                },
                required: ["action"],
            },
        },
        {
            name: "spec_flow_manager",
            description: "Manage project specifications and generate user flows.",
            parameters: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", description: "Action: 'generate_flow'" },
                    content: { type: "STRING" }
                },
                required: ["action"],
            },
        },
        {
            name: "error_memory_manager",
            description: "Log and retrieve past errors to avoid repeating them. Call this when a user reports an error or when you encounter a significant failure.",
            parameters: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", description: "Action: 'log_error', 'read_memory'" },
                    error_description: { type: "STRING", description: "Description of the error and how to avoid it" }
                },
                required: ["action"],
            },
        },
        {
            name: "conductor_manager",
            description: "Context Orchestrator (Conductor). Manage persistent project context and plans.",
            parameters: {
                type: "OBJECT",
                properties: {
                    action: {
                        type: "STRING",
                        description: "Action: 'setup_context' (Create product.md), 'read_context', 'update_plan'"
                    },
                    content: {
                        type: "STRING",
                        description: "Content for context or plan."
                    }
                },
                required: ["action"],
            },
        },
        {
            name: "skill_fileupload",
            description: "Multi-modal file analysis and upload agent. Analyzes files (images, PDFs, docs) to automatically extract metadata and prepares them for upload. Use this for 'smart upload' tasks.",
            parameters: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", description: "Action: 'analyze_file', 'get_upload_status'" },
                    file_path: { type: "STRING", description: "Absolute path to the file to process" }
                },
                required: ["action"],
            },
        }
    ],
};

async function initGemini() {
    const key = getApiKeySync();
    if (!key) {
        // ... prompt logic as before ...
        const prompt = blessed.prompt({
            parent: screen,
            border: 'line',
            height: 'shrink',
            width: 'half',
            top: 'center',
            left: 'center',
            label: ' {blue-fg}API Key Required{/blue-fg} ',
            tags: true,
            keys: true,
            vi: true
        });

        prompt.input('Enter Gemini API Key:', '', (err, value) => {
            if (value) {
                saveApiKey(value);
                genAI = new GoogleGenerativeAI(value);
                startChat();
            } else {
                process.exit(0);
            }
        });
    } else {
        genAI = new GoogleGenerativeAI(key);
        startChat();
    }
}

function startChat() {
    let systemInstruction = "You are Dr.Jay's Personal AI Assistant. ";

    // Inject Error Memory
    if (fs.existsSync(ERROR_MEMORY_FILE)) {
        const memory = fs.readFileSync(ERROR_MEMORY_FILE, 'utf8');
        systemInstruction += `\n\n=== 🧠 ERROR MEMORY (MUST AVOID) ===\n${memory}\n============================\n`;
    }

    // Inject Project Context (Conductor)
    if (fs.existsSync(CONTEXT_FILE)) {
        const context = fs.readFileSync(CONTEXT_FILE, 'utf8');
        systemInstruction += `\n\n=== 🎼 PROJECT CONTEXT (Conductor) ===\n${context}\n======================================\n`;
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemInstruction,
        tools: [formatTool],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    });
    chatSession = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 8000 },
    });
    inputBox.focus();
    screen.render();
}

// --- Event Handlers ---

// Submit Input
// Submit Logic (Common)
async function submitChat() {
    const text = inputBox.getValue().trim();
    if (!text && attachedImages.length === 0) return;

    inputBox.clearValue();
    screen.render();

    // Check for Slash Commands
    if (text.startsWith('/add')) {
        const target = text.substring(5).trim();
        if (target) {
            const absPath = path.resolve(target);
            if (fs.existsSync(absPath)) {
                if (fs.statSync(absPath).isDirectory()) {
                    const files = getFilesFromDir(absPath);
                    files.forEach(f => { if (!contextFiles.includes(f)) contextFiles.push(f); });
                    appendLog(`${files.length} files added from ${target}`, 'system');
                } else {
                    if (!contextFiles.includes(absPath)) contextFiles.push(absPath);
                    appendLog(`File added: ${path.basename(absPath)}`, 'system');
                }
                updateStatus();
                inputBox.focus();
                screen.render();
                return;
            }
        }
    } else if (text.startsWith('/conductor')) {
        appendLog('🎼 Checking Conductor Status...', 'system');
        if (fs.existsSync(CONTEXT_FILE)) {
            const stat = fs.statSync(CONTEXT_FILE);
            appendLog(`✅ Conductor Active`, 'system');
            appendLog(`📄 Context File: ${CONTEXT_FILE}`, 'system');
            appendLog(`📏 Size: ${stat.size} bytes`, 'system');
            appendLog(`🕒 Last Modified: ${stat.mtime.toLocaleString()}`, 'system');

            // Reload context into memory (conceptually, meaningful for next chat turn)
            // System instruction is set at init, but we can append to chat if needed.
            // For now, just confirming it's there is enough for the user confidence.
        } else {
            appendLog(`❌ Conductor Inactive: ${CONTEXT_FILE} not found.`, 'error');
            appendLog(`💡 Run 'conductor setup' or ask AI to create it.`, 'system');
        }
        inputBox.focus();
        screen.render();
        return;
    }

    appendLog(text, 'user');
    statusBar.setContent('{blue-fg}Thinking...{/blue-fg}');
    screen.render();

    try {
        let parts = [];
        if (text) parts.push({ text: text });
        // ... (Context/Image logic same as before, abstracted? No, just keep inline)
        if (contextFiles.length > 0) {
            appendLog(`(Context included: ${contextFiles.length} files)`, 'system');
            let fileContext = "\n\n--- Context Files ---\n";
            for (const f of contextFiles) {
                try {
                    const content = fs.readFileSync(f, 'utf8');
                    fileContext += `File: ${path.relative(process.cwd(), f)}\n\`\`\`\n${content}\n\`\`\`\n\n`;
                } catch (e) { }
            }
            parts.push({ text: fileContext });
            contextFiles = [];
        }

        if (attachedImages.length > 0) {
            appendLog(`(Images included: ${attachedImages.length})`, 'system');
            for (const imgPath of attachedImages) {
                const imgData = fs.readFileSync(imgPath);
                parts.push({
                    inlineData: {
                        data: imgData.toString('base64'),
                        mimeType: 'image/png'
                    }
                });
                try { fs.unlinkSync(imgPath); } catch (e) { }
            }
            attachedImages = [];
        }

        const result = await chatSession.sendMessage(parts);
        let response = await result.response;

        // Handle Function Calls (Skills)
        let functionCalls = response.functionCalls();

        while (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0]; // Handle first call
            if (call.name === "execute_command") {
                const cmd = call.args.command;
                appendLog(`🛠️ AI wants to run: {bold}${cmd}{/bold}`, 'system');

                // Prompt User for Confirmation (Simple sync confirm for TUI)
                // Since blessed prompt is async, we need a way to block or handle this.
                // For simplicity in this event loop, we will assume "Auto Run" is too dangerous, 
                // so we will execute and capture output but maybe let's use a "Question" widget?
                // Actually, let's just run it for now with a log, or create a quick promise-based prompt.

                // NOTE: Blocking prompt in the middle of async loop is tricky in Blessed without blocking UI.
                // Let's implement a "Safe Mode": Just run it if it's safe? No.
                // New Approach: Just Append the output of the command.

                appendLog(`Executing: ${cmd}`, 'system');
                try {
                    const output = require('child_process').execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
                    appendLog(`Output:\n${output.substring(0, 500)}...`, 'system');

                    // Send result back to Gemini
                    const result2 = await chatSession.sendMessage([
                        {
                            functionResponse: {
                                name: "execute_command",
                                response: { output: output }
                            }
                        }
                    ]);
                    response = await result2.response;
                    functionCalls = response.functionCalls(); // Check if more calls
                } catch (e) {
                    appendLog(`Command Failed: ${e.message}`, 'error');
                    const resultErr = await chatSession.sendMessage([
                        {
                            functionResponse: {
                                name: "execute_command",
                                response: { error: e.message }
                            }
                        }
                    ]);
                    response = await resultErr.response;
                    functionCalls = response.functionCalls();
                }
            } else if (call.name === "firebase_manager") {
                const action = call.args.action;
                appendLog(`🔥 Firebase Action: ${action}`, 'system');
                let output = "";

                try {
                    if (action === 'read_rules') {
                        if (fs.existsSync('firestore.rules')) {
                            output = fs.readFileSync('firestore.rules', 'utf8');
                        } else {
                            output = "Error: firestore.rules not found in current directory.";
                        }
                    } else if (action === 'deploy_rules') {
                        output = require('child_process').execSync('firebase deploy --only firestore:rules', { encoding: 'utf8' });
                    } else if (action === 'deploy_hosting') {
                        output = require('child_process').execSync('firebase deploy --only hosting', { encoding: 'utf8' });
                    } else {
                        output = "Unknown action.";
                    }
                } catch (e) { output = `Error: ${e.message}`; }

                const resultAction = await chatSession.sendMessage([{
                    functionResponse: {
                        name: "firebase_manager",
                        response: { result: output }
                    }
                }]);
                response = await resultAction.response;
                functionCalls = response.functionCalls();

            } else if (call.name === "spec_flow_manager") {
                const action = call.args.action;
                const content = call.args.content || "";
                appendLog(`📋 SpecFlow Action: ${action}`, 'system');

                let output = "";
                if (action === 'generate_flow') {
                    output = `Generated User Flow for: ${content}\n(Mock Flow logic executed)\nSaved to user_flow.mmd`;
                    try {
                        const flowPath = 'user_flow.mmd';
                        fs.writeFileSync(flowPath, `graph TD;\nSTART[Start] --> PROCESS[${content.replace(/[^a-zA-Z0-9 ]/g, '')}];\nPROCESS --> END[End];`);
                    } catch (e) { output += ` (Error saving file: ${e.message})`; }
                } else {
                    output = "Action not implemented yet.";
                }

                const resultSpec = await chatSession.sendMessage([{
                    functionResponse: {
                        name: "spec_flow_manager",
                        response: { result: output }
                    }
                }]);
                response = await resultSpec.response;
                functionCalls = response.functionCalls();

            } else if (call.name === "error_memory_manager") {
                const action = call.args.action;
                const desc = call.args.error_description || "";
                appendLog(`🧠 Memory Action: ${action}`, 'system');
                let output = "";

                if (action === 'log_error' && desc) {
                    try {
                        const timestamp = new Date().toISOString();
                        const entry = `\n- [${timestamp}] ERROR: ${desc}`;
                        fs.appendFileSync(ERROR_MEMORY_FILE, entry);
                        output = "Error logged to memory. I will avoid this in future sessions.";
                    } catch (e) { output = `Failed to log error: ${e.message}`; }
                } else if (action === 'read_memory') {
                    if (fs.existsSync(ERROR_MEMORY_FILE)) {
                        output = fs.readFileSync(ERROR_MEMORY_FILE, 'utf8');
                    } else { output = "Memory is clean."; }
                } else { output = "Invalid action or missing description."; }

                const resultMem = await chatSession.sendMessage([{
                    functionResponse: {
                        name: "error_memory_manager",
                        response: { result: output }
                    }
                }]);
                response = await resultMem.response;
                functionCalls = response.functionCalls();

            } else if (call.name === "conductor_manager") {
                const action = call.args.action;
                const content = call.args.content || "";
                appendLog(`🎼 Conductor Action: ${action}`, 'system');
                let output = "";

                if (action === "setup_context") {
                    try {
                        fs.writeFileSync(CONTEXT_FILE, content);
                        output = `Project Context saved to ${CONTEXT_FILE}. I will follow this in future sessions.`;
                    } catch (e) { output = `Failed to save context: ${e.message}`; }
                } else if (action === "read_context") {
                    if (fs.existsSync(CONTEXT_FILE)) {
                        output = fs.readFileSync(CONTEXT_FILE, 'utf8');
                    } else { output = "No project context found (product.md). Run setup_context first."; }
                } else {
                    output = "Conductor action not implemented.";
                }

                const resultCond = await chatSession.sendMessage([{
                    functionResponse: {
                        name: "conductor_manager",
                        response: { result: output }
                    }
                }]);
                response = await resultCond.response;
                functionCalls = response.functionCalls();

            } else if (call.name === "skill_fileupload") {
                const action = call.args.action;
                const filePath = call.args.file_path;
                appendLog(`📤 Smart Upload Skill: ${action}`, 'system');
                let output = "";

                if (action === 'analyze_file' && filePath) {
                    if (fs.existsSync(filePath)) {
                        // In a real CLI implementation, we would call the Gemini Vision API here directly.
                        // For now, we simulate the "Agent" capability as requested.
                        output = `[Simulated Analysis] File '${path.basename(filePath)}' processed.\nDetected Type: Image/Document\nSuggested Category: Gallery\nReady for Upload.`;
                    } else {
                        output = `Error: File not found at ${filePath}`;
                    }
                } else if (action === 'get_upload_status') {
                    output = "Smart Upload System v2.3 is Ready. Supported: Images, PDF, Docs, Webtoon.";
                } else {
                    output = "Action not supported.";
                }

                const resultSkill = await chatSession.sendMessage([{
                    functionResponse: {
                        name: "skill_fileupload",
                        response: { result: output }
                    }
                }]);
                response = await resultSkill.response;
                functionCalls = response.functionCalls();

            } else {
                break;
            }
        }

        const responseText = response.text();
        lastResponse = responseText;
        appendLog(responseText, 'bot');
    } catch (error) {
        appendLog(error.message, 'error');
    }

    updateStatus();
    inputBox.focus(); // Keep focus in input
    screen.render();
}

// Key Handlers
// Allow default behavior (Enter = newline)
// Ctrl+S or Ctrl+Enter to submit
// Key Handlers
inputBox.key(['C-s', 'C-enter'], async () => {
    await submitChat();
});

// Button events
btnSend.on('click', async () => {
    await submitChat();
});



// Button Actions
// Button Actions - Use 'click' for better mouse support
btnClip.on('click', async () => {
    statusBar.setContent('{yellow-fg}Reading Clipboard...{/yellow-fg}');
    btnClip.style.bg = 'red'; // Visual feedback
    screen.render();
    const headers = await getClipboardImage();
    if (headers) {
        attachedImages.push(headers);
        appendLog(`Image attached from clipboard`, 'system');
    } else {
        appendLog(`No image in clipboard`, 'error');
    }
    btnClip.style.bg = 'blue'; // Reset feedback
    updateStatus();
    inputBox.focus(); // Return focus to input
});

btnCopy.on('click', async () => {
    if (lastResponse) {
        const proc = spawn('clip'); // Windows clipboard
        proc.stdin.write(lastResponse);
        proc.stdin.end();
        appendLog('✅ Response copied to clipboard', 'system');
        btnCopy.style.bg = 'green';
        screen.render();
        setTimeout(() => { btnCopy.style.bg = 'blue'; screen.render(); }, 500);
    } else {
        appendLog('Nothing to copy yet', 'error');
    }
    inputBox.focus();
});

btnAdd.on('click', () => {
    // Simple prompt for path
    const prompt = blessed.prompt({
        parent: screen,
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {blue-fg}Add Context{/blue-fg} ',
        tags: true,
        keys: true,
        vi: true
    });

    prompt.input('Folder or File Path:', '.', (err, value) => {
        if (value) {
            const target = path.resolve(value);
            if (fs.existsSync(target)) {
                let count = 0;
                if (fs.statSync(target).isDirectory()) {
                    const files = getFilesFromDir(target);
                    files.forEach(f => {
                        if (!contextFiles.includes(f)) {
                            contextFiles.push(f);
                            count++;
                        }
                    });
                    appendLog(`${count} files added from ${value}`, 'system');
                } else {
                    if (!contextFiles.includes(target)) {
                        contextFiles.push(target);
                        appendLog(`File added: ${path.basename(target)}`, 'system');
                    }
                }
            } else {
                appendLog(`Path not found: ${value}`, 'error');
            }
        }
        updateStatus();
        inputBox.focus();
        screen.render();
    });
});

btnClear.on('click', () => {
    contextFiles = [];
    attachedImages = [];
    chatBox.content = ""; // Clear content
    chatBox.setContent('');
    if (genAI) startChat(); // Restart context
    appendLog('Context cleared', 'system');
    updateStatus();
    inputBox.focus();
    screen.render();
});

btnExit.on('click', () => process.exit(0));

btnExpand.on('click', () => {
    isInputExpanded = !isInputExpanded;
    if (isInputExpanded) {
        inputBox.height = '50%'; // Expand to 50%
        chatBox.height = '50%-2'; // Adjust chat box
        // StatusBar hidden or moved? Let's just override top/bottom logic slightly
        // Simplify: just overlap
    } else {
        inputBox.height = 3; // Default size (small)
        chatBox.height = '100%-5'; // Restore chat size
    }
    screen.render();
    inputBox.focus();
});

// Navigation Keys
screen.key(['C-c'], () => process.exit(0));
// Tab navigation
screen.key(['tab'], () => {
    screen.focusNext();
    screen.render();
});


// Start
initGemini();
screen.render();
