import { useState, useEffect } from 'react';

interface RightSidebarProps {
    originalText?: string;
    translationText?: string;
    onUpdate?: (original: string, translation: string) => void;
    onExportPSD?: () => void;
    onSaveAll?: () => void;
    onLoadTranslations?: () => void;
}

export function RightSidebar({
    originalText = "",
    translationText = "",
    onUpdate,
    onExportPSD,
    onSaveAll,
    onLoadTranslations
}: RightSidebarProps) {
    const [localOriginal, setLocalOriginal] = useState(originalText);
    const [localTranslation, setLocalTranslation] = useState(translationText);

    useEffect(() => {
        setLocalOriginal(originalText);
    }, [originalText]);

    useEffect(() => {
        if (!localTranslation) {
            setLocalTranslation(translationText);
        }
    }, [translationText, localTranslation]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-neutral-950">
            <div className="p-4 border-b border-neutral-800">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Translation Hub</h2>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col p-4 space-y-2 border-b border-neutral-800">
                    <label className="text-[10px] text-neutral-600 font-bold uppercase">Original Detection</label>
                    <textarea
                        className="flex-1 w-full p-4 bg-neutral-900/50 rounded-xl border border-neutral-800/50 text-sm text-neutral-400 focus:outline-none focus:border-pink-500/30 transition-all resize-none font-mono leading-relaxed"
                        value={localOriginal}
                        readOnly
                        placeholder="Detection results will appear here..."
                    />
                </div>

                <div className="flex-1 flex flex-col p-4 space-y-2 bg-neutral-900/10">
                    <label className="text-[10px] text-pink-500/70 font-bold uppercase">Your Translations</label>
                    <textarea
                        className="flex-1 w-full p-4 bg-neutral-950/50 rounded-xl border border-pink-500/20 text-sm text-neutral-200 focus:outline-none focus:border-pink-500/50 transition-all resize-none shadow-inner custom-scrollbar font-mono leading-relaxed"
                        value={localTranslation}
                        onChange={(e) => setLocalTranslation(e.target.value)}
                        placeholder="Paste translations here (matching the order above)..."
                    />
                </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 backdrop-blur-sm space-y-2">
                <button
                    onClick={() => onUpdate?.(localOriginal, localTranslation)}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-pink-900/20 active:scale-[0.98]"
                >
                    Apply All Translations
                </button>
                <button
                    onClick={() => onExportPSD?.()}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
                >
                    Export to PSD
                </button>
                <button
                    onClick={() => onSaveAll?.()}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-semibold shadow-lg active:scale-[0.98]"
                >
                    Save All Texts
                </button>
                <button
                    onClick={() => onLoadTranslations?.()}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl transition-all font-semibold shadow-lg active:scale-[0.98]"
                >
                    Load Translations
                </button>
            </div>
        </div>
    );
}
