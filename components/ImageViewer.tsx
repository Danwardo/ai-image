import React, { useState, useEffect } from 'react';
import { ImageItem, ReferenceScene } from '../types';

interface ImageViewerProps {
  activeImage: ImageItem | null;
  activeScene: ReferenceScene | null;
  onRetry: () => void;
  onSelectPrompt: () => void;
  onUploadClick: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  activeImage,
  activeScene,
  onRetry,
  onUploadClick
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'slider' | 'triptych' | 'full'>('slider');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Timer for processing
  useEffect(() => {
    let interval: any = null;
    if (activeImage?.status === 'processing') {
      setElapsedTime(0);
      const startTime = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.round((Date.now() - startTime) / 100) / 10);
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeImage?.status]);

  if (!activeImage) {
    return (
      <div className="bg-slate-900/60 rounded-[36px] border border-slate-800 min-h-[580px] flex items-center justify-center p-8 text-center shadow-2xl">
        <div className="space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto text-blue-400 text-3xl shadow-inner">
            <i className="fa-solid fa-couch"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Furniture Scene Compositor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import furniture photos on the left, then supply your designed reference scene on the right to insert items directly into the room.
            </p>
          </div>
          <button
            onClick={onUploadClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i> Import Furniture Batch
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = activeImage.status === 'completed' && activeImage.resultUrl;
  const isProcessing = activeImage.status === 'processing';
  const isError = activeImage.status === 'error';

  return (
    <div className="bg-slate-900/80 rounded-[36px] border border-slate-800 overflow-hidden relative min-h-[580px] flex flex-col shadow-2xl">
      {/* Top Bar with View Mode Switcher and Status */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white truncate max-w-[200px]">
            {activeImage.file.name}
          </span>
          {activeImage.processingTimeMs && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
              <i className="fa-solid fa-bolt text-[8px]"></i>
              {(activeImage.processingTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {isCompleted && (
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'slider' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split comparison slider"
            >
              <i className="fa-solid fa-arrows-left-right text-[9px]"></i> Split
            </button>
            <button
              onClick={() => setViewMode('triptych')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'triptych' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Furniture + Scene = In-Scene Result"
            >
              <i className="fa-solid fa-table-columns text-[9px]"></i> 3-Way
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'full' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full result view"
            >
              <i className="fa-solid fa-expand text-[9px]"></i> Result
            </button>
          </div>
        )}
      </div>

      {/* Main Visual Display Area */}
      <div className="relative flex-1 flex items-center justify-center p-6 bg-slate-950/20">
        {isCompleted ? (
          <>
            {/* View Mode 1: Split Slider */}
            {viewMode === 'slider' && (
              <div className="relative w-full h-full max-h-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none">
                {/* Background: Original Furniture */}
                <img 
                  src={activeImage.previewUrl} 
                  alt="Original" 
                  className="absolute inset-0 w-full h-full object-contain bg-slate-950/80" 
                />
                
                {/* Foreground: In-Scene Result with Clip Path */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img 
                    src={activeImage.resultUrl!} 
                    alt="In-Scene Result" 
                    className="w-full h-full object-contain bg-slate-950/80" 
                  />
                </div>

                {/* Range Input for dragging */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(parseInt(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize z-20"
                />

                {/* Vertical Divider Line with Grab Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)] z-10 pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-2xl border border-slate-300 text-xs">
                    <i className="fa-solid fa-arrows-left-right"></i>
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white border border-white/10 pointer-events-none">
                  Original
                </div>
                <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white border border-blue-400/30 pointer-events-none">
                  Inserted In Scene
                </div>
              </div>
            )}

            {/* View Mode 2: Triptych (Original + Scene -> Result) */}
            {viewMode === 'triptych' && (
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[9px]">1</span>
                    Furniture Item
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                    <img src={activeImage.previewUrl} alt="Furniture" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[9px]">2</span>
                    Designed Scene
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex items-center justify-center">
                    {activeScene ? (
                      <img src={activeScene.previewUrl} alt="Scene" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="text-center p-4 text-slate-600">
                        <i className="fa-solid fa-wand-magic-sparkles text-2xl mb-2"></i>
                        <p className="text-[10px]">Prompt Generated Background</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">3</span>
                    Composited Result
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-blue-500/50 bg-slate-950 p-2 shadow-xl shadow-blue-500/10">
                    <img src={activeImage.resultUrl!} alt="Result" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            )}

            {/* View Mode 3: Full In-Scene Result */}
            {viewMode === 'full' && (
              <div className="relative w-full h-full max-h-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
                <img 
                  src={activeImage.resultUrl!} 
                  alt="Full Result" 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}
          </>
        ) : (
          /* Template / Pending State Preview */
          <div className="w-full max-h-[500px] aspect-square rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/60 p-4 flex items-center justify-center">
            <img 
              src={activeImage.previewUrl} 
              alt="Template" 
              className="w-full h-full object-contain" 
            />
          </div>
        )}

        {/* Processing State Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-30 p-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6 max-w-sm w-full">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin absolute inset-0"></div>
                <i className="fa-solid fa-couch text-blue-400 text-2xl"></i>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h4 className="font-bold text-white text-base">
                    Inserting Into Scene
                  </h4>
                  <span className="text-xs font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {elapsedTime}s
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {elapsedTime < 3 
                    ? "Mapping room perspective & horizon line..." 
                    : elapsedTime < 6 
                    ? "Locking floor contact plane & occlusion shadows..." 
                    : "Refining ambient lighting & seamless edge integration..."}
                </p>
              </div>

              {/* Progress Bar Animation */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(95, elapsedTime * 20)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State Overlay */}
        {isError && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-30 p-6">
            <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl text-center space-y-5 max-w-sm w-full">
              <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
                <i className="fa-solid fa-circle-exclamation"></i>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Insertion Failed</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeImage.error || "An error occurred during scene integration. Check API key and reference images."}
                </p>
              </div>

              <button
                onClick={onRetry}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-arrow-rotate-right"></i> Retry Insertion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar with Metadata and Quick Download */}
      {isCompleted && (
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 backdrop-blur-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <i className="fa-solid fa-circle-check text-green-400"></i>
            <span className="text-[11px] font-semibold text-slate-300">
              Photorealistic Scene Composited
            </span>
          </div>

          <a
            href={activeImage.resultUrl!}
            download={`scene-composite-${activeImage.file.name}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-download text-blue-400"></i> Download Image
          </a>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
