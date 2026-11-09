import React, { useState, useEffect, useRef } from 'react';
import ApiKeyGate from './components/ApiKeyGate';
import ReferenceSceneManager from './components/ReferenceSceneManager';
import PlacementControls from './components/PlacementControls';
import ImageViewer from './components/ImageViewer';
import { 
  editImageBackground, 
  fileToBase64, 
  getClosestAspectRatio, 
  SupportedAspectRatio, 
  generateSeoKeywords 
} from './services/geminiService';
import { resizeImage, generateSeoFilename, resizeImageToMax } from './services/imageProcessor';
import { ImageItem, ReferenceScene, InsertionSettings } from './types';
import { PRESET_SCENES } from './services/presetScenes';

const SAMPLE_FURNITURE_URLS = [
  {
    name: 'Scandi-Armchair.jpg',
    url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Minimalist-Lounge-Chair.jpg',
    url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Oak-Dining-Chair.jpg',
    url: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80'
  }
];

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Reference Scene state
  const [activeScene, setActiveScene] = useState<ReferenceScene | null>(PRESET_SCENES[0]);
  
  // Placement and speed settings
  const [settings, setSettings] = useState<InsertionSettings>({
    anchor: 'center',
    customPoint: { x: 50, y: 72 },
    scaleDepth: 'natural',
    performanceSpeed: 'turbo', // Default to Turbo (1K) for lightning-fast turnaround
    lockGroundShadows: true,
    matchLighting: true,
    preserveTexture: true,
  });

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [saveFullSize, setSaveFullSize] = useState(true);
  const [saveWebSize, setSaveWebSize] = useState(false);
  const [useSeoNaming, setUseSeoNaming] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (err) {
        console.warn("Key check failed:", err);
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newItems: ImageItem[] = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const aspectRatio = await new Promise<SupportedAspectRatio>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(getClosestAspectRatio(img.width, img.height));
          img.src = url;
        });

        return {
          id: Math.random().toString(36).substring(7),
          file,
          previewUrl: url,
          resultUrl: null,
          aspectRatio,
          status: 'idle' as const,
        };
      })
    );

    setImages(prev => [...prev, ...newItems]);
    if (!activeId && newItems.length > 0) {
      setActiveId(newItems[0].id);
    }
  };

  const handleLoadSampleFurniture = async () => {
    try {
      const items: ImageItem[] = await Promise.all(
        SAMPLE_FURNITURE_URLS.map(async (sample) => {
          const res = await fetch(sample.url);
          const blob = await res.blob();
          const file = new File([blob], sample.name, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(file);
          
          return {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl,
            resultUrl: null,
            aspectRatio: '1:1' as const,
            status: 'idle' as const
          };
        })
      );

      setImages(prev => [...prev, ...items]);
      if (!activeId && items.length > 0) {
        setActiveId(items[0].id);
      }
    } catch (err) {
      console.error("Failed to load sample furniture:", err);
    }
  };

  const processSingleImage = async (
    item: ImageItem, 
    currentPrompt: string, 
    referenceSceneBase64?: string | null
  ) => {
    const startTime = Date.now();
    setImages(prev => prev.map(img => img.id === item.id ? { ...img, status: 'processing', error: null } : img));
    
    try {
      const rawBase64 = await fileToBase64(item.file);
      
      // Speed Optimization: Determine client-side resize dimensions based on performanceSpeed
      const maxDim = settings.performanceSpeed === 'turbo' ? 1024 : (settings.performanceSpeed === 'studio' ? 1536 : 2048);
      const quality = settings.performanceSpeed === 'turbo' ? 0.85 : 0.90;
      
      const base64 = await resizeImageToMax(rawBase64, maxDim, quality);
      
      // Determine reference scene base64
      let sceneBase64 = referenceSceneBase64 ?? activeScene?.base64 ?? null;
      if (!sceneBase64 && activeScene?.previewUrl) {
        try {
          const { urlToBase64 } = await import('./services/imageProcessor');
          sceneBase64 = await urlToBase64(activeScene.previewUrl);
        } catch (e) {
          console.warn("Could not convert scene preview to base64, proceeding with prompt:", e);
        }
      }

      // Parallelize image generation with SEO keywords only if SEO renaming is requested
      const [result, seoKeywords] = await Promise.all([
        editImageBackground(base64, currentPrompt, item.aspectRatio, sceneBase64, settings),
        useSeoNaming ? generateSeoKeywords(base64, currentPrompt || activeScene?.title || "furniture") : Promise.resolve("")
      ]);

      const durationMs = Date.now() - startTime;

      setImages(prev => prev.map(img => img.id === item.id ? { 
        ...img, 
        status: 'completed', 
        resultUrl: result, 
        seoKeywords: seoKeywords,
        processingTimeMs: durationMs,
        error: null 
      } : img));

      return result;
    } catch (err: any) {
      const isAuthError = err.message === "API_KEY_EXPIRED";
      if (isAuthError) setHasKey(false);
      
      setImages(prev => prev.map(img => img.id === item.id ? { 
        ...img, 
        status: 'error', 
        error: isAuthError ? "API Key Expired. Please re-authenticate." : (err.message || "Insertion failed") 
      } : img));
      throw err;
    }
  };

  const handleBulkGenerate = async () => {
    if (images.length === 0 || isBulkProcessing) return;

    setIsBulkProcessing(true);
    const pendingImages = images.filter(img => img.status !== 'completed');
    if (pendingImages.length === 0) {
      setIsBulkProcessing(false);
      return;
    }

    try {
      let sceneBase64 = activeScene?.base64 ?? null;
      if (!sceneBase64 && activeScene?.previewUrl) {
        const { urlToBase64 } = await import('./services/imageProcessor');
        sceneBase64 = await urlToBase64(activeScene.previewUrl);
      }

      for (const item of pendingImages) {
        try {
          setActiveId(item.id);
          await processSingleImage(item, prompt, sceneBase64);
        } catch (e) {
          console.error(`Error processing image ${item.id}:`, e);
        }
      }
    } catch (err) {
      console.error("Batch processing error:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    const completed = images.filter(img => img.resultUrl);
    if (completed.length === 0 || (!saveFullSize && !saveWebSize)) return;

    let downloadCounter = 0;
    for (let i = 0; i < completed.length; i++) {
       const img = completed[i];
       
       if (saveFullSize) {
         const filename = useSeoNaming 
           ? generateSeoFilename(img.seoKeywords || "", img.file.name, i, false)
           : `in-scene-${img.file.name}`;
         
         triggerDownload(img.resultUrl!, filename, downloadCounter++);
       }

       if (saveWebSize) {
         try {
           const webUrl = await resizeImage(img.resultUrl!, 1920, 1080);
           const filename = useSeoNaming 
             ? generateSeoFilename(img.seoKeywords || "", img.file.name, i, true)
             : `in-scene-${img.file.name.replace(/\.[^/.]+$/, "")}-web.jpg`;
           
           triggerDownload(webUrl, filename, downloadCounter++);
         } catch (e) {
           console.error("Failed to resize image for web:", e);
         }
       }
    }
  };

  const triggerDownload = (url: string, filename: string, delayIndex: number) => {
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    }, delayIndex * 350);
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => prev.filter(img => img.id !== id));
    if (activeId === id) {
      const remaining = images.filter(img => img.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const clearQueue = () => {
    setImages([]);
    setActiveId(null);
  };

  const activeImage = images.find(img => img.id === activeId);

  if (hasKey === false) {
    return <ApiKeyGate onSuccess={() => setHasKey(true)} />;
  }

  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Initializing Scene Insertion Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/10">
              <i className="fa-solid fa-couch text-xl text-white"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  StudioPro <span className="text-blue-400">Scene Compositor</span>
                </h1>
                <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  v2.0 Rapid
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-2">
                <span>Direct Furniture-to-Scene Insertion</span>
                <span className="text-slate-600">•</span>
                <span className="text-blue-300">
                  {settings.performanceSpeed === 'turbo' ? '⚡ Turbo Mode (1K)' : '✨ High Quality'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 text-slate-200"
            >
              <i className="fa-solid fa-plus text-blue-400"></i> Import Furniture
            </button>
            <button 
              onClick={handleDownloadAll}
              disabled={images.filter(img => img.resultUrl).length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 text-white"
            >
              <i className="fa-solid fa-cloud-arrow-down"></i> Export Composites
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Furniture Queue & Batches */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Furniture Queue
                </h2>
                <p className="text-[10px] text-slate-500">
                  {images.length} item{images.length === 1 ? '' : 's'} loaded
                </p>
              </div>
              {images.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[10px] text-slate-500 hover:text-red-400 font-semibold transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Queue items list */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {images.map(img => (
                <div
                  key={img.id}
                  onClick={() => setActiveId(img.id)}
                  className={`w-full group relative flex items-center gap-3 p-2 rounded-2xl border transition-all cursor-pointer ${
                    activeId === img.id 
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' 
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                    <img 
                      src={img.resultUrl || img.previewUrl} 
                      className="w-full h-full object-cover" 
                      alt="Furniture item" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {img.file.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {img.status === 'completed' && (
                        <span className="text-[9px] font-bold text-green-400 flex items-center gap-1">
                          <i className="fa-solid fa-circle-check text-[8px]"></i>
                          Composited {img.processingTimeMs ? `(${(img.processingTimeMs / 1000).toFixed(1)}s)` : ''}
                        </span>
                      )}
                      {img.status === 'processing' && (
                        <span className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                          <i className="fa-solid fa-spinner fa-spin text-[8px]"></i> Inserting...
                        </span>
                      )}
                      {img.status === 'error' && (
                        <span className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation text-[8px]"></i> Failed
                        </span>
                      )}
                      {img.status === 'idle' && (
                        <span className="text-[9px] text-slate-500 font-medium">
                          Ready for scene
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => removeImage(img.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity"
                    title="Remove item"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              ))}

              {images.length === 0 && (
                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/30 flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/40 flex items-center justify-center text-slate-600">
                    <i className="fa-solid fa-chair text-xl"></i>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block mb-1">Queue Empty</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Import chairs, sofas, tables or test sample furniture
                    </span>
                  </div>
                  <button
                    onClick={handleLoadSampleFurniture}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-wand-sparkles text-[9px]"></i> Load 3 Samples
                  </button>
                </div>
              )}
            </div>

            {images.length > 0 && (
              <button
                onClick={handleLoadSampleFurniture}
                className="w-full py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-bold transition-all border border-slate-800 flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-[9px]"></i> Add Sample Armchairs
              </button>
            )}
          </div>
        </div>

        {/* Center Column: Interactive Visual Compositor & Inspector */}
        <div className="lg:col-span-5 space-y-6">
          <ImageViewer
            activeImage={activeImage || null}
            activeScene={activeScene}
            onRetry={() => activeImage && processSingleImage(activeImage, prompt)}
            onSelectPrompt={() => {}}
            onUploadClick={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Right Column: Designed Reference Scene & Placement Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Reference Scene Manager */}
          <ReferenceSceneManager
            activeScene={activeScene}
            onSceneSelect={setActiveScene}
            settings={settings}
            onSettingsChange={setSettings}
            disabled={isBulkProcessing || activeImage?.status === 'processing'}
          />

          {/* Placement, Depth & Speed Controls */}
          <PlacementControls
            settings={settings}
            onSettingsChange={setSettings}
            prompt={prompt}
            onPromptChange={setPrompt}
            hasReferenceScene={!!activeScene}
            disabled={isBulkProcessing || activeImage?.status === 'processing'}
          />

          {/* Export Preferences */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Export Preferences
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSaveFullSize(!saveFullSize)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  saveFullSize ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">Full Res</span>
                  {saveFullSize && <i className="fa-solid fa-check text-[9px] text-blue-400"></i>}
                </div>
                <span className="text-[8px] text-slate-500 block">Original Quality</span>
              </button>

              <button
                type="button"
                onClick={() => setSaveWebSize(!saveWebSize)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  saveWebSize ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">Web 1080p</span>
                  {saveWebSize && <i className="fa-solid fa-check text-[9px] text-blue-400"></i>}
                </div>
                <span className="text-[8px] text-slate-500 block">1920x1080</span>
              </button>

              <button
                type="button"
                onClick={() => setUseSeoNaming(!useSeoNaming)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  useSeoNaming ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">SEO Slugs</span>
                  {useSeoNaming && <i className="fa-solid fa-check text-[9px] text-blue-400"></i>}
                </div>
                <span className="text-[8px] text-slate-500 block">Keyword Named</span>
              </button>
            </div>
          </div>

          {/* Action Execution Buttons */}
          <div className="space-y-3">
            <button
              disabled={!activeImage || activeImage.status === 'processing' || isBulkProcessing}
              onClick={() => activeImage && processSingleImage(activeImage, prompt)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm text-white"
            >
              {activeImage?.status === 'processing' ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Inserting into Scene...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles text-blue-200"></i>
                  <span>Insert Active Item into Scene</span>
                </>
              )}
            </button>
            
            <button
              disabled={images.length === 0 || isBulkProcessing}
              onClick={handleBulkGenerate}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-200"
            >
              {isBulkProcessing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Batch Syncing Scene...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-layer-group text-blue-400"></i>
                  <span>Batch Insert All ({images.filter(img => img.status !== 'completed').length} Pending)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default App;
