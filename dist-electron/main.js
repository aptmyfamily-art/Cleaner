"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
// CommonJS-style __dirname (works with module: CommonJS)
let mainWindow;
let pythonProcess = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
        },
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// --- Python Backend Handling ---
function startPythonBackend() {
    const scriptPath = path_1.default.join(__dirname, '../../api.py'); // Adjust path based on build structure
    // In dev: ../../api.py (relative to electron/main.ts -> dist-electron/main.js -> root/api.py?)
    // We need to be careful with paths. 
    // dev: electron-app/dist-electron/main.js -> ../../api.py (electron-app/api.py? No, api.py is in cleaner/)
    // The root of the workspace is cleaner/.
    // electron-app is in cleaner/electron-app.
    // api.py is in cleaner/.
    // So from electron-app/dist-electron/main.js, we go ../../.. to get to cleaner/ ?
    // dist-electron (1) -> electron-app (2) -> cleaner (3).
    // Yes, ../../../api.py
    const apiPath = path_1.default.resolve(__dirname, '../../src/api.py');
    console.log("Starting Python API from:", apiPath);
    const projectRoot = path_1.default.resolve(__dirname, '../../');
    pythonProcess = (0, child_process_1.spawn)('python', ['-u', apiPath], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        }
    }); // -u for unbuffered output
    pythonProcess.stdout.on('data', (data) => {
        // console.log(`Python stdout: ${data}`);
        try {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const response = JSON.parse(line);
                // Broadcast to renderer
                mainWindow?.webContents.send('python-response', response);
            }
        }
        catch (e) {
            console.error('Error parsing Python response:', e, data.toString());
        }
    });
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
    });
    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });
}
function stopPythonBackend() {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    startPythonBackend();
    electron_1.app.on('activate', () => {
        if (mainWindow === null)
            createWindow();
    });
});
electron_1.app.on('will-quit', () => {
    stopPythonBackend();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC Handlers
electron_1.ipcMain.on('python-params', (event, args) => {
    if (pythonProcess && pythonProcess.stdin) {
        pythonProcess.stdin.write(JSON.stringify(args) + '\n');
    }
});
// File Dialog Handler
electron_1.ipcMain.handle('dialog:open', async (_, args) => {
    const { dialog } = await Promise.resolve().then(() => __importStar(require('electron')));
    const result = await dialog.showOpenDialog(mainWindow, args);
    return result;
});
electron_1.ipcMain.handle('dialog:saveTextsByEpisode', async (_, payload) => {
    const { dialog } = await Promise.resolve().then(() => __importStar(require('electron')));
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true };
    }
    const targetDir = result.filePaths[0];
    const files = payload?.files || [];
    for (const file of files) {
        const name = String(file.name || 'episode').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const content = String(file.content || '');
        const outputPath = path_1.default.join(targetDir, `${name}.txt`);
        await fs_1.promises.writeFile(outputPath, content, 'utf8');
    }
    return { ok: true, targetDir, count: files.length };
});
electron_1.ipcMain.handle('dialog:loadTextsByEpisode', async () => {
    const { dialog } = await Promise.resolve().then(() => __importStar(require('electron')));
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, canceled: true };
    }
    const sourceDir = result.filePaths[0];
    const entries = await fs_1.promises.readdir(sourceDir, { withFileTypes: true });
    const texts = {};
    for (const entry of entries) {
        if (!entry.isFile())
            continue;
        if (!entry.name.toLowerCase().endsWith('.txt'))
            continue;
        const episodeName = entry.name.replace(/\.txt$/i, '');
        const filePath = path_1.default.join(sourceDir, entry.name);
        texts[episodeName] = await fs_1.promises.readFile(filePath, 'utf8');
    }
    return { ok: true, sourceDir, texts };
});
//# sourceMappingURL=main.js.map