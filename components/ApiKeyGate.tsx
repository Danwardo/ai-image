
import React from 'react';

interface ApiKeyGateProps {
  onSuccess: () => void;
}

const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onSuccess }) => {
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      onSuccess();
    } catch (err) {
      console.error("Failed to open key selector", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-key text-2xl text-white"></i>
        </div>
        <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
        <p className="text-slate-400 mb-8">
          The Gemini 3 Pro Image model requires a personal API key from a paid Google Cloud project. 
          Please select your key to continue.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group"
        >
          Select API Key
          <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
        </button>
        <p className="mt-4 text-xs text-slate-500">
          Learn about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">billing and quotas</a>.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyGate;
