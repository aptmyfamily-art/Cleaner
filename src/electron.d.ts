export interface ElectronAPI {
    sendPythonCommand: (command: any) => void;
    onPythonResponse: (callback: (response: any) => void) => () => void;
    openFileDialog: (options: any) => Promise<any>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
