import React from 'react';
import { Shield, ArrowLeft, Layers, Lock, FileText, Globe, Cpu, UserCheck } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigateHome: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigateHome }) => {
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
        <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-950 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 space-y-3 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Shield className="w-40 h-40 text-indigo-400" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Legal & Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            This Privacy Policy explains how Social AutoPilot collects, processes, uses, stores, and protects information when you use our platform, APIs, and associated services.
          </p>
          <div className="text-[11px] text-zinc-400 font-mono pt-1">
            Last Updated: August 11, 2026 • Effective Date: August 11, 2026
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <UserCheck className="w-4 h-4" />
              <h2 className="text-white text-base">1. Information We Collect & Process</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Social AutoPilot is designed to facilitate automated content processing, AI summarization/rewriting, and authorized social media publishing. To provide these functionalities, we process the following categories of information:
            </p>
            <ul className="space-y-2 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>
                <strong className="text-zinc-100">Authentication & Account Data:</strong> When you connect your Facebook account, we receive basic profile information (such as user ID and name) and OAuth access tokens required to list authorized Facebook Pages and publish approved posts on your behalf.
              </li>
              <li>
                <strong className="text-zinc-100">User-Submitted Source Content:</strong> Article snippets, post text, public links, and metadata submitted into the queue via manual input, browser/mobile share triggers, or authorized webhooks.
              </li>
              <li>
                <strong className="text-zinc-100">AI-Generated Content:</strong> Post headlines, summaries, key facts, and rewritten draft content generated through our AI engine.
              </li>
              <li>
                <strong className="text-zinc-100">Technical & Operational Data:</strong> Standard system activity logs, timestamp records, intake log entries, and processing status logs essential for queue management and error auditing.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Lock className="w-4 h-4" />
              <h2 className="text-white text-base">2. How We Use Your Information</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              We process your data exclusively for operational functionality. Specifically, information is used to:
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>Ingest, queue, and organize source content provided by you or your configured triggers.</li>
              <li>Perform automated topic extraction, fact verification tagging, and language re-writing using Google Gemini AI.</li>
              <li>Manage your post review and approval pipeline prior to publication.</li>
              <li>Publish approved posts directly to your connected Facebook Pages using official Meta Graph APIs.</li>
              <li>Maintain activity logs for tracking publishing history and troubleshooting processing errors.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Globe className="w-4 h-4" />
              <h2 className="text-white text-base">3. Third-Party Integrations & Service Providers</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Social AutoPilot integrates with select third-party services to deliver core application functionality:
            </p>
            <div className="space-y-3 pt-1">
              <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-1.5">
                <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <span>Meta / Facebook Graph API</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  We use official Meta Graph APIs for user authentication and publishing. When you publish a post or connect a page, relevant content and access tokens are transmitted securely to Meta's servers. Your credentials are never shared with unauthorized parties.
                </p>
              </div>

              <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-1.5">
                <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <span>Google Gemini AI</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Source text submitted for re-writing is processed using Google's Gemini AI SDK (`@google/genai`). Google processes submitted text snippets solely to return requested rewrites, summaries, and key facts.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <h2 className="text-white text-base">4. Data Storage, Security & Retention</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Data is stored securely within our application environment. Queue records, settings, and logs are maintained as long as your account remains active or as needed to provide service functionality. We employ standard administrative and technical safeguards to protect stored access tokens and application state from unauthorized access or disclosure.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <h2 className="text-white text-base">5. Your Data Rights & Deletion Requests</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You maintain full ownership and control over your data. You may at any time:
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>Disconnect your Facebook account directly from the application Settings at any time, immediately purging stored access tokens.</li>
              <li>Delete queued posts, activity logs, or source triggers directly within the application dashboard.</li>
              <li>Request full account and data deletion by following the instructions on our <button onClick={() => { window.history.pushState({}, '', '/data-deletion'); onNavigateHome(); }} className="text-indigo-400 hover:underline font-semibold cursor-pointer">Data Deletion Instructions</button> page.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Shield className="w-4 h-4" />
              <h2 className="text-white text-base">6. Contact Information</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              If you have any questions or concerns regarding this Privacy Policy or your data, please contact our support team at <span className="text-indigo-300 font-mono font-semibold">support@socialautopilot.app</span> or via the application dashboard.
            </p>
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
            <span className="text-indigo-400 font-medium">Privacy Policy</span>
            <span>•</span>
            <button onClick={() => { window.history.pushState({}, '', '/data-deletion'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Data Deletion</button>
            <span>•</span>
            <button onClick={() => { window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
