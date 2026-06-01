import { useState, useEffect } from "react";
import { MainLayout } from "./components/Layout/MainLayout";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { CanvasEditor } from "./components/CanvasEditor";
import { usePythonBackend } from "./hooks/usePythonBackend";

function App() {
  const { isReady, isProcessing, pendingCount, imageList, setImageList, setBoxes, listImages, detect, ocrBox, ocrBatch, exportPSD, clean, error } = usePythonBackend();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [workingDir, setWorkingDir] = useState<string | null>(null);

  // Project-wide state for boxes and OCR text
  const [projectBoxes, setProjectBoxes] = useState<{ [path: string]: number[][] }>({});
  const [projectOcr, setProjectOcr] = useState<{ [path: string]: string[] }>({});
  const [projectTranslations, setProjectTranslations] = useState<{ [path: string]: string[] }>({});

  // Detailed Progress State
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const sortBoxes = (boxes: number[][]) => {
    return [...boxes].sort((a, b) => a[1] - b[1]); // Sort by y1 (top to bottom)
  };

  const getEpisodeNameFromPath = (imagePath: string) => {
    const normalized = imagePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    if (parts.length >= 2) {
      return parts[parts.length - 2] || "episode";
    }
    return "episode";
  };

  // Capture incoming results (boxes/text) and map to project state using imagePath
  useEffect(() => {
    const cleanup = window.electronAPI.onPythonResponse((response: any) => {
      if (response.status === 'success') {
        const path = response.imagePath;
        if (!path) return;

        if (response.boxes) {
          const sorted = sortBoxes(response.boxes);
          setProjectBoxes(prev => ({ ...prev, [path]: sorted }));
          if (path === selectedImage) setBoxes(sorted);
        }

        if (response.text) {
          // Count progress when processing text
          if (response.text.includes('\n\n')) {
            const parts = response.text.split('\n\n').map((p: string) => p.replace(/^\[\d+\]\s*/, ''));
            setProjectOcr(prev => ({ ...prev, [path]: parts }));
            setProgress(prev => ({ ...prev, current: prev.current + parts.length }));
          } else {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }

        if (response.cleanedPath) {
          console.log(`Image cleaned: ${response.cleanedPath}`);
          // We could potentially switch to the cleaned image or just notify the user
          // For now, let's just log it. In a real app, maybe we'd update the imageList with the cleaned version.
          if (response.imagePath === selectedImage) {
            // Optional: refresh the view if needed
          }
        }
      }
    });
    return cleanup;
  }, [selectedImage, setBoxes]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-900 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
          <p>{error}</p>
          <p className="text-sm mt-4 text-red-200">Please restart the application or check console logs.</p>
        </div>
      </div>
    );
  }

  // Initial load - DO NOT hardcode target if we want user selection
  useEffect(() => {
    if (isReady && !workingDir) {
      // Optional: Load a default directory or wait for user
    }
  }, [isReady, workingDir]);

  const handleOpenFolder = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const dir = result.filePaths[0];
        setWorkingDir(dir);
        listImages(dir);
        setSelectedImage(null); // Reset selection
      }
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

  const handleAddPage = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newImages = [...imageList];
        result.filePaths.forEach((p: string) => {
          if (!newImages.includes(p)) newImages.push(p);
        });
        setImageList(newImages);

        if (!workingDir && result.filePaths.length > 0) {
          const lastIndex = Math.max(result.filePaths[0].lastIndexOf('\\'), result.filePaths[0].lastIndexOf('/'));
          const dir = result.filePaths[0].substring(0, lastIndex);
          setWorkingDir(dir);
        }
      }
    } catch (error) {
      console.error("Failed to add pages:", error);
    }
  };

  const handleImageSelect = (imagePath: string) => {
    setSelectedImage(imagePath);
    if (projectBoxes[imagePath]) {
      setBoxes(projectBoxes[imagePath]);
    } else {
      setBoxes([]);
    }
  };

  const handleRunDetection = () => {
    if (selectedImage) detect(selectedImage);
  };

  const handleRunProjectDetection = () => {
    imageList.forEach(path => detect(path));
  };

  const handleRunProjectOCR = () => {
    // Reset progress tracking
    let totalBoxes = 0;
    imageList.forEach(path => {
      totalBoxes += (projectBoxes[path]?.length || 0);
    });
    setProgress({ current: 0, total: totalBoxes });

    imageList.forEach(path => {
      const currentBoxes = projectBoxes[path];
      if (currentBoxes && currentBoxes.length > 0) {
        const startIndex = calculateStartIndex(path);
        ocrBatch(path, currentBoxes, startIndex);
      }
    });
  };

  const handleCleanPage = () => {
    if (selectedImage) {
      const boxes = projectBoxes[selectedImage];
      clean(selectedImage, boxes);
    }
  };

  const handleDeleteSelectedBox = (index: number) => {
    if (!selectedImage) return;
    const currentBoxes = projectBoxes[selectedImage] || [];
    if (index < 0 || index >= currentBoxes.length) return;
    const updated = currentBoxes.filter((_, i) => i !== index);
    setProjectBoxes(prev => ({ ...prev, [selectedImage]: updated }));
    setBoxes(updated);
  };

  const handleExportProjectPSD = () => {
    console.log("Exporting PSD Project...");
    console.log("Current Images:", imageList.length);

    // Safety check: ensure projectTranslations is populated if there's visible text in the hub
    // In a final app, we should probably just use the latest values from RightSidebar

    let count = 0;
    imageList.forEach(path => {
      const bxs = projectBoxes[path] || [];
      const trans = projectTranslations[path] || [];

      console.log(`EXPORT_DEBUG: ${path} | Boxes: ${bxs.length} | Trans: ${trans.length}`);
      if (bxs.length > 0 && trans.length > 0) {
        console.log(`EXPORT_DEBUG: First Trans for ${path}: ${trans[0].substring(0, 30)}`);
      }

      console.log(`Calling exportPSD for: ${path}`);
      exportPSD(path, bxs, trans);
      count++;
    });

    if (count === 0) {
      console.warn("No pages matched the export criteria (must have boxes AND translations).");
      alert("No translations found to export! Please click 'Apply All Translations' first.");
    }
  };

  const calculateStartIndex = (currentPath: string | null) => {
    if (!currentPath) return 0;
    let count = 0;
    for (const path of imageList) {
      if (path === currentPath) break;
      count += (projectBoxes[path]?.length || 0);
    }
    return count;
  };

  // Handle manual box addition with sorting
  const handleManualBoxAdd = (newBox: number[]) => {
    if (!selectedImage) return;
    const currentBoxes = projectBoxes[selectedImage] || [];
    const updated = sortBoxes([...currentBoxes, newBox]);
    setProjectBoxes(prev => ({ ...prev, [selectedImage]: updated }));
    setBoxes(updated); // Sync to hook state
  };

  // Expose to window for CanvasEditor to call (simple way without refactoring too much)
  useEffect(() => {
    (window as any).__v_manual_box_add = handleManualBoxAdd;
    return () => { delete (window as any).__v_manual_box_add; };
  }, [projectBoxes, selectedImage]);

  const getCombinedOriginalText = () => {
    let result = "";
    imageList.forEach((path) => {
      const episode = getEpisodeNameFromPath(path);
      const bxs = projectBoxes[path] || [];
      const ocr = projectOcr[path] || [];
      const startIndex = calculateStartIndex(path);

      bxs.forEach((box, i) => {
        const globalId = startIndex + i + 1;
        const [x1, y1, x2, y2] = box.map(Math.round);
        result += `#${globalId} ${x1} ${y1} ${x2} ${y2} episode ${episode}\n`;
        result += `${ocr[i] || ""}\n\n`;
      });
    });
    return result;
  };

  const getCombinedTranslationText = () => {
    let result = "";
    imageList.forEach((path) => {
      const episode = getEpisodeNameFromPath(path);
      const bxs = projectBoxes[path] || [];
      const translations = projectTranslations[path] || [];
      const startIndex = calculateStartIndex(path);

      bxs.forEach((_, i) => {
        const globalId = startIndex + i + 1;
        result += `#${globalId} episode ${episode}\n`;
        result += `${translations[i] || ""}\n\n`;
      });
    });
    return result;
  };

  const handleSaveAllTexts = async () => {
    const byEpisode: Record<string, string[]> = {};

    imageList.forEach((path) => {
      const episode = getEpisodeNameFromPath(path);
      const bxs = projectBoxes[path] || [];
      const ocr = projectOcr[path] || [];
      const translations = projectTranslations[path] || [];
      const startIndex = calculateStartIndex(path);

      if (!byEpisode[episode]) byEpisode[episode] = [];

      bxs.forEach((box, i) => {
        const globalId = startIndex + i + 1;
        const [x1, y1, x2, y2] = box.map(Math.round);
        byEpisode[episode].push(`#${globalId} ${x1} ${y1} ${x2} ${y2}`);
        byEpisode[episode].push(`OCR: ${ocr[i] || ""}`);
        byEpisode[episode].push(`TRANS: ${translations[i] || ""}`);
        byEpisode[episode].push("");
      });
    });

    const files = Object.entries(byEpisode).map(([name, lines]) => ({
      name,
      content: lines.join('\n')
    }));

    if (files.length === 0) {
      alert("No episode text to save.");
      return;
    }

    const res = await window.electronAPI.saveTextsByEpisode(files);
    if (res?.ok) {
      alert(`Saved ${res.count} episode files to ${res.targetDir}`);
    }
  };

  const handleLoadTranslations = async () => {
    const res = await window.electronAPI.loadTextsByEpisode();
    if (!res?.ok || !res?.texts) return;

    const textMap: Record<string, string> = res.texts;
    const nextTranslations = { ...projectTranslations };

    imageList.forEach((path) => {
      const episode = getEpisodeNameFromPath(path);
      const fileText = textMap[episode];
      if (!fileText) return;

      const lines = fileText.split('\n');
      const loaded: string[] = [];
      for (const line of lines) {
        if (line.startsWith('TRANS:')) {
          loaded.push(line.replace(/^TRANS:\s*/, ''));
        }
      }
      if (loaded.length > 0) {
        nextTranslations[path] = loaded;
      }
    });

    setProjectTranslations(nextTranslations);
    alert("Loaded translations from episode files.");
  };

  const handleApplyTranslations = (_originalText: string, translationText: string) => {
    const lines = translationText.split('\n');
    const newProjectTranslations = { ...projectTranslations };
    const newProjectBoxes = { ...projectBoxes };

    const allBlocks: Array<{ id: number, translation: string, box?: number[], page?: string }> = [];
    let currentBlock: { id: number, translation: string, box?: number[], page?: string } | null = null;
    let currentBlockLines: string[] = [];
    let lastPage: string | undefined = undefined;

    const finalizeBlock = () => {
      if (!currentBlock) return;

      const blockLines = currentBlockLines;
      const thaiRegex = /[\u0E00-\u0E7F]/;
      const firstThaiLineIdx = blockLines.findIndex(l => thaiRegex.test(l));

      let text = '';
      if (firstThaiLineIdx !== -1) {
        text = blockLines.slice(firstThaiLineIdx).join('\n').trim();
      } else {
        text = blockLines.join('\n').trim();
      }

      currentBlock.translation = text;
      allBlocks.push(currentBlock);
      currentBlock = null;
      currentBlockLines = [];
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(/^#(\d+)(.*)/);

      if (match) {
        if (currentBlock && currentBlockLines.length > 0) {
          finalizeBlock();
        }

        const id = parseInt(match[1]);
        const content = match[2].trim();
        const coordsMatch = content.match(/^([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
        const pageMatch = content.match(/page\s+(\d+)/);

        if (pageMatch) {
          lastPage = pageMatch[1];
        }

        if (!currentBlock) {
          currentBlock = { id, translation: '', page: lastPage };
        } else {
          currentBlock.id = id;
          if (lastPage) currentBlock.page = lastPage;
        }

        if (coordsMatch) {
          currentBlock.box = coordsMatch.slice(1, 5).map(Number);
        }
      } else if (trimmedLine.length > 0 && !trimmedLine.startsWith('_')) {
        currentBlockLines.push(line);
      }
    }
    finalizeBlock();

    const pageData: { [page: string]: Array<{ id: number, translation: string, box?: number[] }> } = {};
    allBlocks.forEach(block => {
      if (block.page && block.translation) {
        const pageNum = block.page;
        if (!pageData[pageNum]) pageData[pageNum] = [];
        pageData[pageNum].push(block);
      }
    });

    Object.entries(pageData).forEach(([pageNum, items]) => {
      const matchingImage = imageList.find(path => {
        const filename = path.split(/[\\/]/).pop()?.replace(/\.(webp|jpg|png|jpeg)$/i, '') || '';
        const fileNumeric = filename.match(/\d+/)?.[0] || '';
        const pageNumeric = pageNum.match(/\d+/)?.[0] || '';

        return filename === pageNum ||
          filename.padStart(3, '0') === pageNum.padStart(3, '0') ||
          (fileNumeric && fileNumeric.replace(/^0+/, '') === pageNumeric.replace(/^0+/, ''));
      });

      if (matchingImage) {
        const imageTranslations: string[] = [];
        const imageBoxes: number[][] = [];
        items.sort((a, b) => a.id - b.id);
        items.forEach(item => {
          if (item.box) {
            imageTranslations.push(item.translation);
            imageBoxes.push(item.box);
          }
        });

        if (imageTranslations.length > 0) {
          newProjectTranslations[matchingImage] = imageTranslations;
          newProjectBoxes[matchingImage] = imageBoxes;
        }
      }
    });

    const hasPageData = Object.keys(pageData).length > 0;
    if (!hasPageData) {
      imageList.forEach((path) => {
        const boxes = projectBoxes[path] || [];
        const startIndex = calculateStartIndex(path);
        const imageTranslations: string[] = [];
        const imageBoxes: number[][] = [...boxes];
        let changedBoxes = false;

        for (let i = 0; i < boxes.length; i++) {
          const id = startIndex + i + 1;
          const block = allBlocks.find(b => b.id === id);
          if (block) {
            imageTranslations.push(block.translation);
            if (block.box) {
              imageBoxes[i] = block.box;
              changedBoxes = true;
            }
          } else {
            imageTranslations.push(projectTranslations[path]?.[i] || '');
          }
        }

        newProjectTranslations[path] = imageTranslations;
        if (changedBoxes) {
          newProjectBoxes[path] = imageBoxes;
        }
      });
    }

    console.log('DEBUG_MAP: Final project translations keys:', Object.keys(newProjectTranslations));

    setProjectTranslations(newProjectTranslations);
    setProjectBoxes(newProjectBoxes);

    if (selectedImage && newProjectBoxes[selectedImage]) {
      setBoxes(newProjectBoxes[selectedImage]);
    }

    console.log('Applied translations and updated boxes from text editor');
  };

  return (
    <MainLayout
      leftSidebar={
        <LeftSidebar
          images={imageList}
          onSelect={handleImageSelect}
          selected={selectedImage}
          onOpenFolder={handleOpenFolder}
          onAddPage={handleAddPage}
          onDetect={handleRunDetection}
          onDetectAll={handleRunProjectDetection}
          onOCRPage={() => selectedImage && ocrBatch(selectedImage, projectBoxes[selectedImage] || [])}
          onOCRAll={handleRunProjectOCR}
          onClean={handleCleanPage}
          isOCRAllAvailable={!!workingDir}
        />
      }
      rightSidebar={
        <RightSidebar
          originalText={getCombinedOriginalText()}
          translationText={getCombinedTranslationText()}
          onUpdate={(orig, trans) => handleApplyTranslations(orig, trans)}
          onExportPSD={handleExportProjectPSD}
          onSaveAll={handleSaveAllTexts}
          onLoadTranslations={handleLoadTranslations}
        />
      }
    >
      <div className="flex-1 h-full flex items-center justify-center bg-dots-neutral-800 relative group overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900/50 pointer-events-none" />

        {selectedImage ? (
          <CanvasEditor
            imagePath={selectedImage}
            boxes={projectBoxes[selectedImage] || []}
            startIndex={calculateStartIndex(selectedImage)}
            onBoxSelect={(idx) => ocrBox(selectedImage, projectBoxes[selectedImage][idx])}
            onBoxDelete={handleDeleteSelectedBox}
          />
        ) : (
          <div className="relative z-10 text-center">
            <div
              onClick={handleOpenFolder}
              className="w-24 h-24 mx-auto bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-neutral-700 hover:border-pink-500/50 hover:bg-neutral-700/50 transition-all cursor-pointer group-hover:scale-110 duration-300"
            >
              <span className="text-4xl group-hover:animate-bounce">📂</span>
            </div>
            <h3 className="lg:text-lg font-medium text-neutral-300">Open Project Folder</h3>
            <p className="text-neutral-500 text-sm mt-1 max-w-[200px] mx-auto">
              Select a folder containing your images to start OCR processing.
            </p>
          </div>
        )}

        {/* Global Loading Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-pink-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="w-16 h-16 border-4 border-neutral-800 border-t-pink-500 rounded-full animate-spin shadow-2xl shadow-pink-500/20" />
                <div className="absolute inset-0 rounded-full blur-xl bg-pink-500/10" />
              </div>
              <div className="text-[10px] uppercase font-black tracking-[0.2em] text-pink-500 animate-pulse text-center space-y-1">
                <div>AI Processing In Progress</div>
                {progress.total > 0 && (
                  <div className="text-[8px] opacity-70">
                    Processed {progress.current} of {progress.total} boxes
                  </div>
                )}
                {pendingCount > 0 && (
                  <div className="text-[8px] opacity-70">
                    {pendingCount} operations active
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default App;
