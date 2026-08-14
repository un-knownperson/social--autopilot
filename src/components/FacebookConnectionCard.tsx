import React, { useState, useEffect } from 'react';
import { FacebookStatus } from '../types';
import {
  fetchFacebookStatus,
  getFacebookLoginUrl,
  selectFacebookPage,
  disconnectFacebook,
} from '../lib/api';
import {
  Facebook,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Layers,
  Check,
  Building,
  Key,
} from 'lucide-react';

interface FacebookConnectionCardProps {
  onStatusChange?: () => void;
}

export const FacebookConnectionCard: React.FC<FacebookConnectionCardProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<FacebookStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/facebook/callback`
    : '/api/facebook/callback';

  const loadFacebookStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchFacebookStatus();
      setStatus(res);
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      console.error('Error fetching Facebook status:', err);
      setError(err.message || 'Failed to check Facebook connection status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacebookStatus();

    // Listen for OAuth popup postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FB_AUTH_SUCCESS') {
        setConnecting(false);
        setSuccessMsg('Facebook Page connected successfully!');
        loadFacebookStatus();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else if (event.data?.type === 'FB_AUTH_ERROR') {
        setConnecting(false);
        setError(event.data.error || 'Facebook authentication was cancelled or failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      setSuccessMsg(null);

      const data = await getFacebookLoginUrl();
      if (!data.configured || !data.url) {
        throw new Error(
          data.error ||
            'Facebook integration is not configured yet. Add FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and FACEBOOK_REDIRECT_URI in the deployment environment.'
        );
      }

      // Open Meta OAuth dialog directly in popup
      const popup = window.open(
        data.url,
        'facebook_oauth_popup',
        'width=620,height=720,scrollbars=yes,status=yes'
      );

      if (!popup) {
        setConnecting(false);
        alert('Please allow popups for this site to connect your Facebook Page.');
      }
    } catch (err: any) {
      console.error('Facebook connect error:', err);
      setConnecting(false);
      setError(
        err.message ||
          'Facebook integration is not configured yet. Add FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and FACEBOOK_REDIRECT_URI in the deployment environment.'
      );
    }
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      setSelectingId(pageId);
      setError(null);
      const res = await selectFacebookPage(pageId);
      setStatus(res);
      setSuccessMsg(`Selected Facebook Page "${res.selectedPage?.name}"`);
      if (onStatusChange) onStatusChange();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Select Facebook page error:', err);
      setError(err.message || 'Failed to select Facebook page.');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Facebook Page?')) return;
    try {
      setDisconnecting(true);
      setError(null);
      const res = await disconnectFacebook();
      setStatus(res);
      setSuccessMsg('Facebook Page disconnected.');
      if (onStatusChange) onStatusChange();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Disconnect Facebook error:', err);
      setError(err.message || 'Failed to disconnect Facebook.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-6 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-zinc-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Checking Facebook connection status...</span>
      </div>
    );
  }

  const isConfigured = status?.configured ?? false;
  const isConnected = status?.connected ?? false;
  const hasAppId = status?.hasAppId ?? false;
  const hasAppSecret = status?.hasAppSecret ?? false;
  const hasRedirectUri = status?.hasRedirectUri ?? false;

  // Connection status badge determination
  let statusBadgeLabel = 'Not Connected';
  let statusBadgeStyle = 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  let StatusIcon = XCircle;

  if (connecting) {
    statusBadgeLabel = 'Connecting';
    statusBadgeStyle = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    StatusIcon = Loader2;
  } else if (error) {
    statusBadgeLabel = 'Connection Error';
    statusBadgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    StatusIcon = AlertTriangle;
  } else if (isConnected) {
    statusBadgeLabel = 'Facebook Connected';
    statusBadgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    StatusIcon = CheckCircle2;
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 backdrop-blur-md">
            <Facebook className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Facebook Connection</h3>
            <p className="text-xs text-zinc-300 mt-0.5">
              Authenticate your Facebook account to manage destination Pages and publish approved content.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold border flex items-center gap-1.5 ${statusBadgeStyle}`}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
            <span>Connection Status: {statusBadgeLabel}</span>
          </span>

          <button
            onClick={loadFacebookStatus}
            title="Refresh Connection Status"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <strong className="text-rose-300 block">Facebook Connection Notice</strong>
            <p className="leading-relaxed opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* STATE 1A: READY TO CONFIGURE (APP_ID + APP_SECRET present, REDIRECT_URI missing) */}
      {!hasRedirectUri && hasAppId && hasAppSecret && (
        <div className="p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-3 text-xs text-indigo-200">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Facebook connection requires a production Redirect URI.</h4>
              <p className="text-zinc-300 leading-relaxed font-medium">
                Facebook connection requires a production Redirect URI.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
            <div className="p-2.5 bg-black/40 border border-emerald-500/30 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-emerald-400 font-bold block">FACEBOOK_APP_ID</span>
                <span className="text-zinc-400 text-[10px]">Meta Developer App</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="p-2.5 bg-black/40 border border-emerald-500/30 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-emerald-400 font-bold block">FACEBOOK_APP_SECRET</span>
                <span className="text-zinc-400 text-[10px]">Secure Server Key</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="p-2.5 bg-black/40 border border-amber-500/40 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-amber-400 font-bold block">FACEBOOK_REDIRECT_URI</span>
                <span className="text-zinc-400 text-[10px]">Pending Deployment</span>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* STATE 1B: MISSING APP_ID OR APP_SECRET */}
      {(!hasAppId || !hasAppSecret) && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4 text-xs text-amber-200/90">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-white">Facebook integration credentials pending setup</h4>
              <p className="text-zinc-300 leading-relaxed">
                Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables on your server to enable Facebook OAuth authentication.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-zinc-300">
            <div className="p-2.5 bg-black/40 border border-white/10 rounded-lg">
              <span className="text-amber-400 font-bold block">FACEBOOK_APP_ID</span>
              <span className="text-zinc-400 text-[10px]">Meta App Identifier</span>
            </div>
            <div className="p-2.5 bg-black/40 border border-white/10 rounded-lg">
              <span className="text-amber-400 font-bold block">FACEBOOK_APP_SECRET</span>
              <span className="text-zinc-400 text-[10px]">Server Secret Key</span>
            </div>
            <div className="p-2.5 bg-black/40 border border-white/10 rounded-lg">
              <span className="text-amber-400 font-bold block">FACEBOOK_REDIRECT_URI</span>
              <span className="text-zinc-400 text-[10px]">OAuth Callback Route</span>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: CONFIGURED BUT NOT CONNECTED */}
      {isConfigured && !isConnected && (
        <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Facebook className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-white">Connect Facebook Account</h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Authenticate securely via Meta OAuth to load managed Facebook Pages into your Destination Page pipeline. Access tokens are kept strictly on the server.
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 border border-blue-400/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting Facebook...</span>
              </>
            ) : (
              <>
                <Facebook className="w-4 h-4" />
                <span>Connect Facebook</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STATE 3: CONNECTED */}
      {isConnected && (
        <div className="space-y-6">
          {/* Account Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                Connected Facebook User
              </span>
              <div className="text-white font-semibold flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>{status?.user?.name || 'Authorized Facebook Account'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                Connection Status
              </span>
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Facebook Connected</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                Connected At
              </span>
              <div className="text-zinc-300 font-mono mt-1">
                {status?.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : 'Active Session'}
              </div>
            </div>
          </div>

          {/* Destination Page Pipeline Structure */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider block">
              Destination Page Pipeline Architecture
            </span>
            <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-mono overflow-x-auto pb-1">
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">Facebook User</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">OAuth Token</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">Available Pages</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">Select Destination Page</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">Publish Approved Content</span>
            </div>
          </div>

          {/* Page Selection List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Select Destination Page ({status?.availablePages?.length || 0} Available)
              </span>
            </h4>

            {status?.availablePages && status.availablePages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {status.availablePages.map((page) => {
                  const isSelected = status.selectedPage?.id === page.id;
                  const isSelecting = selectingId === page.id;

                  return (
                    <div
                      key={page.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/40 shadow-lg shadow-indigo-600/10'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {page.picture ? (
                          <img
                            src={page.picture}
                            alt={page.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                            <Building className="w-5 h-5" />
                          </div>
                        )}

                        <div className="overflow-hidden">
                          <h5 className="text-xs font-bold text-white truncate">{page.name}</h5>
                          <span className="text-[10px] text-zinc-400 font-mono block">
                            Page ID: {page.id}
                          </span>
                          {page.category && (
                            <span className="text-[10px] text-indigo-300 block truncate">
                              {page.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Destination Selected</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectPage(page.id)}
                            disabled={isSelecting}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSelecting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Select Page'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 space-y-1">
                <strong className="block text-white">No Facebook Pages Found or Permissions Not Yet Available</strong>
                <p>
                  Required Facebook permissions (e.g. <code className="font-mono text-amber-300">pages_show_list</code>) are not yet available or no Facebook Pages were returned for this account. Ensure your Facebook account manages at least one Page and granted Page permissions during OAuth login.
                </p>
              </div>
            )}
          </div>

          {/* Currently Selected Destination Page Box */}
          {status?.selectedPage && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-slate-950/40 border border-indigo-500/30 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {status.selectedPage.picture ? (
                  <img
                    src={status.selectedPage.picture}
                    alt={status.selectedPage.name}
                    className="w-10 h-10 rounded-full border border-indigo-400/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Building className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-mono block">Selected Destination Page</span>
                  <div className="text-sm font-bold text-white">{status.selectedPage.name}</div>
                  <div className="text-[11px] text-zinc-400 font-mono">ID: {status.selectedPage.id}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Publishing Pipeline</span>
                <span className="text-xs font-semibold text-emerald-300">Destination Ready</span>
              </div>
            </div>
          )}

          {/* Disconnect Action */}
          <div className="pt-2 border-t border-white/10 flex justify-end">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Disconnect Facebook</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
