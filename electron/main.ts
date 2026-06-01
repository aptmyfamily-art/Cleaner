import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

// CommonJS-style __dirname (works with module: CommonJS)


let mainWindow: BrowserWindow | null;
let pythonProcess: any = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- Python Backend Handling ---
function startPythonBackend() {
    const scriptPath = path.join(__dirname, '../../api.py'); // Adjust path based on build structure
    // In dev: ../../api.py (relative to electron/main.ts -> dist-electron/main.js -> root/api.py?)
    // We need to be careful with paths. 
    // dev: electron-app/dist-electron/main.js -> ../../api.py (electron-app/api.py? No, api.py is in cleaner/)
    // The root of the workspace is cleaner/.
    // electron-app is in cleaner/electron-app.
    // api.py is in cleaner/.
    // So from electron-app/dist-electron/main.js, we go ../../.. to get to cleaner/ ?
    // dist-electron (1) -> electron-app (2) -> cleaner (3).
    // Yes, ../../../api.py

    const apiPath = path.resolve(__dirname, '../../src/api.py');
    console.log("Starting Python API from:", apiPath);

    const projectRoot = path.resolve(__dirname, '../../');
    pythonProcess = spawn('python', ['-u', apiPath], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        }
    }); // -u for unbuffered output

    pythonProcess.stdout.on('data', (data: any) => {
        // console.log(`Python stdout: ${data}`);
        try {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const response = JSON.parse(line);
                // Broadcast to renderer
                mainWindow?.webContents.send('python-response', response);
            }
        } catch (e) {
            console.error('Error parsing Python response:', e, data.toString());
        }
    });

    pythonProcess.stderr.on('data', (data: any) => {
        console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code: any) => {
        console.log(`Python process exited with code ${code}`);
    });
}

function stopPythonBackend() {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}

app.whenReady().then(() => {
    createWindow();
    startPythonBackend();

    app.on('activate', () => {
        if (mainWindow === null) createWindow();
    });
});

app.on('will-quit', () => {
    stopPythonBackend();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.on('python-params', (event: any, args: any) => {
    if (pythonProcess && pythonProcess.stdin) {
        pythonProcess.stdin.write(JSON.stringify(args) + '\n');
    }
});

// File Dialog Handler
ipcMain.handle('dialog:open', async (_, args) => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog(mainWindow!, args);
    return result;
});
