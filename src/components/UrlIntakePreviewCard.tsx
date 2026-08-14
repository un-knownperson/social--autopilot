import React, { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Sparkles,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  FileText,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Tag,
  Globe,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { extractUrlPreview, ExtractedUrlPreview } from '../lib/api';
import { PostCategory } from '../types';
import { ImageAiEditModal } from './ImageAiEditModal';

interface UrlIntakePreviewCardProps {
  onAddPost: (postData: {
    sourceUrl: string;
    originalText: string;
    sourceName: string;
    category: PostCategory;
    notes?: string;
    imageUrl?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
}

export const UrlIntakePreviewCard: React.FC<UrlIntakePreviewCardProps> = ({
  onAddPost,
  isSubmitting,
  successMessage,
  errorMessage,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedUrlPreview | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Editable fields populated from extraction
  const [postText, setPostText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [category, setCategory] = useState<PostCategory>('News');
  const [notes, setNotes] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(undefined);
  const [cachedImageUrl, setCachedImageUrl] = useState<string | undefined>(undefined);
  const [includeImage, setIncludeImage] = useState<boolean>(true);
  const [isImageAiEdited, setIsImageAiEdited] = useState(false);

  // AI Edit Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performExtraction = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const data = await extractUrlPreview(trimmed);
      setExtractedData(data);

      // Populate text from extracted title & description if not already manually typed
      const combinedText = [data.title, data.description].filter(Boolean).join('\n\n');
      setPostText((prev) => (prev.trim() ? prev : combinedText || trimmed));
      setSourceName((prev) => (prev.trim() ? prev : data.sourceName || 'Web Source'));

      if (data.imageUrl) {
        setSelectedImageUrl(data.imageUrl);
        setCachedImageUrl(data.imageUrl);
        setIncludeImage(true);
        setIsImageAiEdited(false);
      }
    } catch (err: any) {
      console.warn('URL extraction error:', err);
      setExtractError(err.message || 'Could not extract metadata from URL. You can still enter details manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrlInput(newUrl);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newUrl.trim().startsWith('http')) {
      debounceTimerRef.current = setTimeout(() => {
        performExtraction(newUrl);
      }, 750);
    }
  };

  const handleManualExtract = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      performExtraction(urlInput);
    }
  };

  const handleApplyAiImage = (chosenImageUrl: string) => {
    setSelectedImageUrl(chosenImageUrl);
    setCachedImageUrl(chosenImageUrl);
    setIncludeImage(true);
    setIsImageAiEdited(chosenImageUrl !== extractedData?.imageUrl);
  };

  const handleToggleIncludeImage = () => {
    if (includeImage) {
      // Toggle OFF: hide image but keep in cache for quick restoration
      if (selectedImageUrl) {
        setCachedImageUrl(selectedImageUrl);
      }
      setIncludeImage(false);
    } else {
      // Toggle ON: restore from cache or extracted data
      const restoreUrl = cachedImageUrl || extractedData?.imageUrl;
      if (restoreUrl) {
        setSelectedImageUrl(restoreUrl);
      }
      setIncludeImage(true);
    }
  };

  const handleRestoreOriginalImage = () => {
    if (extractedData?.imageUrl) {
      setSelectedImageUrl(extractedData.imageUrl);
      setCachedImageUrl(extractedData.imageUrl);
      setIncludeImage(true);
      setIsImageAiEdited(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !urlInput.trim()) return;

    const finalImageUrl = includeImage && selectedImageUrl ? selectedImageUrl : undefined;

    await onAddPost({
      sourceUrl: urlInput.trim(),
      originalText: postText.trim() || urlInput.trim(),
      sourceName: sourceName.trim() || 'URL Post',
      category,
      notes: notes.trim() || undefined,
      imageUrl: finalImageUrl,
    });

    // Reset after success
    setUrlInput('');
    setPostText('');
    setSourceName('');
    setNotes('');
    setSelectedImageUrl(undefined);
    setCachedImageUrl(undefined);
    setExtractedData(null);
    setIncludeImage(true);
    setIsImageAiEdited(false);
  };

  const activeImageUrl = selectedImageUrl || cachedImageUrl || extractedData?.imageUrl;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Post URL Ingestion & AI Image Workflow
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Paste any post URL to extract both written text and associated imagery together in a single preview.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Multimodal Extraction + AI Image Editing</span>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: URL Input Bar */}
      <form onSubmit={handleManualExtract} className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-200">
          Paste Post or Article URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="https://news.ycombinator.com, https://techcrunch.com/article, or any social post URL..."
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isExtracting || !urlInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-indigo-600/20"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{isExtracting ? 'Extracting...' : 'Extract Content & Media'}</span>
          </button>
        </div>

        {extractError && (
          <p className="text-[11px] text-amber-300 flex items-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {extractError}
          </p>
        )}
      </form>

      {/* Step 2: Unified Preview Container (Text + Image Shown Together) */}
      {(urlInput.trim() || postText.trim() || activeImageUrl || isExtracting) && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Extracted Post Preview (Text & Image)
            </h3>
            {isExtracting && (
              <span className="text-[11px] text-indigo-400 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching og:image & content...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5">
            {/* Left/Top: Extracted Main Image Section (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  Main Post Image
                </span>

                {/* Image Toggle Switch */}
                {activeImageUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {includeImage ? 'Included' : 'Hidden'}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleIncludeImage}
                      role="switch"
                      aria-checked={includeImage}
                      title={includeImage ? 'Click to hide image from post' : 'Click to restore image to post'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        includeImage ? 'bg-indigo-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          includeImage ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Image Container */}
              {includeImage && selectedImageUrl ? (
                <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 group flex-1 min-h-[200px] flex items-center justify-center">
                  <img
                    src={selectedImageUrl}
                    alt="Extracted Main Post Media"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover max-h-[260px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Overlay Quick AI Edit Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xl cursor-pointer transform hover:scale-105 transition-all"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>AI Edit Image</span>
                    </button>
                  </div>
                </div>
              ) : !includeImage && activeImageUrl ? (
                /* Hidden State Card */
                <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 p-5 flex flex-col items-center justify-center text-center space-y-2.5 flex-1 min-h-[190px]">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-200">Image Excluded from Post</p>
                    <p className="text-[11px] text-zinc-400 max-w-xs mt-0.5">
                      This post will be submitted as text-only. You can restore the extracted image at any time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleIncludeImage}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Restore Extracted Image</span>
                  </button>
                </div>
              ) : (
                /* Empty / No Image Detected State */
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 flex flex-col items-center justify-center text-center space-y-2 flex-1 min-h-[180px]">
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                  <p className="text-xs text-zinc-400">No image detected from URL</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs">
                    You can paste an image URL directly or proceed with text-only.
                  </p>
                </div>
              )}

              {/* Action Buttons for Image */}
              {includeImage && selectedImageUrl ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex-1 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI Edit Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleIncludeImage}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-amber-300 border border-white/10 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    title="Hide image from this post"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="Or paste direct image URL here..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          setSelectedImageUrl(val.trim());
                          setCachedImageUrl(val.trim());
                          setIncludeImage(true);
                        }
                      }
                    }}
                  />
                  {extractedData?.imageUrl && selectedImageUrl !== extractedData.imageUrl && (
                    <button
                      type="button"
                      onClick={handleRestoreOriginalImage}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Restore original extracted image"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Original</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right/Bottom: Extracted Text & Post Meta (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Written Post Text / Caption
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {postText.length} characters
                </span>
              </div>

              <textarea
                rows={5}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Extracted post caption, article body, or written text..."
                className="w-full flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Source Attribution Name
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g. TechCrunch, BBC"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Content Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PostCategory)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="News">News</option>
                    <option value="Fact">Fact</option>
                    <option value="Funny">Funny</option>
                    <option value="Opinion">Opinion</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Optional Internal Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Focus on headline rewrite for Facebook..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Submit Post Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-400">
              Workflow Status:{' '}
              <span className="font-semibold text-white">
                {includeImage && selectedImageUrl
                  ? isImageAiEdited
                    ? 'Text & AI Edited Image Ready'
                    : 'Text & Extracted Image Ready'
                  : 'Text Only (Image Excluded)'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitPost}
              disabled={isSubmitting || (!postText.trim() && !urlInput.trim())}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Add to Content Queue & Continue Workflow</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Edit Image Modal */}
      {selectedImageUrl && (
        <ImageAiEditModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          imageUrl={selectedImageUrl}
          onApplyImage={handleApplyAiImage}
        />
      )}
    </div>
  );
};

