import React, { useState, useEffect } from 'react';
import {
  Post,
  DashboardStats,
  ActivityLog,
  Settings,
  FacebookStatus,
} from './types';
import {
  fetchStats,
  fetchPosts,
  fetchSettings,
  updateSettings,
  createPost,
  deletePost,
  updatePost,
  processPostWithGemini,
  publishPostToFacebook,
  fetchFacebookStatus,
} from './lib/api';
import { DashboardOverview } from './components/DashboardOverview';
import { FacebookConnectionCard } from './components/FacebookConnectionCard';
import { ConnectedAccountsView } from './components/ConnectedAccountsView';
import { SourceTriggersCard } from './components/SourceTriggersCard';
import { TriggerActivityCard } from './components/TriggerActivityCard';
import { AutomationStatusView } from './components/AutomationStatusView';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { DataDeletionPage } from './components/DataDeletionPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { ShareTargetView } from './components/ShareTargetView';
import { UrlIntakePreviewCard } from './components/UrlIntakePreviewCard';
import { ImageAiEditModal } from './components/ImageAiEditModal';
import {
  LayoutDashboard,
  PlusCircle,
  ListFilter,
  CheckSquare,
  CheckCircle2,
  Cpu,
  Settings as SettingsIcon,
  Facebook,
  Radio,
  Link2,
  RefreshCw,
  Loader2,
  Trash2,
  Edit,
  Sparkles,
  Wand2,
  ImageIcon,
  Send,
  ExternalLink,
  AlertCircle,
  Layers,
  ArrowRight,
  Shield,
  ShieldAlert,
  FileText,
  Lock,
  Share2,
  Smartphone,
} from 'lucide-react';

