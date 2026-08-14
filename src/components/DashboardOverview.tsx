import React, { useState, useEffect } from 'react';
import { Post, DashboardStats, ActivityLog, FacebookStatus } from '../types';
import { fetchFacebookStatus } from '../lib/api';
import { SourceTriggersCard } from './SourceTriggersCard';
import { TriggerActivityCard } from './TriggerActivityCard';
import {
  FileText,
  Clock,
  CheckCircle2,
  Activity,
  ArrowRight,
  ExternalLink,
  Plus,
  Tag,
  ShieldAlert,
  AlertCircle,
  Eye,
  Facebook,
  XCircle,
  Layers,
  Building,
} from 'lucide-react';

interface DashboardOverviewProps {
  stats: DashboardStats & { recentActivities: ActivityLog[] };
  onNavigateTab: (tab: 'add-post' | 'queue' | 'review' | 'status' | 'settings' | 'connected-accounts') => void;
  onSelectPost: (post: Post) => void;
  onOpenQuickAdd?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  onNavigateTab,
  onSelectPost,
  onOpenQuickAdd,
}) => {
  const {
    totalProcessed,
    waitingForApproval,
    published,
    totalApproved = 0,
    publishedToFacebook = 0,
    failedPublications = 0,
    lastProcessedPost,
    recentActivities,
    triggerProviders,
    triggerLogs,
  } = stats;

  const [fbStatus, setFbStatus] = useState<FacebookStatus | null>(null);

  useEffect(() => {
    fetchFacebookStatus()
      .then((res) => setFbStatus(res))
      .catch((err) => console.warn('Dashboard FB status check:', err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-5 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-blue-600/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-indigo-500/10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 mt-0.5 sm:mt-0 backdrop-blur-md">
            <Facebook className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>One-Click Source Post Workflow</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">Active</span>
            </h3>
            <p className="text-xs text-zinc-300 mt-0.5">
              Input public post URL → Paste text → AI creates original rewrite → Route directly to Review.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenQuickAdd || (() => onNavigateTab('add-post'))}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 border border-indigo-400/30 cursor-pointer backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Source Post</span>
          </button>

          <button
            onClick={() => onNavigateTab('settings')}
            className="text-xs font-medium text-blue-200 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer backdrop-blur-md"
          >
            <span>Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Requirement: Facebook Dashboard Overview Box */}
      <div className="p-5 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Facebook Page Integration
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('connected-accounts')}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
          >
            Manage Connected Accounts
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Facebook Connection */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Facebook Account</span>
            <div className="mt-1 flex items-center gap-1.5">
              {fbStatus?.connected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold truncate">
                    {fbStatus.user?.name || 'Connected'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300 font-semibold">Not Connected</span>
                </>
              )}
            </div>
          </div>

          {/* Selected Page */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Target Page</span>
            <div className="mt-1 flex items-center gap-1.5 truncate">
              <Building className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-white font-semibold truncate">
                {fbStatus?.selectedPage?.name || 'None Selected'}
              </span>
            </div>
          </div>

          {/* Publishing */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Publishing Engine</span>
            <div className="mt-1 flex items-center gap-1.5">
              {fbStatus?.selectedPage ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-blue-300 font-semibold">Ready (Manual Click)</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-semibold">Page Connection Required</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Sources */}
        <div className="p-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Sources</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white tracking-tight">{totalProcessed}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Sources queued</p>
          </div>
        </div>

        {/* Card 2: Ready for Review */}
        <div className="p-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Ready for Review</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-cyan-300 tracking-tight">{waitingForApproval}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Pending approval</p>
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="p-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Approved Posts</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">{totalApproved}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Ready to publish</p>
          </div>
        </div>

        {/* Card 4: Published */}
        <div className="p-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Published FB</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <Facebook className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-blue-400 tracking-tight">{publishedToFacebook}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Live Page broadcasts</p>
          </div>
        </div>

        {/* Card 5: Failed */}
        <div className="p-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Failed</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-rose-400 tracking-tight">{failedPublications}</span>
            <p className="text-[11px] text-zinc-400 mt-1">Publish errors</p>
          </div>
        </div>
      </div>

      {/* Phase 9: Source Triggers Panel */}
      <SourceTriggersCard providers={triggerProviders} />

      {/* Main Section: Last Processed Post & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last Processed Post (2 columns) */}
        <div className="lg:col-span-2 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Last Processed Post</h3>
              </div>
              {lastProcessedPost && (
                <button
                  onClick={() => onSelectPost(lastProcessedPost)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Details</span>
                </button>
              )}
            </div>

            {lastProcessedPost ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 font-mono text-[11px]">
                    {lastProcessedPost.sourceName || 'Source'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {lastProcessedPost.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      lastProcessedPost.status === 'Approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : lastProcessedPost.status === 'Published'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : lastProcessedPost.status === 'Failed'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Status: {lastProcessedPost.status}
                  </span>
                </div>

                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl backdrop-blur-md space-y-3">
                  {lastProcessedPost.imageUrl && (
                    <div className="rounded-lg overflow-hidden border border-white/10 max-h-40 bg-black/40">
                      <img
                        src={lastProcessedPost.imageUrl}
                        alt="Source Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="text-sm text-zinc-200 line-clamp-3 leading-relaxed">
                    "{lastProcessedPost.originalText}"
                  </p>
                </div>

                {lastProcessedPost.sourceUrl && (
                  <a
                    href={lastProcessedPost.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-400 truncate max-w-full transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lastProcessedPost.sourceUrl}</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-zinc-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="text-sm text-zinc-400">No posts processed yet.</p>
                <button
                  onClick={() => onNavigateTab('add-post')}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Click here to add your first post source
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Timestamp: {lastProcessedPost ? new Date(lastProcessedPost.createdAt).toLocaleString() : 'N/A'}
            </span>
            <button
              onClick={() => onNavigateTab('queue')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-semibold text-white pb-3 border-b border-white/10">
              Quick Controls
            </h3>
            <div className="mt-4 space-y-2.5">
              <button
                onClick={onOpenQuickAdd || (() => onNavigateTab('add-post'))}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 text-xs text-zinc-200 transition-all group cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">+ Add Source Post</div>
                    <div className="text-[11px] text-zinc-400">One-click link & text AI processing</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab('queue')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-xs text-zinc-200 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Manage Queue ({waitingForApproval})</div>
                    <div className="text-[11px] text-zinc-400">Approve or edit posts</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab('status')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-xs text-zinc-200 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Integration Status</div>
                    <div className="text-[11px] text-zinc-400">Check Phase 1–7 status</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-zinc-500 text-center">
            Social AutoPilot • Phase 1 Core Architecture
          </div>
        </div>
      </div>

      {/* Phase 9: Trigger Activity Log */}
      <TriggerActivityCard logs={triggerLogs} />

      {/* Recent Activity Log */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Recent System Activity</h3>
          <span className="text-xs text-zinc-400 font-mono">Last 10 events</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between text-xs py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      act.type === 'post_added'
                        ? 'bg-indigo-400'
                        : act.type === 'status_changed'
                        ? 'bg-emerald-400'
                        : act.type === 'post_deleted'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-zinc-200 font-medium">{act.description}</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap ml-4">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 text-center py-4">No recent activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};
