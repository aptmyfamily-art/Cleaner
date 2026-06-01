export interface ElectronAPI {
    sendPythonCommand: (command: any) => void;
    onPythonResponse: (callback: (response: any) => void) => () => void;
    openFileDialog: (options: any) => Promise<any>;
    saveTextsByEpisode: (files: Array<{ name: string; content: string }>) => Promise<any>;
    loadTextsByEpisode: () => Promise<any>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
