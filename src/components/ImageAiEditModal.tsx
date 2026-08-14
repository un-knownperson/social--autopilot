import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Check,
  X,
  RotateCcw,
  Loader2,
  AlertCircle,
  ImageIcon,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { editImageWithAI, fetchImageAIStatus, ImageAiEditResult } from '../lib/api';

interface ImageAiEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onApplyImage: (chosenImageUrl: string) => void;
  postId?: string;
  initialPrompt?: string;
}

const PRESET_PROMPTS = [
  { label: '✨ Vibrant & High-Contrast', prompt: 'Enhance the vibrancy, dynamic range, and professional lighting while preserving key subjects.' },
  { label: '🌅 Cinematic Sunset Glow', prompt: 'Add warm golden hour lighting, cinematic sunset ambiance, and soft natural depth of field.' },
  { label: '🎨 Modern Digital Art', prompt: 'Transform this into a sleek, colorful digital illustration with sharp details and painterly textures.' },
  { label: '📰 Clean Editorial Photo', prompt: 'Refine into a crisp, clean magazine editorial photo with balanced contrast and high-definition studio clarity.' },
  { label: '⚡ Cyberpunk Neon Vibe', prompt: 'Apply futuristic cyberpunk lighting with subtle cyan and magenta neon accents and moody atmosphere.' },
  { label: '🌿 Natural Bokeh & Soft Focus', prompt: 'Enhance subject clarity with a soft, blurred background and gentle natural sunlight.' },
];

export const ImageAiEditModal: React.FC<ImageAiEditModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onApplyImage,
  postId,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '16:9'>('1:1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'original' | 'edited'>('original');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ available: boolean; provider: string; model: string; note: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'original' | 'edited'>('split');

  useEffect(() => {
    if (isOpen) {
      setEditedImage(null);
      setSelectedChoice('original');
      setErrorMessage(null);
      fetchImageAIStatus()
        .then((info) => setProviderInfo(info))
        .catch(() => {});
    }
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  const handleGenerateEdit = async (customPrompt?: string) => {
    const promptToUse = customPrompt !== undefined ? customPrompt : prompt;
    if (!promptToUse.trim()) {
      setErrorMessage('Please type an editing instruction or choose one of the quick presets below.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result: ImageAiEditResult = await editImageWithAI({
        imageUrl,
        prompt: promptToUse.trim(),
        aspectRatio,
        postId,
      });

      if (result.success && result.editedImageUrl) {
        setEditedImage(result.editedImageUrl);
        setSelectedChoice('edited');
        setActiveTab('split');
      } else {
        setErrorMessage(result.error || 'AI image editing could not generate an edited image.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'AI image editing request failed. You can continue using the original image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    const finalUrl = selectedChoice === 'edited' && editedImage ? editedImage : imageUrl;
    onApplyImage(finalUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                AI Image Editor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {providerInfo?.model || 'Gemini Flash Image'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Transform or enhance post imagery with AI guidance while keeping the original safe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Provider Notice */}
          {providerInfo && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                providerInfo.available
                  ? 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-200'
                  : 'bg-amber-950/40 border border-amber-800/40 text-amber-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <span className="font-semibold text-white">Provider: {providerInfo.provider}</span> — {providerInfo.note}
              </div>
            </div>
          )}

          {/* Visual Comparison Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Visual Comparison</span>
                {editedImage && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> AI Edit Generated
                  </span>
                )}
              </div>

              {editedImage && (
                <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setActiveTab('split')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                      activeTab === 'split' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setActiveTab('original')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                      activeTab === 'original' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Original Only
                  </button>
                  <button
                    onClick={() => setActiveTab('edited')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                      activeTab === 'edited' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    AI Edited Only
                  </button>
                </div>
              )}
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Image Card */}
              {(activeTab === 'split' || activeTab === 'original' || !editedImage) && (
                <div
                  onClick={() => setSelectedChoice('original')}
                  className={`relative rounded-xl border p-3 flex flex-col transition-all cursor-pointer group ${
                    selectedChoice === 'original'
                      ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/30'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  } ${activeTab === 'original' ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-400" /> Original Extracted Image
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                        selectedChoice === 'original'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-white/20 text-transparent group-hover:border-white/40'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="relative rounded-lg overflow-hidden bg-black/60 border border-white/5 aspect-video md:aspect-[4/3] flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Original Source Post"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Source post media</span>
                    <span className={selectedChoice === 'original' ? 'text-indigo-400 font-semibold' : ''}>
                      {selectedChoice === 'original' ? 'Selected for Post' : 'Click to select'}
                    </span>
                  </div>
                </div>
              )}

              {/* Edited Image Card / Processing Placeholder */}
              {(activeTab === 'split' || activeTab === 'edited') && (
                <div
                  onClick={() => editedImage && setSelectedChoice('edited')}
                  className={`relative rounded-xl border p-3 flex flex-col transition-all ${
                    editedImage ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    selectedChoice === 'edited' && editedImage
                      ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  } ${activeTab === 'edited' ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Edited Version
                    </span>
                    {editedImage && (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] transition-all ${
                          selectedChoice === 'edited'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-white/20 text-transparent hover:border-white/40'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="relative rounded-lg overflow-hidden bg-black/60 border border-white/5 aspect-video md:aspect-[4/3] flex items-center justify-center">
                    {isProcessing ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-white">Generating AI Edit...</p>
                          <p className="text-[11px] text-zinc-400">Applying prompt with Google GenAI image model</p>
                        </div>
                      </div>
                    ) : editedImage ? (
                      <img
                        src={editedImage}
                        alt="AI Edited Result"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
                        <Layers className="w-8 h-8 opacity-40" />
                        <p className="text-xs">No AI edit generated yet</p>
                        <p className="text-[11px] text-zinc-600">Enter a prompt below and click "Generate AI Edit"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{editedImage ? 'Generated with AI' : 'Pending instruction'}</span>
                    {editedImage && (
                      <span className={selectedChoice === 'edited' ? 'text-emerald-400 font-semibold' : ''}>
                        {selectedChoice === 'edited' ? 'Selected for Post' : 'Click to select'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-rose-300">AI Image Editing Notice</p>
                <p className="text-[11px] text-zinc-300">{errorMessage}</p>
                <p className="text-[11px] text-zinc-400">
                  Your original extracted image remains safely selected and ready to use.
                </p>
              </div>
            </div>
          )}

          {/* Prompt Input Section */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
            <label className="block text-xs font-semibold text-zinc-200">
              Editing Instruction / Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Make the colors cinematic, enhance clarity, add sunset glow..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isProcessing) {
                    e.preventDefault();
                    handleGenerateEdit();
                  }
                }}
              />
              <button
                onClick={() => handleGenerateEdit()}
                disabled={isProcessing || !prompt.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{editedImage ? 'Re-Generate' : 'Generate AI Edit'}</span>
              </button>
            </div>

            {/* Quick Preset Badges */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-zinc-400 font-medium block">Quick Inspiration Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      handleGenerateEdit(preset.prompt);
                    }}
                    disabled={isProcessing}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Current Choice:{' '}
            <span className="font-semibold text-white capitalize">
              {selectedChoice === 'edited' && editedImage ? 'AI Edited Version' : 'Original Extracted Image'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              <span>Use {selectedChoice === 'edited' && editedImage ? 'AI Edited Image' : 'Original Image'} in Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
