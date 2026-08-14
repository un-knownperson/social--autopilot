import React, { useState, useEffect } from 'react';
import { Post, PostCategory } from '../types';
import {
  postSourceIntake,
  extractUrlMetadata,
  processPostWithAI,
  updatePost,
  fetchImageAIStatus,
} from '../lib/api';
import { ImageAiEditModal } from './ImageAiEditModal';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  Link2,
  Smartphone,
  Copy,
  Check,
  Layers,
  Wand2,
  ImageIcon,
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

interface ShareTargetViewProps {
  onNavigateTab: (tab: 'queue' | 'review' | 'dashboard' | 'add-post') => void;
  onRefreshData?: () => Promise<void>;
  initialParams?: {
    title?: string;
    text?: string;
    url?: string;
    imageUrl?: string;
  };
}

export interface ParsedShareData {
  title: string;
  url: string;
  text: string;
  imageUrl?: string;
  sourceName: string;
  category: PostCategory;
  notes: string;
}

export function parseIncomingShare(searchParams: URLSearchParams): ParsedShareData {
  const rawTitle = searchParams.get('title') || '';
  const rawText = searchParams.get('text') || '';
  const rawUrl = searchParams.get('url') || '';
  const rawImage = searchParams.get('imageUrl') || searchParams.get('image') || '';

  let extractedUrl = rawUrl.trim();
  let extractedText = rawText.trim();
  let extractedTitle = rawTitle.trim();
  let extractedImageUrl = rawImage.trim() || undefined;

  // Direct image URL in url param?
  if (extractedUrl && /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(extractedUrl)) {
    if (!extractedImageUrl) {
      extractedImageUrl = extractedUrl;
    }
  }

  // If url is not passed in url param, check if it's embedded within text
  if (!extractedUrl && extractedText) {
    const urlMatch = extractedText.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      extractedUrl = urlMatch[0].replace(/[.,;:)]+$/, '');
      const textWithoutUrl = extractedText.replace(urlMatch[0], '').trim();
      if (textWithoutUrl) {
        extractedText = textWithoutUrl;
      }
    }
  }

  // If text is a direct image URL
  if (!extractedImageUrl && extractedText && /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(extractedText)) {
    extractedImageUrl = extractedText;
  }

  // Determine intelligent source name
  let sourceName = extractedTitle;
  if (!sourceName && extractedUrl) {
    try {
      sourceName = new URL(extractedUrl).hostname.replace('www.', '');
    } catch (_) {
      sourceName = 'Mobile Share';
    }
  }
  if (!sourceName) {
    sourceName = 'Android Share-to-App';
  }

  // If text is empty but title is present, use title as text
  if (!extractedText && extractedTitle) {
    extractedText = extractedTitle;
  }

  return {
    title: extractedTitle,
    url: extractedUrl,
    text: extractedText,
    imageUrl: extractedImageUrl,
    sourceName,
    category: 'News',
    notes: 'Ingested via Web Share Target (Android)',
  };
}

