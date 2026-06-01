import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    sendPythonCommand: (command: any) => ipcRenderer.send('python-params', command),
    onPythonResponse: (callback: (response: any) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, response: any) => callback(response);
        ipcRenderer.on('python-response', handler);
        return () => ipcRenderer.removeListener('python-response', handler);
    },
    openFileDialog: (options: any) => ipcRenderer.invoke('dialog:open', options)
});
