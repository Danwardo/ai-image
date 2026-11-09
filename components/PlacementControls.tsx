import React from 'react';
import { InsertionSettings, PerformanceSpeed, ScaleDepth } from '../types';

interface PlacementControlsProps {
  settings: InsertionSettings;
  onSettingsChange: (settings: InsertionSettings) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  hasReferenceScene: boolean;
  disabled?: boolean;
}

export const PlacementControls: React.FC<PlacementControlsProps> = ({
  settings,
  onSettingsChange,
  prompt,
  onPromptChange,
  hasReferenceScene,
  disabled
}) => {
  const updateSetting = <K extends keyof InsertionSettings>(key: K, value: InsertionSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
      {/* Speed & Resolution Control */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <i className="fa-solid fa-gauge-high text-blue-400"></i> Generation Speed
          </label>
          <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            {settings.performanceSpeed === 'turbo' ? '⚡ 3-5s Turnaround' : settings.performanceSpeed === 'studio' ? '✨ 8-12s Turnaround' : '💎 4K Master'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            disabled={disabled}
            onClick={() => updateSetting('performanceSpeed', 'turbo')}
            className={`py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${
              settings.performanceSpeed === 'turbo'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡ Turbo (1K)</span>
            <span className="text-[8px] opacity-75 font-normal">Quicker & responsive</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => updateSetting('performanceSpeed', 'studio')}
            className={`py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${
              settings.performanceSpeed === 'studio'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>✨ Studio (2K)</span>
            <span className="text-[8px] opacity-75 font-normal">High texture detail</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => updateSetting('performanceSpeed', 'ultra')}
            className={`py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${
              settings.performanceSpeed === 'ultra'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💎 Master (4K)</span>
            <span className="text-[8px] opacity-75 font-normal">Print archival</span>
          </button>
        </div>
      </div>

      {/* Scale & Room Depth */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Scale & Perspective Depth
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'hero', label: 'Hero Focus', sub: 'Foreground' },
            { id: 'natural', label: 'Architectural', sub: 'Natural Scale' },
            { id: 'accent', label: 'Room Accent', sub: 'Midground' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => updateSetting('scaleDepth', item.id as ScaleDepth)}
              className={`py-2 px-1 rounded-xl text-center border transition-all ${
                settings.scaleDepth === item.id
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] leading-tight font-semibold">{item.label}</div>
              <div className="text-[8px] text-slate-500 leading-tight">{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accuracy & Physical Realism Toggles */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Physical Accuracy Locks
        </label>

        {/* Floor Contact Shadows */}
        <div 
          onClick={() => !disabled && updateSetting('lockGroundShadows', !settings.lockGroundShadows)}
          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] transition-all ${
              settings.lockGroundShadows ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
            }`}>
              {settings.lockGroundShadows && <i className="fa-solid fa-check"></i>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-300">Floor Contact & Occlusion Shadows</p>
              <p className="text-[8px] text-slate-500">Grounds legs firmly on floor plane; avoids floating</p>
            </div>
          </div>
        </div>

        {/* Lighting Harmony */}
        <div 
          onClick={() => !disabled && updateSetting('matchLighting', !settings.matchLighting)}
          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] transition-all ${
              settings.matchLighting ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
            }`}>
              {settings.matchLighting && <i className="fa-solid fa-check"></i>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-300">Scene Light & Ambient Reflection</p>
              <p className="text-[8px] text-slate-500">Directional highlights aligned with windows/sunlight</p>
            </div>
          </div>
        </div>

        {/* 100% Geometry Lock */}
        <div 
          onClick={() => !disabled && updateSetting('preserveTexture', !settings.preserveTexture)}
          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] transition-all ${
              settings.preserveTexture ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-900'
            }`}>
              {settings.preserveTexture && <i className="fa-solid fa-check"></i>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-300">100% Furniture Geometry & Fabric Lock</p>
              <p className="text-[8px] text-slate-500">Pixel-accurate structure without AI redesign</p>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Tuning Prompt */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          {hasReferenceScene ? 'Scene Placement Notes (Optional)' : 'Environment Description'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={hasReferenceScene 
            ? "e.g., Placed facing left towards the window, soft shadow cast on wood floor..." 
            : "e.g., Polished concrete floor, warm sunlight, minimal beige walls..."}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50 resize-none min-h-[70px] transition-all"
        />
      </div>
    </div>
  );
};

export default PlacementControls;
