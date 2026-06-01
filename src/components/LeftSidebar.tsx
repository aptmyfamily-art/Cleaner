interface LeftSidebarProps {
    images?: string[];
    onSelect?: (path: string) => void;
    selected?: string | null;
    onAddPage?: () => void;
    onOpenFolder?: () => void;
    onDetect?: () => void;
    onDetectAll?: () => void;
    onOCRPage?: () => void;
    onOCRAll?: () => void;
    onClean?: () => void;
    isOCRAllAvailable?: boolean;
}

export function LeftSidebar({
    images = [],
    onSelect,
    selected,
    onAddPage,
    onOpenFolder,
    onDetect,
    onDetectAll,
    onOCRPage,
    onOCRAll,
    onClean,
    isOCRAllAvailable
}: LeftSidebarProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-lg font-black bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 bg-clip-text text-transparent tracking-tight">
                    PROJECT OCR
                </h2>
                <button
                    onClick={onOpenFolder}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all border border-transparent hover:border-neutral-700"
                    title="Open Folder"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            </div>

            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto custom-scrollbar">
                {images.length === 0 && (
                    <div className="text-center py-12 text-neutral-600">
                        <div className="mb-4 flex justify-center opacity-20">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium">No images loaded</p>
                        <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">Open a directory to start</p>
                    </div>
                )}
                {images.map((path, idx) => {
                    const name = path.split(/[\\/]/).pop();
                    const isSelected = selected === path;
                    return (
                        <div
                            key={path}
                            onClick={() => onSelect?.(path)}
                            className={`p-2.5 rounded-xl cursor-pointer border transition-all duration-200 group flex items-center gap-3 ${isSelected
                                ? 'bg-pink-600/10 border-pink-500/30'
                                : 'bg-transparent border-transparent hover:bg-neutral-800/50 hover:border-neutral-800'
                                }`}
                        >
                            <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700'}`}>
                                {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                    {name}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md space-y-4">
                {/* Page Level */}
                <div className="space-y-2">
                    <label className="text-[10px] text-neutral-600 font-black uppercase tracking-widest px-1">Active Page</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onDetect}
                            disabled={!selected}
                            className="py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 hover:border-neutral-700 disabled:opacity-20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            Detect
                        </button>
                        <button
                            onClick={onOCRPage}
                            disabled={!selected}
                            className="py-2.5 bg-neutral-900 hover:bg-neutral-800 text-pink-500 border border-neutral-800 hover:border-neutral-700 disabled:opacity-20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            OCR Page
                        </button>
                    </div>
                    <button
                        onClick={onClean}
                        disabled={!selected}
                        className="w-full py-2.5 bg-neutral-900 hover:bg-emerald-600/10 text-emerald-500 border border-neutral-800 hover:border-emerald-500/30 disabled:opacity-20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <span className="text-sm">✨</span> Clean Page
                    </button>
                </div>

                {/* Project Level */}
                <div className="space-y-2">
                    <label className="text-[10px] text-pink-500/50 font-black uppercase tracking-widest px-1">Whole Project</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onDetectAll}
                            disabled={!isOCRAllAvailable}
                            className="py-2.5 bg-neutral-900 hover:bg-pink-600/10 text-neutral-300 hover:text-white border border-neutral-800 hover:border-pink-500/30 disabled:opacity-20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            Detect All
                        </button>
                        <button
                            onClick={onOCRAll}
                            disabled={!isOCRAllAvailable}
                            className="py-2.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 hover:text-pink-300 border border-pink-500/20 hover:border-pink-500/40 disabled:opacity-20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            OCR All
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={onAddPage}
                        className="w-full py-3 bg-gradient-to-br from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-900/10 active:scale-[0.98] border border-pink-400/20"
                    >
                        + Add New Page
                    </button>
                </div>
            </div>
        </div>
    );
}