type NavTab =
  | 'dashboard'
  | 'add-post'
  | 'queue'
  | 'review'
  | 'published'
  | 'automation'
  | 'settings'
  | 'facebook'
  | 'connected-accounts'
  | 'triggers'
  | 'share-target';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const s = window.location.search;
      if (p === '/share-target' || p.startsWith('/share-target') || p === '/share' || s.includes('url=') || s.includes('text=')) {
        return 'share-target';
      }
    }
    return 'dashboard';
  });
  const [stats, setStats] = useState<(DashboardStats & { recentActivities: ActivityLog[] }) | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Post Form State
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newOriginalText, setNewOriginalText] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newCategory, setNewCategory] = useState<any>('News');
  const [newNotes, setNewNotes] = useState('');
  const [addingPost, setAddingPost] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Global Image AI Edit Modal State
  const [editingImagePost, setEditingImagePost] = useState<Post | null>(null);
  const [activeEditImageUrl, setActiveEditImageUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, postsRes, settingsRes] = await Promise.all([
        fetchStats(),
        fetchPosts(),
        fetchSettings(),
      ]);
      setStats(statsRes.stats);
      setPosts(postsRes.posts);
      setSettings(settingsRes.settings);
    } catch (err: any) {
      console.error('Data load error:', err);
      setError(err.message || 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddWorkflowPost = async (data: {
    sourceUrl: string;
    originalText: string;
    sourceName: string;
    category: any;
    notes?: string;
    imageUrl?: string;
  }) => {
    try {
      setAddingPost(true);
      setAddError(null);
      setAddSuccess(null);
      const res = await createPost({
        sourceUrl: data.sourceUrl,
        originalText: data.originalText,
        sourceName: data.sourceName,
        category: data.category,
        notes: data.notes,
        imageUrl: data.imageUrl,
        triggerType: data.sourceUrl ? 'URL' : 'MANUAL',
      });
      setAddSuccess(res.message || 'Source post submitted to queue with extracted text & media!');
      await loadData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add source post');
    } finally {
      setAddingPost(false);
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginalText.trim() && !newSourceUrl.trim()) return;
    try {
      setAddingPost(true);
      setAddError(null);
      setAddSuccess(null);
      const res = await createPost({
        sourceUrl: newSourceUrl,
        originalText: newOriginalText || newSourceUrl,
        sourceName: newSourceName || 'Manual Submission',
        category: newCategory,
        notes: newNotes,
        triggerType: newSourceUrl && newSourceUrl.trim() ? 'URL' : 'MANUAL',
      });
      setAddSuccess(res.message || 'Source post submitted to queue!');
      setNewSourceUrl('');
      setNewOriginalText('');
      setNewSourceName('');
      setNewNotes('');
      await loadData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add source post');
    } finally {
      setAddingPost(false);
    }
  };

  const handleOpenImageEdit = (post: Post) => {
    if (!post.imageUrl) return;
    setEditingImagePost(post);
    setActiveEditImageUrl(post.imageUrl);
  };

  const handleApplyImageEdit = async (chosenImageUrl: string) => {
    if (!editingImagePost) return;
    try {
      await updatePost(editingImagePost.id, { imageUrl: chosenImageUrl });
      await loadData();
    } catch (err: any) {
      alert(`Failed to update post image: ${err.message}`);
    } finally {
      setEditingImagePost(null);
      setActiveEditImageUrl(null);
    }
  };

  const handleProcessAI = async (postId: string) => {
    try {
      setProcessingId(postId);
      const currentPost = posts.find((p) => p.id === postId);
      await processPostWithGemini(postId, currentPost);
      await loadData();
    } catch (err: any) {
      alert(`AI Processing Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (post: Post) => {
    try {
      await updatePost(post.id, { status: 'Approved' });
      await loadData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (post: Post) => {
    try {
      await updatePost(post.id, { status: 'Rejected' });
      await loadData();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handlePublishFB = async (postId: string) => {
    const postToPublish = posts.find((p) => p.id === postId);
    try {
      setPublishingId(postId);
      await publishPostToFacebook(postId, postToPublish);
      await loadData();
      alert('Published to Facebook successfully!');
    } catch (err: any) {
      alert(`Facebook Publishing Notice: ${err.message}`);
      await loadData();
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(postId);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add-post', label: 'Add Source Post', icon: PlusCircle },
    { id: 'share-target', label: 'Share Target (PWA)', icon: Smartphone },
    { id: 'queue', label: 'Content Queue', icon: ListFilter },
    { id: 'review', label: 'Review', icon: CheckSquare },
    { id: 'published', label: 'Published', icon: CheckCircle2 },
    { id: 'connected-accounts', label: 'Connected Accounts', icon: Link2 },
    { id: 'triggers', label: 'Source Triggers', icon: Radio },
    { id: 'automation', label: 'Automation', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Public Legal / Meta App Compliance Pages Route Handling
  if (currentPath === '/privacy-policy') {
    return <PrivacyPolicyPage onNavigateHome={() => navigateTo('/')} />;
  }
  if (currentPath === '/data-deletion') {
    return <DataDeletionPage onNavigateHome={() => navigateTo('/')} />;
  }
  if (currentPath === '/terms') {
    return <TermsOfServicePage onNavigateHome={() => navigateTo('/')} />;
  }
  if (currentPath === '/share-target' || currentPath.startsWith('/share-target') || currentPath === '/share') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto w-full mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              navigateTo('/');
            }}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Back to Social AutoPilot</span>
          </button>
        </div>
        <ShareTargetView
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            navigateTo('/');
          }}
          onRefreshData={loadData}
        />
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-400 font-medium">Loading Social AutoPilot...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Social AutoPilot</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold uppercase tracking-wider">
                  Pro
                </span>
              </h1>
              <p className="text-xs text-zinc-400 hidden sm:block">Automated Content Processing & Multi-Source Publishing</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8 w-full">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-2">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 px-3 py-2">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 font-semibold shadow-md shadow-indigo-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-300'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6 min-w-0">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && stats && (
            <DashboardOverview
              stats={stats}
              onNavigateTab={(tab) => {
                if (tab === 'add-post') setActiveTab('add-post');
                else if (tab === 'queue') setActiveTab('queue');
                else if (tab === 'review') setActiveTab('review');
                else if (tab === 'status') setActiveTab('automation');
                else if (tab === 'settings') setActiveTab('settings');
                else if (tab === 'connected-accounts') setActiveTab('connected-accounts');
              }}
              onSelectPost={() => setActiveTab('queue')}
              onOpenQuickAdd={() => setActiveTab('add-post')}
            />
          )}

          {/* ADD SOURCE POST TAB */}
          {activeTab === 'add-post' && (
            <div className="space-y-6">
              {/* Primary Post URL & AI Image Workflow Card */}
              <UrlIntakePreviewCard
                onAddPost={handleAddWorkflowPost}
                isSubmitting={addingPost}
                successMessage={addSuccess}
                errorMessage={addError}
              />

              {/* Direct Manual Entry Option */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Direct Manual Text Entry</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Or type or paste text manually if you do not have a live URL to scrape.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddPost} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Post Content / Story
                    </label>
                    <textarea
                      rows={4}
                      value={newOriginalText}
                      onChange={(e) => setNewOriginalText(e.target.value)}
                      placeholder="Type or paste custom text directly here..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Source Name
                      </label>
                      <input
                        type="text"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        placeholder="e.g. Manual Note, Editorial"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="News">News</option>
                        <option value="Fact">Fact</option>
                        <option value="Funny">Funny</option>
                        <option value="Opinion">Opinion</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Optional Notes
                      </label>
                      <input
                        type="text"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="e.g. Target audience"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingPost || !newOriginalText.trim()}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-white/10"
                  >
                    {addingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    <span>Add Manual Post</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* CONTENT QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Content Queue</h2>
                  <p className="text-xs text-zinc-300 mt-1">
                    Manage ingested source posts, trigger AI analysis/rewrites, and edit media.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-zinc-300">
                  Total Posts: {posts.length}
                </span>
              </div>

              {posts.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-3">
                  <ListFilter className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-300 font-medium">No posts in Content Queue.</p>
                  <button
                    onClick={() => setActiveTab('add-post')}
                    className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add First Source Post</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                            {post.category}
                          </span>
                          <span className="text-xs text-white font-medium">{post.sourceName || 'Source'}</span>
                          <span className="text-[11px] text-zinc-300">• {new Date(post.createdAt).toLocaleString()}</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 font-semibold text-zinc-200">
                          Status: {post.status}
                        </span>
                      </div>

                      {post.imageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group max-h-56">
                          <img
                            src={post.imageUrl}
                            alt="Post Media"
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-2 right-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenImageEdit(post)}
                              className="px-2.5 py-1.5 bg-black/70 hover:bg-indigo-600 border border-white/20 text-white rounded-lg text-[11px] font-medium backdrop-blur-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                            >
                              <Wand2 className="w-3 h-3 text-indigo-300" />
                              <span>AI Edit Image</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs text-zinc-200 line-clamp-3 leading-relaxed">{post.originalText}</p>
                        {post.aiRewrite && (
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                            <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI Rewrite:
                            </span>
                            <p className="text-xs text-zinc-100 font-medium">{post.aiRewrite}</p>
                          </div>
                        )}
                        {post.error && (
                          <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                            {post.error}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProcessAI(post.id)}
                            disabled={processingId === post.id}
                            className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            {processingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Process with OpenRouter</span>
                          </button>

                          {post.imageUrl && (
                            <button
                              onClick={() => handleOpenImageEdit(post)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>AI Edit Image</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 rounded-lg transition-all cursor-pointer"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEW TAB */}
          {activeTab === 'review' && (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Post Review & Approval</h2>
                <p className="text-xs text-zinc-300 mt-1">
                  Posts cannot be published to Facebook unless approved. Review generated content and media below.
                </p>
              </div>

              {posts.filter((p) => p.status === 'Ready' || p.status === 'New').length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                  <CheckSquare className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-300 font-medium">No posts awaiting approval.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts
                    .filter((p) => p.status === 'Ready' || p.status === 'New')
                    .map((post) => (
                      <div key={post.id} className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="text-xs font-semibold text-white">{post.sourceName}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                            Awaiting Review
                          </span>
                        </div>

                        {post.imageUrl && (
                          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group max-h-56">
                            <img
                              src={post.imageUrl}
                              alt="Post Media"
                              referrerPolicy="no-referrer"
                              className="w-full h-44 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute bottom-2 right-2">
                              <button
                                type="button"
                                onClick={() => handleOpenImageEdit(post)}
                                className="px-2.5 py-1.5 bg-black/70 hover:bg-indigo-600 border border-white/20 text-white rounded-lg text-[11px] font-medium backdrop-blur-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                              >
                                <Wand2 className="w-3 h-3 text-indigo-300" />
                                <span>AI Edit Image</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-xs">
                          <div className="p-3 bg-white/5 rounded-xl">
                            <span className="text-[11px] text-zinc-400 font-medium block mb-1">Original Text:</span>
                            <p className="text-zinc-200">{post.originalText}</p>
                          </div>

                          {post.aiRewrite && (
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                              <span className="text-[11px] text-indigo-300 font-bold block mb-1">Generated Rewrite:</span>
                              <p className="text-zinc-100 font-medium">{post.aiRewrite}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          {post.imageUrl ? (
                            <button
                              onClick={() => handleOpenImageEdit(post)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>AI Edit Image</span>
                            </button>
                          ) : <div />}

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleReject(post)}
                              className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(post)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                            >
                              Approve Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* PUBLISHED TAB */}
          {activeTab === 'published' && (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Approved & Published Posts</h2>
                <p className="text-xs text-zinc-300 mt-1">
                  View posts that are approved or published to Facebook. Note: Facebook publishing requires valid Facebook OAuth and destination Page selection.
                </p>
              </div>

              {posts.filter((p) => p.status === 'Approved' || p.status === 'Published').length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-300 font-medium">No approved or published posts found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts
                    .filter((p) => p.status === 'Approved' || p.status === 'Published')
                    .map((post) => (
                      <div key={post.id} className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="text-xs font-semibold text-white">{post.sourceName}</span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              post.status === 'Published'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                            }`}
                          >
                            {post.status === 'Published' ? 'Published' : 'Approved (Ready to Publish)'}
                          </span>
                        </div>

                        {post.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40">
                            <img
                              src={post.imageUrl}
                              alt="Post Media"
                              referrerPolicy="no-referrer"
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <p className="text-xs text-zinc-200">{post.aiRewrite || post.originalText}</p>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-zinc-400">
                            Status: {post.facebookStatus || 'NOT_PUBLISHED'}
                          </span>

                          {post.status === 'Approved' && (
                            <button
                              onClick={() => handlePublishFB(post.id)}
                              disabled={publishingId === post.id}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
                            >
                              {publishingId === post.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Publish to Facebook</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* SHARE TARGET TAB */}
          {activeTab === 'share-target' && (
            <ShareTargetView
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                navigateTo('/');
              }}
              onRefreshData={loadData}
            />
          )}

          {/* AUTOMATION TAB */}
          {activeTab === 'automation' && <AutomationStatusView />}

          {/* SOURCE TRIGGERS TAB */}
          {activeTab === 'triggers' && stats && (
            <div className="space-y-6">
              <SourceTriggersCard
                triggerProviders={stats.triggerProviders}
                onOpenShareTarget={() => setActiveTab('share-target')}
              />
              <TriggerActivityCard triggerLogs={stats.triggerLogs} />
            </div>
          )}

          {/* CONNECTED ACCOUNTS TAB */}
          {(activeTab === 'connected-accounts' || activeTab === 'facebook') && (
            <ConnectedAccountsView onStatusChange={loadData} />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && settings && (
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Application Settings</h2>
                <p className="text-xs text-zinc-300 mt-1">Configure global posting defaults, language, and writing style.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Writing Style</label>
                  <input
                    type="text"
                    value={settings.writingStyle}
                    onChange={(e) => setSettings({ ...settings, writingStyle: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Language</label>
                    <input
                      type="text"
                      value={settings.defaultLanguage}
                      onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Category</label>
                    <select
                      value={settings.defaultCategory}
                      onChange={(e) => setSettings({ ...settings, defaultCategory: e.target.value as any })}
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

                <button
                  onClick={async () => {
                    try {
                      await updateSettings(settings);
                      alert('Settings saved!');
                    } catch (err: any) {
                      alert(`Save error: ${err.message}`);
                    }
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  Save Settings
                </button>
              </div>

              {/* Meta / Facebook App Compliance Section */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Meta / Facebook App Compliance & Legal Documentation</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Publicly accessible pages required for Meta Developer App Review, OAuth configuration, and user privacy compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => navigateTo('/privacy-policy')}
                    className="p-4 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-left transition-all cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-indigo-300">
                      <span>Privacy Policy</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-indigo-300" />
                    </div>
                    <p className="text-[11px] text-zinc-300">Data collection, storage, and processing disclosure.</p>
                  </button>

                  <button
                    onClick={() => navigateTo('/data-deletion')}
                    className="p-4 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-left transition-all cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-rose-300">
                      <span>Data Deletion</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-rose-300" />
                    </div>
                    <p className="text-[11px] text-zinc-300">Instructions & self-service disconnect guide.</p>
                  </button>

                  <button
                    onClick={() => navigateTo('/terms')}
                    className="p-4 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-left transition-all cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-indigo-300">
                      <span>Terms of Service</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-indigo-300" />
                    </div>
                    <p className="text-[11px] text-zinc-300">Acceptable use and third-party API integration terms.</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-400 mt-auto bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Social AutoPilot. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => navigateTo('/privacy-policy')}
              className="text-zinc-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('/data-deletion')}
              className="text-zinc-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Data Deletion
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('/terms')}
              className="text-zinc-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Global Image AI Edit Modal */}
      {editingImagePost && activeEditImageUrl && (
        <ImageAiEditModal
          isOpen={!!editingImagePost}
          onClose={() => {
            setEditingImagePost(null);
            setActiveEditImageUrl(null);
          }}
          imageUrl={activeEditImageUrl}
          onApplyImage={handleApplyImageEdit}
        />
      )}
    </div>
  );
}
