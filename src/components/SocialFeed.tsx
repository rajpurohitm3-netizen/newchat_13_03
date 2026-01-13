"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Youtube, 
  Instagram, 
  ChevronLeft, 
  Search,
  LogIn,
  RefreshCw,
  Lock,
  Zap,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  Activity,
  User,
  Layout,
  Link as LinkIcon,
  Star,
  Maximize2,
  Chrome,
  Shield,
  Home as HomeIcon,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function SocialFeed({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"youtube" | "instagram">("youtube");
  const [youtubeLink, setYoutubeLink] = useState("trending");
  const [instagramLink, setInstagramLink] = useState("https://www.instagram.com/reels/C5pW7S9S9S9/");
  const [userId, setUserId] = useState<string | null>(null);
  const [inputLink, setInputLink] = useState("");
  const [viewMode, setViewMode] = useState<"stats" | "embed">("embed");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const yt = localStorage.getItem(`social_yt_${session.user.id}`);
        const ig = localStorage.getItem(`social_ig_${session.user.id}`);
        if (yt) setYoutubeLink(yt);
        if (ig) setInstagramLink(ig);
      }
    };
    fetchUser();
  }, []);

  const handleOpenExternal = () => {
    let url = currentLink;
    if (url === 'trending') {
      url = activeTab === 'youtube' ? 'https://www.youtube.com/feed/trending' : 'https://www.instagram.com/reels/';
    } else if (url === 'home') {
      url = activeTab === 'youtube' ? 'https://www.youtube.com/' : 'https://www.instagram.com/';
    } else if (!url.startsWith('http')) {
      if (activeTab === 'youtube') {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`;
      } else {
        url = `https://www.instagram.com/explore/tags/${encodeURIComponent(url)}/`;
      }
    }
    window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
  };

  const getEmbedUrl = (url: string, platform: 'youtube' | 'instagram') => {
    if (!url) {
      if (platform === 'youtube') return 'https://www.youtube.com/embed?listType=search&list=trending';
      return null;
    }
    
    if (url === 'trending') {
      if (platform === 'youtube') return 'https://www.youtube-nocookie.com/embed?listType=search&list=trending&autoplay=1';
      return platform === 'instagram' ? 'https://www.instagram.com/reels/C5pW7S9S9S9/embed' : null;
    }
    if (url === 'home') {
      if (platform === 'youtube') return 'https://www.youtube-nocookie.com/embed?listType=search&list=latest&autoplay=1';
      if (platform === 'instagram') return 'https://www.instagram.com/reels/C5pW7S9S9S9/embed';
    }

    if (!url.startsWith('http') && !url.includes('.')) {
      if (platform === 'youtube') {
        return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(url)}&autoplay=1`;
      }
    }

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (platform === 'youtube') {
        const list = urlObj.searchParams.get('list');
        if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1`;

        const v = urlObj.searchParams.get('v');
        if (v) return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&modestbranding=1&rel=0&origin=${window.location.origin}`;
        
        if (urlObj.pathname.startsWith('/shorts/')) {
          const id = urlObj.pathname.split('/')[2];
          return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
        }
        
        if (urlObj.hostname === 'youtu.be') {
          const id = urlObj.pathname.split('/')[1];
          return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
        }

        if (urlObj.pathname === '/' || urlObj.pathname === '') {
          return `https://www.youtube-nocookie.com/embed?listType=search&list=trending&autoplay=1`;
        }

        if (urlObj.pathname.includes('/embed/')) {
          return url;
        }
      } else if (platform === 'instagram') {
        if (urlObj.pathname.startsWith('/p/')) {
          const id = urlObj.pathname.split('/')[2];
          return `https://www.instagram.com/p/${id}/embed`;
        }
        if (urlObj.pathname.startsWith('/reels/')) {
          const id = urlObj.pathname.split('/')[2];
          return `https://www.instagram.com/reels/${id}/embed`;
        }
        if (urlObj.pathname.startsWith('/reel/')) {
          const id = urlObj.pathname.split('/')[2];
          return `https://www.instagram.com/reel/${id}/embed`;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const currentLink = activeTab === "youtube" ? youtubeLink : instagramLink;
  const embedUrl = useMemo(() => getEmbedUrl(currentLink, activeTab), [currentLink, activeTab]);

  const handleDisconnect = () => {
    if (activeTab === "youtube") {
      setYoutubeLink("trending");
      localStorage.removeItem(`social_yt_${userId}`);
    } else {
      setInstagramLink("https://www.instagram.com/reels/C5pW7S9S9S9/");
      localStorage.removeItem(`social_ig_${userId}`);
    }
    toast.success("Settings reset to default");
  };

  return (
    <div className="h-full flex flex-col bg-[#010101] text-white overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${activeTab === "youtube" ? "from-red-900/10 via-transparent to-transparent" : "from-purple-900/10 via-transparent to-pink-900/5"}`} />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-20 p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl bg-black/40">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/5 text-white/40 hover:text-white rounded-xl h-10 w-10 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-black italic tracking-tighter uppercase flex items-center gap-2">
                Social <span className={activeTab === "youtube" ? "text-red-500" : "text-pink-500"}>Nexus</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {currentLink && (
            <div className="flex bg-zinc-900/50 border border-white/10 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setViewMode("embed")}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === "embed" ? "bg-white/10 text-white" : "text-white/30 hover:text-white"}`}
              >
                Live
              </button>
              <button 
                onClick={() => setViewMode("stats")}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === "stats" ? "bg-white/10 text-white" : "text-white/30 hover:text-white"}`}
              >
                Stats
              </button>
            </div>
          )}
          <div className="flex bg-zinc-900/50 border border-white/10 p-1.5 rounded-2xl flex-1 sm:flex-none shadow-2xl">
            <button 
              onClick={() => { setActiveTab("youtube"); setInputLink(""); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "youtube" ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "text-white/30 hover:text-white hover:bg-white/5"}`}
            >
              <Youtube className="w-4 h-4" /> YouTube
            </button>
            <button 
              onClick={() => { setActiveTab("instagram"); setInputLink(""); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "instagram" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-900/40" : "text-white/30 hover:text-white hover:bg-white/5"}`}
            >
              <Instagram className="w-4 h-4" /> Instagram
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
            {viewMode === "embed" ? (
              <div className="flex-1 flex flex-col bg-black relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl group/browser">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl group-hover/browser:border-white/20 transition-all duration-500" />
                    <div className="relative flex items-center px-4 py-2 gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'youtube' ? 'bg-red-500/20 text-red-500' : 'bg-pink-500/20 text-pink-500'}`}>
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex gap-2 mr-2">
                        <button 
                          onClick={() => activeTab === 'youtube' ? setYoutubeLink('home') : setInstagramLink('home')}
                          className="p-1 hover:bg-white/10 rounded-md transition-all"
                          title="Home"
                        >
                          <HomeIcon className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                        <button 
                          onClick={() => activeTab === 'youtube' ? setYoutubeLink('trending') : setInstagramLink('trending')}
                          className="p-1 hover:bg-white/10 rounded-md transition-all"
                          title="Trending"
                        >
                          <Flame className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                          <button 
                            onClick={() => {
                              const current = activeTab === 'youtube' ? youtubeLink : instagramLink;
                              if (activeTab === 'youtube') setYoutubeLink(''); 
                              else setInstagramLink('');
                              setTimeout(() => {
                                if (activeTab === 'youtube') setYoutubeLink(current);
                                else setInstagramLink(current);
                              }, 10);
                            }}
                            className="p-1 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white"
                            title="Refresh"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={handleOpenExternal}
                            className="p-1 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white"
                            title="Open in Browser"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    <input 
                      type="text"
                      placeholder={`Search or paste ${activeTab} link...`}
                      value={inputLink}
                      onChange={(e) => setInputLink(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (activeTab === "youtube") {
                            setYoutubeLink(inputLink);
                            localStorage.setItem(`social_yt_${userId}`, inputLink);
                          } else {
                            setInstagramLink(inputLink);
                            localStorage.setItem(`social_ig_${userId}`, inputLink);
                          }
                          setInputLink("");
                          toast.success("Nexus updated");
                        }
                      }}
                      className="flex-1 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none placeholder:text-white/20 text-white"
                    />
                    <div className="flex items-center gap-1.5 opacity-40 group-hover/browser:opacity-100 transition-opacity">
                      <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold text-white/40">ENTER</div>
                    </div>
                  </div>
                </div>

                    {embedUrl ? (
                      <div className="w-full h-full relative">
                        <iframe 
                          src={embedUrl}
                          className="w-full h-full border-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 bg-zinc-900/20">
                    <div className="p-8 bg-white/5 rounded-full relative z-10 shadow-2xl">
                      {activeTab === 'youtube' ? <Youtube className="w-16 h-16 text-red-500" /> : <Instagram className="w-16 h-16 text-pink-500" />}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Connection <span className={activeTab === 'youtube' ? 'text-red-500' : 'text-pink-500'}>Required</span></h3>
                      <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                        Enter a valid {activeTab} link or search term in the browser bar above to initialize the neural uplink.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar space-y-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 p-10 bg-zinc-900/40 border border-white/10 rounded-[3.5rem] backdrop-blur-3xl relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-64 h-64 ${activeTab === 'youtube' ? 'bg-red-600/5' : 'bg-pink-600/5'} blur-[100px] rounded-full`} />
                  <div className="flex items-center gap-6 relative z-10">
                    <motion.div 
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        className={`p-6 rounded-[2.2rem] ${activeTab === 'youtube' ? 'bg-red-600 shadow-red-900/30' : 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-pink-900/30'} shadow-2xl`}
                    >
                        {activeTab === 'youtube' ? <Youtube className="w-10 h-10" /> : <Instagram className="w-10 h-10" />}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">{activeTab === 'youtube' ? 'YouTube' : 'Instagram'}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] truncate max-w-[200px] sm:max-w-md">{currentLink}</p>
                        </div>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full lg:w-auto relative z-10">
                    <Button 
                        onClick={() => setViewMode("embed")}
                        className="flex-1 lg:flex-none bg-white text-black hover:bg-zinc-200 rounded-2xl h-16 px-10 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl"
                    >
                        <Maximize2 className="w-4 h-4" /> Live Matrix
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-1 space-y-8">
                    <div className="bg-zinc-900/40 border border-white/10 rounded-[3rem] p-10 space-y-10">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Uplink Status</h4>
                            <div className="flex items-center justify-between">
                            <p className="text-4xl font-black italic text-emerald-500 uppercase">Active</p>
                            <Activity className="w-8 h-8 text-emerald-500/50" />
                            </div>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-6">
                            {[
                                { label: "Signal Latency", value: "0.8ms", color: "text-white" },
                                { label: "Data Pipeline", value: "Optimal", color: "text-indigo-400" },
                                { label: "Neural Load", value: "4%", color: "text-purple-400" }
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{stat.label}</span>
                                    <span className={`text-xs font-black ${stat.color}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>

                  <div className="xl:col-span-2 bg-zinc-900/40 border border-white/10 rounded-[3rem] p-10 flex flex-col relative overflow-hidden group">
                      <div className={`absolute -top-40 -right-40 w-96 h-96 ${activeTab === 'youtube' ? 'bg-red-600/5' : 'bg-pink-600/5'} blur-[100px] rounded-full pointer-events-none`} />
                      <div className="flex items-center justify-between mb-8">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Security Logs</h4>
                          <Shield className="w-5 h-5 text-white/10" />
                      </div>
                      <div className="flex-1 bg-black/40 border border-white/5 rounded-[2.5rem] p-8 space-y-6 font-mono text-[10px]">
                          <div className="flex gap-4">
                              <span className="text-white/20">[08:42:15]</span>
                              <span className="text-indigo-400">CONNECTING_NODE:</span>
                              <span className="text-white/40">{currentLink.substring(0, 40)}...</span>
                          </div>
                          <div className="flex gap-4">
                              <span className="text-white/20">[08:42:16]</span>
                              <span className="text-emerald-400">HANDSHAKE_COMPLETE:</span>
                              <span className="text-white/40">Secure tunnel established</span>
                          </div>
                          <div className="pt-8 border-t border-white/5 mt-auto">
                              <div className="flex items-center gap-4 text-indigo-400/50 animate-pulse">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                  <span>LISTENING_FOR_SIGNALS...</span>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
