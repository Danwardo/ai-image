import React, { useRef, useState } from 'react';
import { ReferenceScene, InsertionSettings, PlacementAnchor } from '../types';
import { PRESET_SCENES } from '../services/presetScenes';
import { fileToBase64, resizeImageToMax, urlToBase64 } from '../services/imageProcessor';

interface ReferenceSceneManagerProps {
  activeScene: ReferenceScene | null;
  onSceneSelect: (scene: ReferenceScene | null) => void;
  settings: InsertionSettings;
  onSettingsChange: (settings: InsertionSettings) => void;
  disabled?: boolean;
}

export const ReferenceSceneManager: React.FC<ReferenceSceneManagerProps> = ({
  activeScene,
  onSceneSelect,
  settings,
  onSettingsChange,
  disabled
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingPreset, setIsLoadingPreset] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCustomFileUpload = async (file: File) => {
    try {
      const rawBase64 = await fileToBase64(file);
      // Downscale scene reference appropriately for fast upload
      const optimizedBase64 = await resizeImageToMax(rawBase64, 1536, 0.88);
      
      const newScene: ReferenceScene = {
        id: `custom-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        previewUrl: URL.createObjectURL(file),
        base64: optimizedBase64,
        file: file,
        isPreset: false,
        suggestedAnchor: { x: 50, y: 75 }
      };

      onSceneSelect(newScene);
      onSettingsChange({
        ...settings,
        anchor: 'center',
        customPoint: { x: 50, y: 75 }
      });
    } catch (err) {
      console.error("Failed to load custom scene file:", err);
    }
  };

  const handlePresetSelect = async (preset: ReferenceScene) => {
    setIsLoadingPreset(preset.id);
    try {
      let base64 = preset.base64;
      if (!base64) {
        base64 = await urlToBase64(preset.previewUrl);
      }
      
      onSceneSelect({
        ...preset,
        base64
      });

      if (preset.suggestedAnchor) {
        onSettingsChange({
          ...settings,
          anchor: 'center',
          customPoint: preset.suggestedAnchor
        });
      }
    } catch (err) {
      console.error("Failed to load preset scene:", err);
      // Fallback: still select it with previewUrl
      onSceneSelect(preset);
    } finally {
      setIsLoadingPreset(null);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    onSettingsChange({
      ...settings,
      anchor: 'custom',
      customPoint: { x: Math.round(x), y: Math.round(y) }
    });
  };

  const setAnchorPreset = (anchor: PlacementAnchor) => {
    let point = { x: 50, y: 75 };
    if (anchor === 'left') point = { x: 28, y: 75 };
    if (anchor === 'right') point = { x: 72, y: 75 };
    if (anchor === 'center') point = { x: 50, y: 75 };

    onSettingsChange({
      ...settings,
      anchor,
      customPoint: point
    });
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-sm shadow-inner">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Designed Reference Scene
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Insert furniture directly into this custom environment
            </p>
          </div>
        </div>

        {activeScene && (
          <button
            onClick={() => onSceneSelect(null)}
            className="text-[10px] text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1 font-semibold"
            title="Remove scene and use prompt description"
          >
            <i className="fa-solid fa-xmark"></i> Clear
          </button>
        )}
      </div>

      {/* Active Scene Display or Dropzone */}
      {activeScene ? (
        <div className="space-y-3">
          <div 
            ref={previewRef}
            onClick={handlePreviewClick}
            className="relative aspect-video rounded-2xl overflow-hidden border border-blue-500/30 group cursor-crosshair bg-slate-950 shadow-inner"
          >
            <img 
              src={activeScene.previewUrl} 
              alt={activeScene.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            
            {/* Visual Reticle / Anchor Pin */}
            <div 
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 z-10"
              style={{
                left: `${settings.customPoint?.x ?? 50}%`,
                top: `${settings.customPoint?.y ?? 75}%`
              }}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></span>
                <span className="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[9px]">
                  <i className="fa-solid fa-couch"></i>
                </span>
                <div className="absolute top-7 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white border border-slate-700 whitespace-nowrap shadow-md">
                  Floor Anchor ({Math.round(settings.customPoint?.x ?? 50)}%, {Math.round(settings.customPoint?.y ?? 75)}%)
                </div>
              </div>
            </div>

            {/* Overlay hint */}
            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
              <span className="text-[10px] font-bold text-white truncate drop-shadow">
                {activeScene.title}
              </span>
              <span className="text-[9px] text-blue-300 bg-blue-950/70 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                Click to place anchor
              </span>
            </div>
          </div>

          {/* Anchor Quick Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => setAnchorPreset('center')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                settings.anchor === 'center'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
              }`}
            >
              <i className="fa-solid fa-arrows-to-dot text-[9px]"></i> Center
            </button>
            <button
              onClick={() => setAnchorPreset('left')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                settings.anchor === 'left'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
              }`}
            >
              <i className="fa-solid fa-arrow-left text-[9px]"></i> Left
            </button>
            <button
              onClick={() => setAnchorPreset('right')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                settings.anchor === 'right'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
              }`}
            >
              <i className="fa-solid fa-arrow-right text-[9px]"></i> Right
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-2 rounded-xl text-[10px] font-semibold border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-1"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-[9px]"></i> Swap
            </button>
          </div>
        </div>
      ) : (
        /* Upload Dropzone */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleCustomFileUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/50'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-2 text-base">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <p className="text-xs font-bold text-slate-200">Upload Your Designed Scene</p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
            Supply your 3D CAD render, room photo, showroom, or architectural setting
          </p>
        </div>
      )}

      {/* Preset Reference Scenes for Instant Testing */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            Or Pick a Designer Scene
          </span>
          <span className="text-slate-600 font-medium">1-Click Presets</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PRESET_SCENES.map((preset) => {
            const isSelected = activeScene?.id === preset.id;
            const isLoading = isLoadingPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                disabled={disabled || isLoading}
                className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                }`}
                title={preset.title}
              >
                <img 
                  src={preset.previewUrl} 
                  alt={preset.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  {isLoading && (
                    <i className="fa-solid fa-spinner fa-spin text-white text-xs"></i>
                  )}
                  {isSelected && !isLoading && (
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[8px] text-white shadow">
                      <i className="fa-solid fa-check"></i>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCustomFileUpload(file);
        }}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default ReferenceSceneManager;
