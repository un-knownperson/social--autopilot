import React, { useState } from 'react';
import { TriggerProviderInfo } from '../types';
import {
  Link2,
  FileText,
  Share2,
  Webhook,
  ThumbsUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Code,
  Copy,
  Check,
} from 'lucide-react';

interface SourceTriggersCardProps {
  providers?: TriggerProviderInfo[];
  onOpenShareTarget?: () => void;
}

export const SourceTriggersCard: React.FC<SourceTriggersCardProps> = ({ providers, onOpenShareTarget }) => {
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultProviders: TriggerProviderInfo[] = [
    {
      name: 'Manual URL Trigger',
      type: 'URL',
      status: 'Active',
      description: 'Public post URL submission with instant link analysis and queue routing.',
      note: 'Active and ready for URL-based source post submissions.',
    },
    {
      name: 'Manual Text Trigger',
      type: 'MANUAL',
      status: 'Active',
      description: 'Direct text or article snippet submission via application dashboard or form.',
      note: 'Active and ready for text-based source post submissions.',
    },
    {
      name: 'Share-to-App Trigger (PWA)',
      type: 'SHARE',
      status: 'Active',
      description: 'Android Web Share Target & mobile share sheet integration routing shared URLs/text into /api/source/intake.',
      note: 'Active. Install PWA on Android to share links directly from Facebook, Chrome, or YouTube.',
    },
    {
      name: 'API / Webhook Trigger',
      type: 'WEBHOOK',
      status: 'Not Configured',
      description: 'Automated HTTP POST endpoint with secret header / signature verification architecture.',
      note: 'Not Configured. Add WEBHOOK_SECRET in environment to protect intake endpoint.',
    },
    {
      name: 'Facebook Like Trigger',
      type: 'LIKE',
      status: 'Not Available',
      description: 'Placeholder for official Meta Graph API Like webhook integration.',
      note: 'Facebook Like trigger is not configured. Unsupported by standard Meta Graph API without specialized app review permissions; scraping and browser automation are disabled.',
    },
  ];

  const displayList = providers && providers.length > 0 ? providers : defaultProviders;

  const getIcon = (type: string) => {
    switch (type) {
      case 'URL':
        return <Link2 className="w-4 h-4 text-cyan-400" />;
      case 'MANUAL':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'SHARE':
        return <Share2 className="w-4 h-4 text-purple-400" />;
      case 'WEBHOOK':
        return <Webhook className="w-4 h-4 text-emerald-400" />;
      case 'LIKE':
      default:
        return <ThumbsUp className="w-4 h-4 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'LIKE') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Not Available
        </span>
      );
    }

    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'Ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ready
          </span>
        );
      case 'Not Configured':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Not Configured
          </span>
        );
    }
  };

  const sampleCurl = `curl -X POST https://your-domain.com/api/source/intake \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \\
  -d '{
    "sourceUrl": "https://techcrunch.com/2026/quantum-breakthrough",
    "sourceName": "TechCrunch Share",
    "triggerType": "SHARE",
    "category": "News"
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Source Triggers Architecture</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
              Phase 9
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Decoupled intake system connecting multiple input sources directly to the central AI processor.
          </p>
        </div>

        <button
          onClick={() => setShowDocs(!showDocs)}
          className="text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showDocs ? 'Hide Intake Docs' : 'View Intake API Docs'}</span>
        </button>
      </div>

      {showDocs && (
        <div className="p-4 bg-zinc-950/80 border border-indigo-500/30 rounded-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-indigo-300 border-b border-zinc-800 pb-2">
            <span className="font-bold flex items-center gap-2">
              <Code className="w-4 h-4" /> POST /api/source/intake
            </span>
            <button
              onClick={copyToClipboard}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <pre className="text-emerald-400 overflow-x-auto p-3 bg-black/60 rounded-lg text-[11px] leading-relaxed">
            {sampleCurl}
          </pre>

          <p className="text-zinc-400 text-[11px] font-sans">
            Use this endpoint for mobile share sheets, bookmarklets, or automated webhooks. Incoming content is deduplicated, recorded in <code className="text-amber-300">SourcePost</code> logs, and routed to the AI content engine.
          </p>
        </div>
      )}

      {/* Provider List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayList.map((prov) => (
          <div
            key={prov.type}
            className={`p-4 rounded-xl border backdrop-blur-md flex flex-col justify-between transition-all ${
              prov.type === 'LIKE'
                ? 'bg-rose-500/[0.03] border-rose-500/20'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                    {getIcon(prov.type)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-snug">{prov.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Type: {prov.type}</span>
                  </div>
                </div>
                {getStatusBadge(prov.status, prov.type)}
              </div>

              <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">{prov.description}</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 text-[11px] text-zinc-400 font-sans">
              <span className="italic">{prov.note}</span>
              {prov.type === 'SHARE' && onOpenShareTarget && (
                <button
                  onClick={onOpenShareTarget}
                  className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0"
                >
                  Test Share Target
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