export const ShareTargetView: React.FC<ShareTargetViewProps> = ({
  onNavigateTab,
  onRefreshData,
  initialParams,
}) => {
  const [shareData, setShareData] = useState<ParsedShareData>(() => {
    if (initialParams) {
      const params = new URLSearchParams();
      if (initialParams.title) params.set('title', initialParams.title);
      if (initialParams.text) params.set('text', initialParams.text);
      if (initialParams.url) params.set('url', initialParams.url);
      if (initialParams.imageUrl) params.set('imageUrl', initialParams.imageUrl);
      return parseIncomingShare(params);
    }
    const params = new URLSearchParams(window.location.search);
    return parseIncomingShare(params);
  });

  const [status, setStatus] = useState<'idle' | 'extracting' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdPost, setCreatedPost] = useState<Post | null>(null);

  // Non-destructive dual-image state
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [aiEditedImageUrl, setAiEditedImageUrl] = useState<string | null>(null);
  const [selectedImageVersion, setSelectedImageVersion] = useState<'original' | 'ai' | 'none'>('original');
  const [isImageVisible, setIsImageVisible] = useState<boolean>(true);

  // Image editing modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [aiProviderStatus, setAiProviderStatus] = useState<{ available: boolean; provider: string; model: string; note: string } | null>(null);

  // AI text rewrite in progress
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual local image upload support
  const [isUploadingLocalImage, setIsUploadingLocalImage] = useState(false);

  // Load AI provider status
  useEffect(() => {
    fetchImageAIStatus()
      .then((info) => setAiProviderStatus(info))
      .catch(() => {});
  }, []);

  // On mount: if URL or text is present, extract rich metadata/images first, or initialize
  useEffect(() => {
    if (shareData.imageUrl) {
      setOriginalImageUrl(shareData.imageUrl);
      setSelectedImageVersion('original');
    }

    if (shareData.url && !shareData.imageUrl) {
      handleAutoExtract(shareData.url);
    }
  }, []);

  const handleAutoExtract = async (urlToExtract: string) => {
    try {
      setStatus('extracting');
      setStatusMessage('Extracting post text, Open Graph tags, and media...');
      const meta = await extractUrlMetadata(urlToExtract);

      if (meta.success) {
        if (meta.imageUrl) {
          setOriginalImageUrl(meta.imageUrl);
          setSelectedImageVersion('original');
        }
        setShareData((prev) => ({
          ...prev,
          text: prev.text || meta.text || meta.title || prev.text,
          sourceName: prev.sourceName === 'Android Share-to-App' && meta.sourceName ? meta.sourceName : prev.sourceName,
          title: prev.title || meta.title || prev.title,
        }));
      }
    } catch (err) {
      console.warn('Metadata extraction non-fatal warning:', err);
    } finally {
      setStatus('idle');
      setStatusMessage(null);
    }
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    setIsUploadingLocalImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setOriginalImageUrl(dataUri);
      setSelectedImageVersion('original');
      setIsImageVisible(true);
      setIsUploadingLocalImage(false);
    };
    reader.onerror = () => {
      alert('Failed to read image file.');
      setIsUploadingLocalImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Determine active effective image based on user choice & visibility toggle
  const getEffectiveImageUrl = (): string | undefined => {
    if (!isImageVisible) return undefined;
    if (selectedImageVersion === 'ai' && aiEditedImageUrl) return aiEditedImageUrl;
    if (selectedImageVersion === 'original' && originalImageUrl) return originalImageUrl;
    return originalImageUrl || undefined;
  };

  const handleIngestToQueue = async () => {
    if (!shareData.url && !shareData.text && !originalImageUrl) {
      setErrorMessage('Please provide a source URL, post text, or image to continue.');
      return;
    }

    try {
      setStatus('submitting');
      setErrorMessage(null);
      setStatusMessage('Ingesting content into Social AutoPilot queue...');

      const effectiveImage = getEffectiveImageUrl();

      const result = await postSourceIntake({
        sourceUrl: shareData.url || undefined,
        sourceText: shareData.text || shareData.url || (effectiveImage ? '[Shared Image Content]' : 'Mobile Share Item'),
        sourceName: shareData.sourceName || 'Mobile Share Target',
        category: shareData.category,
        notes: shareData.notes,
        imageUrl: effectiveImage,
        triggerType: 'SHARE',
        sourceType: 'Public Source',
      });

      if (result.post) {
        setCreatedPost(result.post);
      }
      setStatus('success');
      setStatusMessage(null);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to ingest shared content');
      setStatus('error');
      setStatusMessage(null);
    }
  };

  const handleProcessWithAI = async () => {
    const postToProcess = createdPost;
    if (!postToProcess) return;

    try {
      setAiProcessing(true);
      setAiSuccessMsg(null);
      const res = await processPostWithAI(postToProcess.id, postToProcess);
      setCreatedPost(res.post);
      setAiSuccessMsg('AI rewrite and analysis completed successfully!');
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      alert(`AI Processing notice: ${err.message}`);
    } finally {
      setAiProcessing(false);
    }
  };

  const copyShareLink = () => {
    if (shareData.url) {
      navigator.clipboard.writeText(shareData.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-zinc-900/50 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300 shadow-lg shadow-indigo-500/10">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Mobile Content Transformation
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold uppercase">
                  PWA Share Target
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Receive shared posts from Facebook or mobile apps, extract text & media, transform images with AI, and continue your posting workflow.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('queue')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>View Content Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Share Ingestion & Transformation Card */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
        {/* Status Alerts */}
        {(status === 'submitting' || status === 'extracting') && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold">{statusMessage || 'Processing shared content...'}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Validating and routing into Social AutoPilot Content Pipeline.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-300 text-sm">Successfully Ingested to Content Queue!</p>
              <p className="text-[11px] text-zinc-300 mt-1">
                Post ID: <span className="font-mono text-white">{createdPost?.id}</span> — Ingested with verified media, original preservation, and non-destructive workflow.
              </p>
              {aiSuccessMsg && (
                <p className="text-[11px] text-indigo-300 mt-1 font-medium">
                  ✨ {aiSuccessMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Intake Notice</p>
              <p className="text-[11px] text-zinc-300 mt-1">{errorMessage}</p>
              <button
                onClick={handleIngestToQueue}
                className="mt-3 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Submission</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Details */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Received Share Payload</span>
            </h3>
            {shareData.url && (
              <button
                onClick={copyShareLink}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
              </button>
            )}
          </div>

          {/* Source URL Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shared Post / Web URL</span>
              </span>
              {shareData.url && (
                <button
                  type="button"
                  onClick={() => handleAutoExtract(shareData.url)}
                  disabled={status === 'extracting'}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${status === 'extracting' ? 'animate-spin' : ''}`} />
                  <span>Re-extract Media & Text</span>
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="url"
                value={shareData.url}
                onChange={(e) => {
                  const val = e.target.value;
                  setShareData({ ...shareData, url: val });
                }}
                placeholder="https://facebook.com/..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
              {shareData.url && (
                <a
                  href={shareData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-indigo-400"
                  title="Open source link in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Source Text / Content Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Extracted Post Text / Caption</span>
            </label>
            <textarea
              rows={3}
              value={shareData.text}
              onChange={(e) => setShareData({ ...shareData, text: e.target.value })}
              placeholder="Shared text or description from app..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 leading-relaxed"
            />
          </div>

          {/* Media & AI Image Transformation Section */}
          <div className="p-4 bg-black/30 border border-white/10 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Post Media & AI Transformation</span>
                {originalImageUrl && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Non-Destructive
                  </span>
                )}
              </div>

              {originalImageUrl && (
                <button
                  type="button"
                  onClick={() => setIsImageVisible(!isImageVisible)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {isImageVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isImageVisible ? 'Hide Image in Post' : 'Include Image in Post'}</span>
                </button>
              )}
            </div>

            {/* If no image found yet */}
            {!originalImageUrl ? (
              <div className="p-5 border border-dashed border-white/10 rounded-xl text-center space-y-3">
                <p className="text-xs text-zinc-400">
                  No image detected yet from the shared link or parameters.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Image from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Preview Grid: Original vs AI Transformed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Original Card */}
                  <div
                    onClick={() => {
                      setSelectedImageVersion('original');
                      setIsImageVisible(true);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedImageVersion === 'original' && isImageVisible
                        ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                        <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-zinc-400" /> Original Source Image
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                            selectedImageVersion === 'original' && isImageVisible
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="relative rounded-lg overflow-hidden bg-black/60 aspect-video flex items-center justify-center border border-white/5">
                        <img
                          src={originalImageUrl}
                          alt="Original Source Post"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Source post media (Safe)</span>
                      <span className={selectedImageVersion === 'original' && isImageVisible ? 'text-indigo-400 font-bold' : ''}>
                        {selectedImageVersion === 'original' && isImageVisible ? 'Selected for Post' : 'Click to select'}
                      </span>
                    </div>
                  </div>

                  {/* AI Transformed Card */}
                  <div
                    onClick={() => {
                      if (aiEditedImageUrl) {
                        setSelectedImageVersion('ai');
                        setIsImageVisible(true);
                      } else {
                        setIsEditModalOpen(true);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedImageVersion === 'ai' && isImageVisible
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                        <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" /> AI Transformed Version
                        </span>
                        {aiEditedImageUrl && (
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                              selectedImageVersion === 'ai' && isImageVisible
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'border-white/20 text-transparent'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      <div className="relative rounded-lg overflow-hidden bg-black/60 aspect-video flex items-center justify-center border border-white/5">
                        {aiEditedImageUrl ? (
                          <img
                            src={aiEditedImageUrl}
                            alt="AI Transformed Result"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="p-4 text-center text-zinc-500 space-y-1">
                            <Wand2 className="w-6 h-6 mx-auto opacity-40 text-indigo-400" />
                            <p className="text-[11px] text-zinc-300 font-medium">Ready to Transform</p>
                            <p className="text-[10px] text-zinc-500">Tap below to apply AI visual styling</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{aiEditedImageUrl ? 'AI Generated' : 'Optional step'}</span>
                      <span className={selectedImageVersion === 'ai' && isImageVisible ? 'text-emerald-400 font-bold' : 'text-indigo-400'}>
                        {aiEditedImageUrl ? (selectedImageVersion === 'ai' && isImageVisible ? 'Selected for Post' : 'Click to select') : 'Transform with AI →'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transform Action Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{aiEditedImageUrl ? 'Re-Transform Image with AI' : 'Transform Image with AI'}</span>
                  </button>

                  <div className="text-[11px] text-zinc-400">
                    Active media: <span className="font-semibold text-white capitalize">
                      {!isImageVisible
                        ? 'No Image (Hidden)'
                        : selectedImageVersion === 'ai' && aiEditedImageUrl
                        ? 'AI Transformed Image'
                        : 'Original Source Image'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Source Name and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Source Name / Origin
              </label>
              <input
                type="text"
                value={shareData.sourceName}
                onChange={(e) => setShareData({ ...shareData, sourceName: e.target.value })}
                placeholder="e.g. Facebook Mobile, Chrome Share"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Category
              </label>
              <select
                value={shareData.category}
                onChange={(e) => setShareData({ ...shareData, category: e.target.value as PostCategory })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="News">News</option>
                <option value="Fact">Fact</option>
                <option value="Funny">Funny</option>
                <option value="Opinion">Opinion</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleIngestToQueue}
              disabled={status === 'submitting' || status === 'extracting'}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span>{status === 'success' ? 'Ingest Again (New Entry)' : 'Add to Content Queue'}</span>
            </button>

            {status === 'success' && (
              <>
                <button
                  onClick={() => onNavigateTab('queue')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Layers className="w-4 h-4" />
                  <span>Go to Content Queue</span>
                </button>

                {createdPost && (
                  <button
                    onClick={handleProcessWithAI}
                    disabled={aiProcessing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    {aiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Process with AI</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigateTab('review')}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  Go to Review
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('add-post')}
            className="text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            Manual Add Form
          </button>
        </div>

        {/* Policy & Workflow Notice */}
        <div className="pt-3 border-t border-white/5 flex items-start gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
          <p>
            <strong>Workflow Notice:</strong> AI image transformation is provided as a content-creation and stylistic enhancement tool. Transforming an image does not alter underlying copyright ownership or guarantee platform acceptance. The original image remains preserved.
          </p>
        </div>
      </div>

      {/* Android Share Sheet Guide Card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <span>How to use Phone Share Target on Android</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400">
          <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-white">1. Install PWA</span>
            <p>Open Social AutoPilot in Chrome on Android &gt; tap three dots menu &gt; tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-white">2. Tap Share in Any App</span>
            <p>In Facebook, Chrome, YouTube, or News apps, tap <strong>Share</strong> on any post, text, or link.</p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-white">3. Pick Social AutoPilot</span>
            <p>Select <strong>"Social AutoPilot"</strong> in Android Share Sheet. The text &amp; media are loaded with optional AI transformation!</p>
          </div>
        </div>
      </div>

      {/* AI Image Edit Modal */}
      {originalImageUrl && (
        <ImageAiEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          imageUrl={originalImageUrl}
          onApplyImage={(chosenUrl) => {
            if (chosenUrl !== originalImageUrl) {
              setAiEditedImageUrl(chosenUrl);
              setSelectedImageVersion('ai');
            } else {
              setSelectedImageVersion('original');
            }
            setIsImageVisible(true);
          }}
        />
      )}
    </div>
  );
};
