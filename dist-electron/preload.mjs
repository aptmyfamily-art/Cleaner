import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    sendPythonCommand: (command) => ipcRenderer.send('python-params', command),
    onPythonResponse: (callback) => {
        const handler = (_event, response) => callback(response);
        ipcRenderer.on('python-response', handler);
        return () => ipcRenderer.removeListener('python-response', handler);
    },
    openFileDialog: (options) => ipcRenderer.invoke('dialog:open', options)
});
//# sourceMappingURL=preload.mjs.map