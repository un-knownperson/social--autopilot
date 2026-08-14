import React from 'react';
import { FacebookConnectionCard } from './FacebookConnectionCard';
import {
  Link2,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  ShieldCheck,
  Zap,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ConnectedAccountsViewProps {
  onStatusChange?: () => void;
}

export const ConnectedAccountsView: React.FC<ConnectedAccountsViewProps> = ({ onStatusChange }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Section Header */}
      <div className="p-6 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-blue-900/30 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Connected Accounts</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                  Active Sync
                </span>
              </h2>
              <p className="text-xs text-zinc-300 mt-1">
                Manage your connected social platforms, Meta Page OAuth authorizations, and automated publishing destinations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Facebook & Meta Integration Card */}
      <FacebookConnectionCard onStatusChange={onStatusChange} />

      {/* Additional Connected Accounts Grid */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Connected Channels & Multi-Platform Network
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Meta Graph API v19.0</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instagram Business */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Instagram className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Instagram Business</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                Via Meta Page
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Cross-post approved AI rewrites to connected Instagram Business accounts linked to your Meta Facebook Page.
            </p>
          </div>

          {/* LinkedIn Page */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Linkedin className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">LinkedIn Company</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-mono">
                Webhook Sync
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Publish structured business news and company updates directly to LinkedIn via source triggers.
            </p>
          </div>

          {/* X / Twitter */}
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
                  <Twitter className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">X / Twitter</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                Trigger Feed
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Automated source feed ingestion and auto-formatting for social broadcasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
