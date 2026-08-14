import React from 'react';
import { FileText, ArrowLeft, Layers, ShieldCheck, CheckCircle2, AlertTriangle, Scale, Cpu, Globe } from 'lucide-react';

interface TermsOfServicePageProps {
  onNavigateHome: () => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onNavigateHome }) => {
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
            <Scale className="w-40 h-40 text-indigo-400" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            Please read these Terms of Service carefully before using Social AutoPilot. By accessing or using our platform, you agree to be bound by these terms.
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
              <CheckCircle2 className="w-4 h-4" />
              <h2 className="text-white text-base">1. Acceptance & Description of Service</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Social AutoPilot provides an automated content ingestion, AI re-writing, queue review, and social publishing platform. By connecting an account or submitting content to Social AutoPilot, you agree to comply with these Terms of Service and all applicable local, state, and international laws.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <h2 className="text-white text-base">2. User Content Responsibility & Ownership</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You retain ownership of all original text, article snippets, and material you submit to Social AutoPilot. By using the platform:
            </p>
            <ul className="space-y-2 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>You represent and warrant that you hold all necessary rights, licenses, or authorizations to submit source content into the application.</li>
              <li>You acknowledge that you are solely responsible for reviewing, verifying, editing, approving, and publishing generated content to your social media channels.</li>
              <li>You agree not to publish false, defamatory, infringing, unlawful, or misleading information.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Globe className="w-4 h-4" />
              <h2 className="text-white text-base">3. Third-Party Integrations & Platform Compliance</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Social AutoPilot integrates with Meta/Facebook Graph APIs and Google Gemini AI APIs:
            </p>
            <ul className="space-y-2 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>
                <strong className="text-zinc-100">Meta / Facebook Platform Terms:</strong> Usage of Facebook features is subject to Meta's Developer Terms, Community Standards, and Platform Policies. You must not use Social AutoPilot to violate Meta policies.
              </li>
              <li>
                <strong className="text-zinc-100">Google Gemini AI Services:</strong> Content re-writing utilizes Google Gemini AI services and is subject to Google AI Terms of Use.
              </li>
              <li>
                <strong className="text-zinc-100">Independent Service:</strong> Social AutoPilot is an independent platform and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Google LLC.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-white text-base">4. Prohibited Uses</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside pl-1 leading-relaxed">
              <li>Submitting or generating spam, hate speech, abusive, harassing, or sexually explicit content.</li>
              <li>Attempting to bypass authentication mechanisms, rate limits, or security controls.</li>
              <li>Using automated scraping tools or unauthorized bots in violation of target website terms.</li>
              <li>Impersonating individuals or organizations without authorization.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <h2 className="text-white text-base">5. Service Availability & Disclaimer of Warranties</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Social AutoPilot is provided on an <strong className="text-white font-semibold">"AS IS"</strong> and <strong className="text-white font-semibold">"AS AVAILABLE"</strong> basis. While we strive for high uptime and processing reliability, we make no guarantees regarding uninterrupted availability, error-free AI re-writing, or third-party API uptime.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <Scale className="w-4 h-4" />
              <h2 className="text-white text-base">6. Limitation of Liability</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              To the maximum extent permitted by applicable law, Social AutoPilot and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of (or inability to access or use) the application, AI re-written content, or social media publishing activities.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <h2 className="text-white text-base">7. Changes to Terms & Contact</h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Updated terms will be posted directly to this page with an updated revision date. Continued use of Social AutoPilot constitutes acceptance of modified terms. For inquiries regarding these terms, contact <span className="text-indigo-300 font-mono font-semibold">support@socialautopilot.app</span>.
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
            <button onClick={() => { window.history.pushState({}, '', '/privacy-policy'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => { window.history.pushState({}, '', '/data-deletion'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-zinc-200 cursor-pointer">Data Deletion</button>
            <span>•</span>
            <span className="text-indigo-400 font-medium">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
