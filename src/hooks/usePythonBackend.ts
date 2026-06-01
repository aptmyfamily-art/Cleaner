import { useEffect, useState, useCallback } from 'react';

export interface Box {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface PythonResponse {
    status: 'success' | 'error' | 'ready';
    message?: string;
    boxes?: number[][]; // [x1, y1, x2, y2]
    images?: string[];
    text?: string;
    imagePath?: string;
    cleanedPath?: string;
}

export function usePythonBackend() {
    const [isReady, setIsReady] = useState(false);
    const [imageList, setImageList] = useState<string[]>([]);
    const [boxes, setBoxes] = useState<number[][]>([]);

    const [pendingCount, setPendingCount] = useState(0);
    const [text, setText] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!window.electronAPI) {
            console.error("Electron API is missing! Check preload script.");
            setError("Electron API is missing. Preload failed?");
            return;
        }

        // Listen for responses
        const cleanup = window.electronAPI.onPythonResponse((response: PythonResponse) => {
            console.log('Backend Response:', response);
            setPendingCount(prev => Math.max(0, prev - 1)); // Decrement count

            if (response.status === 'ready') {
                setIsReady(true);
            } else if (response.status === 'success') {
                if (response.images) {
                    setImageList(response.images);
                }
                if (response.boxes) {
                    setBoxes(response.boxes);
                }
                if (response.text !== undefined) {
                    setText(response.text);
                }
            } else if (response.status === 'error') {
                console.error('Backend Error:', response.message);
                setError(response.message || "An error occurred");
            }
        });

        // Initialize backend
        window.electronAPI.sendPythonCommand({ command: 'INIT' });

        return cleanup;
    }, []);

    const listImages = useCallback((directory: string) => {
        setPendingCount(prev => prev + 1);
        window.electronAPI.sendPythonCommand({ command: 'LIST_IMAGES', payload: { directory } });
    }, []);

    const detect = useCallback((imagePath: string) => {
        setPendingCount(prev => prev + 1);
        setBoxes([]); // Clear while loading
        window.electronAPI.sendPythonCommand({ command: 'DETECT', payload: { imagePath } });
    }, []);

    const ocrBox = useCallback((imagePath: string, box: number[]) => {
        setPendingCount(prev => prev + 1);
        setText("Loading...");
        window.electronAPI.sendPythonCommand({ command: 'OCR_BOX', payload: { imagePath, box } });
    }, []);

    const ocrBatch = useCallback((imagePath: string, boxes: number[][], global_start_index: number = 0) => {
        setPendingCount(prev => prev + 1);
        setText("Batch OCR Loading...");
        window.electronAPI.sendPythonCommand({ command: 'BATCH_OCR', payload: { imagePath, boxes, global_start_index } });
    }, []);

    const exportPSD = useCallback((imagePath: string, boxes: number[][], translations: string[]) => {
        setPendingCount(prev => prev + 1);
        window.electronAPI.sendPythonCommand({ command: 'EXPORT_PSD', payload: { imagePath, boxes, translations } });
    }, []);

    const clean = useCallback((imagePath: string, boxes?: number[][]) => {
        setPendingCount(prev => prev + 1);
        window.electronAPI.sendPythonCommand({ command: 'CLEAN', payload: { imagePath, boxes } });
    }, []);

    return {
        isReady,
        isProcessing: pendingCount > 0,
        pendingCount,
        imageList,
        setImageList,
        boxes,
        setBoxes,
        text,
        setText,
        listImages,
        detect,
        ocrBox,
        ocrBatch,
        exportPSD,
        clean,
        error
    };
}
