"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    sendPythonCommand: (command) => electron_1.ipcRenderer.send('python-params', command),
    onPythonResponse: (callback) => {
        const handler = (_event, response) => callback(response);
        electron_1.ipcRenderer.on('python-response', handler);
        return () => electron_1.ipcRenderer.removeListener('python-response', handler);
    },
    openFileDialog: (options) => electron_1.ipcRenderer.invoke('dialog:open', options),
    saveTextsByEpisode: (files) => electron_1.ipcRenderer.invoke('dialog:saveTextsByEpisode', { files }),
    loadTextsByEpisode: () => electron_1.ipcRenderer.invoke('dialog:loadTextsByEpisode')
});
//# sourceMappingURL=preload.js.map