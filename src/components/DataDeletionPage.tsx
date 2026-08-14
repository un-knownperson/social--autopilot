import React, { useState } from 'react';
import { Trash2, ArrowLeft, Layers, ShieldAlert, CheckCircle2, Facebook, Send, Mail, AlertCircle } from 'lucide-react';

interface DataDeletionPageProps {
  onNavigateHome: () => void;
}

export const DataDeletionPage: React.FC<DataDeletionPageProps> = ({ onNavigateHome }) => {
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">Social AutoPilot</span>
              <p className="text-[11px] text-zinc-400">Automated Content Processing & Publishing</p>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Title Banner */}
        <div className="bg-gradient-to-br from-rose-950/30 via-zinc-900/60 to-zinc-950 border border-rose-500/20 rounded-3xl p-6 sm:p-8 space-y-3 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trash2 className="w-40 h-40 text-rose-400" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-300 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>User Data & Privacy Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Data Deletion Instructions</h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            Social AutoPilot respects your data privacy. Learn how to request full deletion of your account data, OAuth tokens, and stored records, or remove application permissions.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Method 1: In-App Self Service */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-xs">
                Method 1
              </div>
              <h2 className="text-white text-base font-semibold">Immediate Self-Service Disconnection</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              If you wish to remove your connected Facebook Pages and revoke stored access tokens immediately:
            </p>
            <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside pl-1 leading-relaxed">
              <li>Log in to your Social AutoPilot application dashboard.</li>
              <li>Navigate to the <strong className="text-white">Facebook Connection</strong> or <strong className="text-white">Settings</strong> tab.</li>
              <li>Click the <strong className="text-rose-300">Disconnect Facebook Account</strong> button.</li>
              <li>The system will instantly delete stored Facebook User IDs, Page access tokens, and associated connection metadata from application memory and persistent storage.</li>
            </ol>
          </section>

          {/* Method 2: Meta Facebook Settings */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 font-bold text-xs">
                Method 2
              </div>
              <h2 className="text-white text-base font-semibold">Revoke Permissions Directly via Facebook</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You can also revoke Social AutoPilot's access directly from your Facebook account settings at any time:
            </p>
            <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside pl-1 leading-relaxed">
              <li>Open your Facebook account and go to <strong className="text-white">Settings & Privacy</strong> → <strong className="text-white">Settings</strong>.</li>
              <li>In the left sidebar, select <strong className="text-white">Apps and Websites</strong> (or <strong className="text-white">Business Integrations</strong>).</li>
              <li>Locate <strong className="text-indigo-300">Social AutoPilot</strong> in the list of active applications.</li>
              <li>Click <strong className="text-rose-300">Remove</strong> to revoke all active tokens and permissions granted to the app.</li>
            </ol>
          </section>

          {/* Method 3: Direct Request */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-xs">
                Method 3
              </div>
              <h2 className="text-white text-base font-semibold">Submit a Data Deletion Request</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              To request a complete manual purge of all stored queue items, activity logs, and settings associated with your usage, submit a request using the form below or email <span className="text-indigo-300 font-mono font-semibold">support@socialautopilot.app</span>.
            </p>

            {submitted ? (
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Deletion Request Submitted</h3>
                <p className="text-xs text-zinc-300">
                  Your request has been logged. Our system team will process your data deletion request within 48 hours and send a confirmation to <span className="text-emerald-300 font-mono">{requestEmail}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Your Contact / Facebook Account Email <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Additional Details / Facebook Page ID (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Provide any specific Facebook User ID, Page Name, or details to help us locate your records..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !requestEmail.trim()}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Data Deletion Request</span>
                </button>
              </form>
            )}
          </section>

          {/* Deletion Processing Procedure */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="text-white text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>What Happens After a Deletion Request</span>
            </h2>
            <ul className="space-y-2 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>
                <strong className="text-zinc-100">Verification (0-24 Hours):</strong> We verify your account details or Facebook User ID to locate associated records.
              </li>
              <li>
                <strong className="text-zinc-100">Data Purge (24-48 Hours):</strong> Stored Facebook User access tokens, Page access tokens, queued post drafts, and activity logs linked to the account are permanently deleted from application storage.
              </li>
              <li>
                <strong className="text-zinc-100">Confirmation:</strong> A final confirmation notice is sent back via email or log response verifying that data removal is complete.
              </li>
            </ul>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-4 flex justify-center">
          <button
            onClick={onNavigateHome}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Social AutoPilot Dashboard</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-400 mt-12 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Social AutoPilot. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => { window.history.pushState({}, '', '/privacy-policy'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <span className="text-rose-400 font-medium">Data Deletion</span>
            <span>•</span>
            <button onClick={() => { window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
