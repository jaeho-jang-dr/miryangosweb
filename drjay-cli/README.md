
# 🤖 Dr.Jay's Personal AI CLI

This is a custom AI assistant CLI tool powered by Google Gemini 2.0 Flash.
It is designed to be a "portable AI pair programmer" that runs in your terminal with a TUI (Text User Interface).

## Features

* **TUI Interface**: Buttons, scrollable chat, expandable input box.
* **Context Awareness**: Easily add files or entire folders (`[ 📂 Add ]`) to the context.
* **Screenshot Support**: Instantly attach clipboard images (`[ 📸 Clip ]`).
* **Portable**: Can be installed on any Windows machine with Node.js.

## Installation (How to use on other computers)

1. **Requirement**: Ensure [Node.js](https://nodejs.org/) is installed.
2. **Copy Folder**: Copy this `drjay-cli` folder to the target computer (e.g., via USB or Git).
3. **Install**: Open a terminal in this folder and run:

    ```powershell
    npm install -g .
    ```

4. **Run**: Now you can run it anywhere on that computer by typing:

    ```powershell
    drjay
    ```

## API Key

On the first run, it will ask for your Gemini API Key.
You can get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey).
The key is stored securely in your user home directory (`.drjay_gemini_key`).
