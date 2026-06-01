import { useRef, useState } from 'react';

interface CanvasEditorProps {
    imagePath: string | null;
    boxes: number[][]; // [x1, y1, x2, y2]
    startIndex?: number;
    onBoxSelect?: (index: number) => void;
}

export function CanvasEditor({ imagePath, boxes, startIndex = 0, onBoxSelect }: CanvasEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Simple auto-fit logic
    // In a real app, we'd use ResizeObserver and calculate scale more precisely
    // For now, let CSS handle fit, and we just need the display size to render SVG boxes correctly?
    // Actually, simple approach: SVG with viewBox matching image dimensions.
    // Then CSS scales both <img> and <svg> together.

    // We need the original image dimensions for viewBox.
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
    const [drawingBox, setDrawingBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImgSize({ w: naturalWidth, h: naturalHeight });
    };

    const getImgCoords = (e: React.MouseEvent) => {
        if (!imgRef.current) return null;
        const rect = imgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * imgSize.w;
        const y = ((e.clientY - rect.top) / rect.height) * imgSize.h;
        return { x, y };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const coords = getImgCoords(e);
        if (coords) {
            setDrawingBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (drawingBox) {
            const coords = getImgCoords(e);
            if (coords) {
                setDrawingBox({ ...drawingBox, x2: coords.x, y2: coords.y });
            }
        }
    };

    const handleMouseUp = () => {
        if (drawingBox) {
            const width = Math.abs(drawingBox.x2 - drawingBox.x1);
            const height = Math.abs(drawingBox.y2 - drawingBox.y1);
            if (width > 5 && height > 5) {
                const newBox = [
                    Math.min(drawingBox.x1, drawingBox.x2),
                    Math.min(drawingBox.y1, drawingBox.y2),
                    Math.max(drawingBox.x1, drawingBox.x2),
                    Math.max(drawingBox.y1, drawingBox.y2)
                ];
                // Manual hook into setBoxes would be needed here or pass onBoxAdd prop
                (window as any).__v_manual_box_add?.(newBox);
            }
            setDrawingBox(null);
        }
    };

    if (!imagePath) return null;

    return (
        <div className="relative w-full h-full p-4 overflow-auto select-none custom-scrollbar flex flex-col items-center" ref={containerRef}>
            <div
                className="relative shadow-2xl rounded-lg bg-black group/canvas w-full max-w-4xl"
                style={{
                    aspectRatio: imgSize.w && imgSize.h ? `${imgSize.w} / ${imgSize.h}` : 'auto'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <img
                    ref={imgRef}
                    src={`file://${imagePath}`}
                    alt="Work"
                    className="block w-full h-auto pointer-events-none"
                    onLoad={handleImageLoad}
                />

                {imgSize.w > 0 && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {boxes.map((box, i) => {
                            const [x1, y1, x2, y2] = box;
                            const width = x2 - x1;
                            const height = y2 - y1;

                            return (
                                <g key={i}>
                                    <rect
                                        x={x1}
                                        y={y1}
                                        width={width}
                                        height={height}
                                        fill="rgba(236, 72, 153, 0.1)"
                                        stroke="#ec4899"
                                        strokeWidth="4"
                                        className="pointer-events-auto cursor-pointer hover:fill-pink-500/30 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBoxSelect?.(i);
                                        }}
                                    />
                                    <text
                                        x={x1 + 10}
                                        y={y1 + 50}
                                        fill="white"
                                        fontSize="40"
                                        fontWeight="bold"
                                        className="drop-shadow-[0_2px_2px_rgba(0,0,0,1)] pointer-events-none"
                                        style={{ paintOrder: 'stroke', stroke: 'black', strokeWidth: '2px' }}
                                    >
                                        #{startIndex + i + 1}
                                    </text>
                                </g>
                            );
                        })}

                        {drawingBox && (
                            <rect
                                x={Math.min(drawingBox.x1, drawingBox.x2)}
                                y={Math.min(drawingBox.y1, drawingBox.y2)}
                                width={Math.abs(drawingBox.x2 - drawingBox.x1)}
                                height={Math.abs(drawingBox.y2 - drawingBox.y1)}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                        )}
                    </svg>
                )}
            </div>

            {/* Floating Stats */}
            <div className="absolute top-4 right-4 z-50 bg-black/80 text-green-400 p-2 text-[10px] font-mono rounded backdrop-blur border border-green-900/50 shadow-xl pointer-events-none uppercase tracking-tighter">
                {imgSize.w}x{imgSize.h} | {boxes.length} BXS
            </div>
        </div>
    );
}
