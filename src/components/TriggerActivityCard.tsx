import React from 'react';
import { TriggerActivityLog } from '../types';
import { Radio, CheckCircle2, AlertCircle, RefreshCw, Copy, Layers } from 'lucide-react';

interface TriggerActivityCardProps {
  logs?: TriggerActivityLog[];
}

export const TriggerActivityCard: React.FC<TriggerActivityCardProps> = ({ logs }) => {
  const defaultLogs: TriggerActivityLog[] = [
    {
      id: 'trig-101',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      trigger: 'URL',
      source: 'TechCrunch',
      status: 'Processed',
      details: 'Received via Manual URL trigger and sent to Gemini AI',
    },
    {
      id: 'trig-102',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      trigger: 'MANUAL',
      source: 'Science Daily',
      status: 'Processed',
      details: 'Received via Manual Text trigger',
    },
    {
      id: 'trig-103',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      trigger: 'SHARE',
      source: 'Shared Source Content',
      status: 'Received',
      details: 'Ingested via /api/source/intake endpoint',
    },
  ];

  const displayLogs = logs && logs.length > 0 ? logs : defaultLogs;

  const getStatusBadge = (status: TriggerActivityLog['status']) => {
    switch (status) {
      case 'Processed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Processed
          </span>
        );
      case 'Received':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Radio className="w-3 h-3" />
            Received
          </span>
        );
      case 'Duplicate':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Copy className="w-3 h-3" />
            Duplicate
          </span>
        );
      case 'Failed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Trigger Intake Activity Log
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          Last {displayLogs.length} events
        </span>
      </div>

      <div className="space-y-2.5">
        {displayLogs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px] text-indigo-300 uppercase shrink-0">
                {log.trigger}
              </span>
              <div>
                <span className="font-semibold text-white">{log.source}</span>
                <p className="text-[11px] text-zinc-400">{log.details}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {getStatusBadge(log.status)}
              <span className="text-[10px] font-mono text-zinc-400">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
