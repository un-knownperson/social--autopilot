import React, { useState, useEffect } from 'react';
import { Post, PostCategory } from '../types';
import { postSourceIntake, DuplicatePostError, processPostWithAI } from '../lib/api';
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
} from 'lucide-react';

interface ShareTargetViewProps {
  onNavigateTab: (tab: 'queue' | 'review' | 'dashboard' | 'add-post') => void;
  onRefreshData?: () => Promise<void>;
  initialParams?: {
    title?: string;
    text?: string;
    url?: string;
  };
}

export interface ParsedShareData {
  title: string;
  url: string;
  text: string;
  sourceName: string;
  category: PostCategory;
  notes: string;
}

export function parseIncomingShare(searchParams: URLSearchParams): ParsedShareData {
  const rawTitle = searchParams.get('title') || '';
  const rawText = searchParams.get('text') || '';
  const rawUrl = searchParams.get('url') || '';

  let extractedUrl = rawUrl.trim();
  let extractedText = rawText.trim();
  let extractedTitle = rawTitle.trim();

  // If url is not passed in url param, check if it's embedded within text (common with Android apps like Facebook, Reddit, Twitter)
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
      return parseIncomingShare(params);
    }
    const params = new URLSearchParams(window.location.search);
    return parseIncomingShare(params);
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdPost, setCreatedPost] = useState<Post | null>(null);
  const [existingPost, setExistingPost] = useState<Post | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-ingest if valid share parameters were detected on mount
  useEffect(() => {
    if (shareData.url || shareData.text) {
      handleIngest();
    }
  }, []);

  const handleIngest = async () => {
    if (!shareData.url && !shareData.text) {
      setStatus('idle');
      return;
    }

    try {
      setStatus('submitting');
      setErrorMessage(null);

      const result = await postSourceIntake({
        sourceUrl: shareData.url || undefined,
        sourceText: shareData.text || shareData.url,
        sourceName: shareData.sourceName || 'Mobile Share Target',
        category: shareData.category,
        notes: shareData.notes,
        triggerType: 'SHARE',
        sourceType: 'Public Source',
      });

      if (result.post) {
        setCreatedPost(result.post);
      }
      setStatus('success');
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      if (err instanceof DuplicatePostError && err.existingPost) {
        setExistingPost(err.existingPost);
        setStatus('duplicate');
      } else {
        setErrorMessage(err.message || 'Failed to ingest shared content');
        setStatus('error');
      }
    }
  };

  const handleProcessWithAI = async () => {
    const postToProcess = createdPost || existingPost;
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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-zinc-900/50 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300 shadow-lg shadow-indigo-500/10">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Web Share Target Intake
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold uppercase">
                  PWA Phone Share
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Receiving shared content from Android share sheet, Chrome, or Facebook into the central Content Queue.
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

      {/* Main Share Ingestion Card */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
        {/* Status Alert Banner */}
        {status === 'submitting' && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold">Ingesting shared payload...</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Routing via <code className="bg-black/30 px-1 py-0.5 rounded font-mono">/api/source/intake</code> into Social AutoPilot Queue.
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
                The shared content was verified and added to the Social AutoPilot queue. Post ID: <span className="font-mono text-white">{createdPost?.id}</span>.
              </p>
              {aiSuccessMsg && (
                <p className="text-[11px] text-indigo-300 mt-1 font-medium">
                  ✨ {aiSuccessMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'duplicate' && existingPost && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300">Duplicate Source URL Detected</p>
              <p className="text-[11px] text-zinc-300 mt-1">
                This URL is already present in your Content Queue (<span className="font-mono text-white">{existingPost.id}</span>). Current status: <span className="font-semibold text-white">{existingPost.status}</span>.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('queue')}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-xs font-medium cursor-pointer transition-all"
                >
                  View in Content Queue
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Intake Failed</p>
              <p className="text-[11px] text-zinc-300 mt-1">{errorMessage}</p>
              <button
                onClick={handleIngest}
                className="mt-3 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Ingestion</span>
              </button>
            </div>
          </div>
        )}

        {/* Received Content Details Form */}
        <div className="space-y-4">
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
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shared URL</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={shareData.url}
                onChange={(e) => setShareData({ ...shareData, url: e.target.value })}
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
              <span>Shared Text / Content Snippet</span>
            </label>
            <textarea
              rows={4}
              value={shareData.text}
              onChange={(e) => setShareData({ ...shareData, text: e.target.value })}
              placeholder="Shared text or description from app..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
            />
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
            {status !== 'success' && (
              <button
                onClick={handleIngest}
                disabled={status === 'submitting' || (!shareData.url && !shareData.text)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>Ingest to Content Queue</span>
              </button>
            )}

            {(status === 'success' || status === 'duplicate') && (
              <>
                <button
                  onClick={() => onNavigateTab('queue')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Layers className="w-4 h-4" />
                  <span>Go to Content Queue</span>
                </button>

                {(createdPost || existingPost) && (
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
            <p>In Facebook, Chrome, YouTube, or News apps, tap <strong>Share</strong> on any post or link.</p>
          </div>
          <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
            <span className="font-semibold text-white">3. Pick Social AutoPilot</span>
            <p>Select <strong>"Social AutoPilot"</strong> in the Android Share Sheet. The link is instantly queued for AI rewriting!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
