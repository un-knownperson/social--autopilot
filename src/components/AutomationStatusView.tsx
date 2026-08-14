import React, { useState, useEffect } from 'react';
import { AutomationStatus } from '../types';
import { fetchStatus, fetchFacebookStatus } from '../lib/api';
import { SourceTriggersCard } from './SourceTriggersCard';
import {
  Facebook,
  Sparkles,
  Zap,
  Clock,
  Radio,
  Layers,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface AutomationStatusViewProps {
  status?: AutomationStatus | null;
}

const PHASES = [
  {
    phase: 'PHASE 1',
    title: 'Core Application & Content Queue Foundation',
    status: 'COMPLETED & ACTIVE',
    color: 'border-emerald-500 text-emerald-400 bg-emerald-950/40',
    desc: 'Full-stack React + Express architecture, REST APIs, manual source entry, queue data store, review workflow, and settings configuration.',
  },
  {
    phase: 'PHASE 2',
    title: 'OpenRouter AI Content Rewriting & Classification',
    status: 'COMPLETED & ACTIVE',
    color: 'border-indigo-500 text-indigo-300 bg-indigo-950/50',
    desc: 'Server-side integration with OpenRouter API (openrouter/free) to analyze posts, rewrite into target brand styles (e.g. Natural Roman Urdu), detect categories, and extract key facts.',
  },
  {
    phase: 'PHASE 3',
    title: 'Facebook Page OAuth & Meta Graph API Integration',
    status: 'COMPLETED & ACTIVE',
    color: 'border-blue-500 text-blue-300 bg-blue-950/50',
    desc: 'Secure server-side OAuth flow for Meta Graph API access tokens, Facebook Page selection, and permissions handshake.',
  },
  {
    phase: 'PHASE 4',
    title: 'Facebook Page Direct Publishing Engine',
    status: 'COMPLETED & ACTIVE',
    color: 'border-emerald-500 text-emerald-300 bg-emerald-950/50',
    desc: 'Server-side API handlers and UI modal to publish approved queued posts directly to connected Facebook Pages with delivery verification, ID tracking, and error handling.',
  },
  {
    phase: 'PHASE 5',
    title: 'Content Review & Quality Guardrails Workflow',
    status: 'COMPLETED & ACTIVE',
    color: 'border-purple-500 text-purple-300 bg-purple-950/50',
    desc: 'Interactive modal post editing, duplicate source prevention, instant status reset on post edits, and Facebook card rendering preview.',
  },
  {
    phase: 'PHASE 6',
    title: 'Netlify Serverless Architecture & Deployment Readiness',
    status: 'COMPLETED & ACTIVE',
    color: 'border-cyan-500 text-cyan-300 bg-cyan-950/50',
    desc: 'Netlify Functions architecture, netlify.toml configuration, server-side secret environment variable validation, and deployment readiness panel.',
  },
  {
    phase: 'PHASE 9 (CURRENT)',
    title: 'Flexible Source Trigger Architecture & Intake System',
    status: 'ACTIVE & DEPLOYED',
    color: 'border-emerald-500 text-emerald-300 bg-emerald-950/50',
    desc: 'Decoupled TriggerProvider architecture supporting Manual URL, Manual Text, Share-to-App /api/source/intake, Webhook validation, and Facebook Like placeholder notice.',
  },
];

export const AutomationStatusView: React.FC<AutomationStatusViewProps> = ({ status: initialStatus }) => {
  const [status, setStatus] = useState<AutomationStatus | null>(initialStatus || null);
  const [loading, setLoading] = useState<boolean>(!initialStatus);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadLiveStatus = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [res, fbRes] = await Promise.all([
        fetchStatus().catch(() => null),
        fetchFacebookStatus().catch(() => null),
      ]);

      const baseStatus: AutomationStatus = res?.status || {
        facebookConnection: 'Not Connected',
        geminiAI: 'Not Configured',
        publishingAutomation: 'Not Configured',
        scheduledAutomation: 'Not Configured',
      };

      if (fbRes) {
        const hasFbAccount = Boolean(fbRes.connected);
        const hasSelectedPage = Boolean(fbRes.selectedPage?.id);

        baseStatus.facebookConnection = hasFbAccount && hasSelectedPage
          ? 'Connected'
          : hasFbAccount
          ? 'Page Not Selected'
          : 'Not Connected';

        const canPublish = Boolean(hasFbAccount && hasSelectedPage);
        baseStatus.publishingAutomation = canPublish ? 'Active' : 'Not Configured';
      }

      setStatus(baseStatus);
    } catch (err) {
      console.error('Error fetching live automation status:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
    }
    loadLiveStatus();
  }, [initialStatus]);

  const fbStatus = status?.facebookConnection || 'Not Connected';
  const geminiStatus = status?.geminiAI || 'Not Connected';
  const pubStatus = status?.publishingAutomation || 'Not Configured';
  const schedStatus = status?.scheduledAutomation || 'Not Configured';

  const isFbConnected = fbStatus === 'Connected';
  const isFbPageMissing = fbStatus === 'Page Not Selected';
  const isGeminiConnected = geminiStatus === 'Connected';
  const isPubActive = pubStatus === 'Active';
  const isSchedActive = schedStatus === 'Active';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 backdrop-blur-md">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">System Integration Status</h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Live real-time status of server-side integration bridges and automation components.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLiveStatus(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
          </button>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl text-xs font-mono text-emerald-300 backdrop-blur-md">
            <Facebook className="w-4 h-4 text-emerald-400" />
            <span>Phase 6 Active — Live Server Pipeline</span>
          </div>
        </div>
      </div>

      {/* Connection Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Facebook Connection */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <Facebook className={`w-5 h-5 ${isFbConnected ? 'text-emerald-400' : isFbPageMissing ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400">
              Phase 3
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Facebook Connection</span>
            <div className={`text-sm font-bold mt-1 flex items-center gap-2 ${isFbConnected ? 'text-emerald-300' : isFbPageMissing ? 'text-amber-300' : 'text-zinc-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isFbConnected ? 'bg-emerald-400 animate-pulse' : isFbPageMissing ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span>{fbStatus}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 pt-2 border-t border-white/10">
            {isFbConnected
              ? 'Meta OAuth active & Facebook Page connected.'
              : isFbPageMissing
              ? 'Facebook account connected. Select a destination Page.'
              : 'Connect Facebook account in Connected Accounts.'}
          </p>
        </div>

        {/* OpenRouter AI Engine */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <Sparkles className={`w-5 h-5 ${isGeminiConnected ? 'text-indigo-400' : 'text-amber-400'}`} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Phase 2
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">OpenRouter AI Engine</span>
            <div className={`text-sm font-bold mt-1 flex items-center gap-2 ${isGeminiConnected ? 'text-indigo-300' : 'text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isGeminiConnected ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{geminiStatus}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 pt-2 border-t border-white/10">
            {isGeminiConnected
              ? 'OpenRouter (openrouter/free) active & ready for rewrites.'
              : 'Add OPENROUTER_API_KEY to deployment environment.'}
          </p>
        </div>

        {/* Publishing Automation */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <Zap className={`w-5 h-5 ${isPubActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400">
              Phase 4
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Publishing Automation</span>
            <div className={`text-sm font-bold mt-1 flex items-center gap-2 ${isPubActive ? 'text-emerald-300' : 'text-zinc-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isPubActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span>{pubStatus}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 pt-2 border-t border-white/10">
            {isPubActive
              ? 'Direct Facebook Page publishing active & ready.'
              : 'Select a destination Facebook Page to enable publishing.'}
          </p>
        </div>

        {/* Scheduled Automation */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <Clock className={`w-5 h-5 ${isSchedActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400">
              Phase 5
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Scheduled Automation</span>
            <div className={`text-sm font-bold mt-1 flex items-center gap-2 ${isSchedActive ? 'text-cyan-300' : 'text-zinc-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isSchedActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span>{schedStatus}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-300 pt-2 border-t border-white/10">
            {isSchedActive
              ? 'Scheduled source intake trigger is active & configured.'
              : 'Configure scheduled source intake in Source Settings.'}
          </p>
        </div>
      </div>

      {/* Phase 9 Trigger Providers Overview */}
      <SourceTriggersCard />

      {/* Multi-Phase System Roadmap */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Application Architectural Roadmap</h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">Phases 1 — 9</span>
        </div>

        <div className="space-y-3">
          {PHASES.map((p, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all backdrop-blur-md ${
                p.phase.includes('CURRENT')
                  ? 'bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-purple-500/10 border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-indigo-300">
                  {p.phase}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${p.color}`}
                >
                  {p.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">{p.title}</h4>
              <p className="text-zinc-300 leading-relaxed text-[11px]">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Guardrail Guarantee */}
      <div className="p-4 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl flex items-center gap-3 text-xs text-zinc-300 shadow-xl">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
        <div>
          <strong className="text-white">Security & Architecture Guarantee:</strong> All Facebook access tokens and API secrets remain strictly server-side in Node.js environment variables. Client-side code never exposes secrets or credentials.
        </div>
      </div>
    </div>
  );
};
