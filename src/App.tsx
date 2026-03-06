import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Radio, 
  Info, 
  Share2,
  Maximize2,
  Menu,
  X,
  Heart,
  SkipForward,
  SkipBack,
  Music,
  Search,
  ExternalLink,
  ChevronRight,
  Calendar,
  Mic2,
  HeartHandshake,
  Podcast,
  RefreshCw
} from "lucide-react";
import { STATIONS } from "./constants";
import { RadioStation, PlayerState } from "./types";
import AIHost from "./components/AIHost";
import RequestModal from "./components/RequestModal";
import ShareModal from "./components/ShareModal";
import ProgramSchedule from "./components/ProgramSchedule";
import TrackDetailsModal from "./components/TrackDetailsModal";
import DonationModal from "./components/DonationModal";
import Visualizer from "./components/Visualizer";
import { cn } from "./lib/utils";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "about" | "contact" | "prayer" | "podcasts">("home");
  const [state, setState] = useState<PlayerState>({
    currentStation: STATIONS[0],
    isPlaying: false,
    volume: 0.7,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [metadata, setMetadata] = useState<{ artist: string; title: string } | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("praiseradio-favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const donation = urlParams.get("donation");
    if (donation === "success") {
      setNotification({ message: "Thank you for your generous donation! Your support means the world to us.", type: "success" });
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (donation === "cancel") {
      setNotification({ message: "Donation cancelled. If you have any questions, please feel free to contact us.", type: "info" });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isComponentMounted = true;

    const connectWebSocket = async () => {
      if (!isComponentMounted) return;

      try {
        // Fetch the correct WS URL from the server
        let wsUrl = "";
        try {
          const response = await fetch("/api/ws-url");
          if (response.ok) {
            const data = await response.json();
            wsUrl = data.url;
          }
        } catch (e) {
          console.warn("Failed to fetch WS URL from API, falling back to window.location");
        }

        if (!wsUrl) {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          wsUrl = `${protocol}//${window.location.host}/ws`;
        }

        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "count" && data.stationId === state.currentStation?.id) {
              setListenerCount(data.count);
            } else if (data.type === "metadata" && data.stationId === state.currentStation?.id) {
              setMetadata(data.metadata);
            }
          } catch (e: any) {
            console.error("WS message parse error:", e.message);
          }
        };

        ws.onopen = () => {
          console.log("WebSocket connected successfully");
          if (state.currentStation) {
            ws.send(JSON.stringify({ type: "join", stationId: state.currentStation.id }));
          }
        };

        ws.onclose = (event) => {
          if (isComponentMounted) {
            console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason || "none"}). Retrying in 5s...`);
            reconnectTimeout = setTimeout(connectWebSocket, 5000);
          }
        };

        ws.onerror = (error: any) => {
          // Browser WebSocket errors are often opaque for security
          console.error("WebSocket connection error. This may be due to proxy settings, server availability, or SSL issues.", error);
          // Don't set state or alert here to avoid spamming the user, just log
        };

      } catch (e: any) {
        console.error("WebSocket initialization failed:", e.message);
        if (isComponentMounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && state.currentStation) {
      wsRef.current.send(JSON.stringify({ type: "join", stationId: state.currentStation.id }));
    }
  }, [state.currentStation]);

  useEffect(() => {
    localStorage.setItem("praiseradio-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : state.volume;
    }
  }, [state.volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (state.isPlaying) {
      // For live streams, it's often better to reload to get to the live edge
      // but only if it's not already playing or loading the same URL
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name === 'AbortError') return;
          console.error("Playback error:", error.message || "Unknown error");
          setState(prev => ({ ...prev, isPlaying: false }));
        });
      }
    } else {
      audio.pause();
      // When pausing a live stream, we should clear the source or call load() 
      // so it doesn't keep buffering in the background or resume from a stale point
      audio.load();
    }
  }, [state.isPlaying, state.currentStation?.url]);

  const togglePlay = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleRefresh = () => {
    if (audioRef.current) {
      audioRef.current.load();
      if (state.isPlaying) {
        audioRef.current.play().catch(err => console.error("Refresh play failed:", err.message));
      }
    }
  };

  const handleStationSelect = (station: RadioStation) => {
    setState(prev => ({
      ...prev,
      currentStation: station,
      isPlaying: true
    }));
    
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const toggleFavorite = (stationId: string) => {
    setFavorites(prev => 
      prev.includes(stationId) 
        ? prev.filter(id => id !== stationId) 
        : [...prev, stationId]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-blue-500/30 flex flex-col">
      <audio 
        ref={audioRef} 
        src={state.currentStation?.url} 
        preload="none"
        crossOrigin="anonymous"
        onPlay={() => {
          setState(prev => ({ ...prev, isPlaying: true }));
          setIsBuffering(false);
        }}
        onPause={() => setState(prev => ({ ...prev, isPlaying: false }))}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onError={() => {
          const error = audioRef.current?.error;
          let errorMessage = "Unknown audio error";
          if (error) {
            switch (error.code) {
              case 1: errorMessage = "Fetching process aborted by user"; break;
              case 2: errorMessage = "Network error while fetching audio"; break;
              case 3: errorMessage = "Audio decoding failed"; break;
              case 4: errorMessage = "Audio source not supported or stream unavailable"; break;
            }
          }
          console.error(`Audio error: ${errorMessage} (Code: ${error?.code})`);
          setIsBuffering(false);
          // If it's playing and errors, try to reload
          if (state.isPlaying) {
            setTimeout(() => {
              if (audioRef.current) {
                console.log("Attempting to recover from audio error...");
                audioRef.current.load();
                audioRef.current.play().catch(err => console.error("Recovery retry failed:", err.message));
              }
            }, 3000);
          }
        }}
        onStalled={() => {
          console.warn("Audio stalled");
          if (state.isPlaying) {
            setIsBuffering(true);
            // Nudge the audio to resume if it's stalled for too long
            setTimeout(() => {
              if (state.isPlaying && audioRef.current && audioRef.current.readyState < 3) {
                console.log("Nudging stalled audio...");
                audioRef.current.load();
                audioRef.current.play().catch(err => console.error("Nudge failed:", err.message));
              }
            }, 3000);
          }
        }}
        onEnded={() => {
          console.log("Audio ended");
          if (state.isPlaying) {
            audioRef.current?.load();
            audioRef.current?.play().catch(err => console.error("Restart failed:", err.message));
          }
        }}
      />

      {/* Top Utility Bar */}
      <div className="bg-[#003366] text-white py-2 px-6 text-[11px] font-bold uppercase tracking-widest hidden md:flex justify-between items-center">
        <div className="flex gap-6">
          <button onClick={() => setActiveTab("home")} className="hover:text-blue-300 transition-colors">Daily Verse</button>
          <button onClick={() => setActiveTab("prayer")} className="hover:text-blue-300 transition-colors">Prayer Requests</button>
          <button onClick={() => setActiveTab("about")} className="hover:text-blue-300 transition-colors">About Us</button>
        </div>
        <div className="flex gap-6">
          <button 
            onClick={() => setIsDonationModalOpen(true)} 
            className="hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <HeartHandshake size={12} />
            Give Now
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="PraiseRadio Logo" 
                className="h-14 w-auto object-contain transition-all hover:scale-105"
                onError={(e) => {
                  // Fallback if logo.png is not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFC107] rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <Radio className="text-black" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#003366]">PraiseRadioNG</h1>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Family & Faith</p>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-[#003366] uppercase tracking-wider">
              <button 
                onClick={() => setActiveTab("home")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "home" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                Home
              </button>
              <button 
                onClick={() => setActiveTab("schedule")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "schedule" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                Schedule
              </button>
              <button 
                onClick={() => setActiveTab("podcasts")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "podcasts" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                Podcasts
              </button>
              <button 
                onClick={() => setActiveTab("prayer")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "prayer" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                Pray With Us
              </button>
              <button 
                onClick={() => setActiveTab("about")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "about" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                About
              </button>
              <button 
                onClick={() => setActiveTab("contact")}
                className={cn(
                  "hover:text-blue-600 transition-colors border-b-2 py-1",
                  activeTab === "contact" ? "border-blue-600 text-blue-600" : "border-transparent"
                )}
              >
                Contact
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsRequestModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#0056b3] hover:bg-[#004494] text-white rounded-full transition-all text-xs font-bold uppercase tracking-widest shadow-md"
            >
              <Music size={14} />
              Request Track
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-full transition-colors text-[#003366]"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full relative">
        {/* Mobile Sidebar Navigation */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 p-8 transition-transform duration-300 lg:hidden flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center gap-3 mb-12">
            <img 
              src="/logo.png" 
              alt="PraiseRadio Logo" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFC107] rounded-lg flex items-center justify-center">
                <Radio className="text-black" size={24} />
              </div>
              <h2 className="text-xl font-black text-[#003366]">PraiseRadio</h2>
            </div>
          </div>

          <nav className="flex flex-col gap-6">
            {[
              { id: "home", label: "Home" },
              { id: "schedule", label: "Schedule" },
              { id: "podcasts", label: "Podcasts" },
              { id: "prayer", label: "Pray With Us" },
              { id: "about", label: "About" },
              { id: "contact", label: "Contact" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "text-left text-lg font-bold uppercase tracking-wider transition-colors",
                  activeTab === item.id ? "text-blue-600" : "text-slate-400 hover:text-[#003366]"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <button 
              onClick={() => {
                setIsRequestModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#0056b3] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg"
            >
              <Music size={14} />
              Request Track
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-32">
          <AnimatePresence mode="wait">
            {activeTab === "home" ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hero Section */}
                <section className="relative h-[400px] w-full overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=2000" 
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Inspirational Background"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#003366]/90 to-transparent" />
                  <div className="relative h-full flex flex-col justify-center px-8 lg:px-16 max-w-3xl">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <span className="inline-block px-3 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded mb-6">Featured Program</span>
                      <h2 className="text-4xl lg:text-6xl font-black text-white mb-4 leading-tight">Hope for the Journey</h2>
                      <p className="text-lg text-blue-100 mb-8 font-medium max-w-xl">Join us every weekday for uplifting messages and music that strengthens your faith and community.</p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsDonationModalOpen(true)}
                          className="px-8 py-3 bg-white text-[#003366] font-bold rounded-full hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg"
                        >
                          Give Now
                          <HeartHandshake size={18} />
                        </button>
                        <button 
                          onClick={() => setActiveTab("schedule")}
                          className="px-8 py-3 bg-blue-500/20 backdrop-blur-md border border-white/30 text-white font-bold rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                        >
                          View Schedule
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Content Grid */}
                <section className="p-8 lg:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Daily Verse Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                          <Calendar size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-[#003366]">Daily Verse</h3>
                      </div>
                      <p className="text-slate-600 italic mb-6 leading-relaxed">"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."</p>
                      <p className="text-sm font-bold text-blue-600">— Jeremiah 29:11</p>
                    </div>

                    {/* Pray With Us Card */}
                    <div 
                      onClick={() => setActiveTab("prayer")}
                      className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <HeartHandshake size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-[#003366]">Pray With Us</h3>
                      </div>
                      <p className="text-slate-600 mb-6 leading-relaxed">Need prayer? Our community is here for you. Submit your requests and join us in prayer for others.</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                        Submit a Request
                        <ChevronRight size={16} />
                      </div>
                    </div>

                    {/* AI Insights Card */}
                    <div className="bg-[#003366] p-8 rounded-2xl shadow-lg text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full" />
                      <div className="relative z-10">
                        <AIHost station={state.currentStation} metadata={metadata} />
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : activeTab === "schedule" ? (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12"
              >
                <ProgramSchedule />
              </motion.div>
            ) : activeTab === "podcasts" ? (
              <motion.div
                key="podcasts"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12 flex flex-col items-center justify-center min-h-[400px] text-center"
              >
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-8 animate-pulse">
                  <Podcast size={48} />
                </div>
                <h2 className="text-4xl font-black text-[#003366] mb-4">Podcasts Coming Soon</h2>
                <p className="text-lg text-slate-500 max-w-md mx-auto">
                  We're currently curating the best faith-based conversations and messages for you. Stay tuned for our upcoming podcast series!
                </p>
                <button 
                  onClick={() => setActiveTab("home")}
                  className="mt-8 px-8 py-3 bg-[#003366] text-white font-bold rounded-full hover:bg-[#002244] transition-colors"
                >
                  Back to Radio
                </button>
              </motion.div>
            ) : activeTab === "prayer" ? (
              <motion.div
                key="prayer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12 max-w-4xl mx-auto"
              >
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <HeartHandshake size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-[#003366]">Pray With Us</h2>
                      <p className="text-slate-500">"Where two or three gather in my name, there am I with them."</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-12">
                    <div>
                      <h3 className="font-bold text-xl text-[#003366] mb-4">Submit a Prayer Request</h3>
                      <p className="text-slate-600 mb-8 leading-relaxed">
                        We believe in the power of prayer. If you have a burden on your heart or a joy to share, let us know. Our prayer team will lift you up.
                      </p>
                      <button 
                        onClick={() => setIsRequestModalOpen(true)}
                        className="w-full py-4 bg-[#0056b3] text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-[#004494] transition-colors"
                      >
                        Open Request Form
                      </button>
                    </div>
                    
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-lg text-[#003366] mb-4">Prayer Wall</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-200">
                          <p className="text-sm text-slate-600 italic">"Praying for strength and healing for my family during this difficult season."</p>
                          <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">— Ayo Thomas</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-200">
                          <p className="text-sm text-slate-600 italic">"Thankful for a successful surgery and the peace that surpasses all understanding."</p>
                          <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">— Sarah M.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === "about" ? (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12 max-w-4xl mx-auto"
              >
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-4xl font-black text-[#003366] mb-8">About PraiseRadioNG</h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                      PraiseRadioNG is your premium destination for faith-based content, uplifting music, and community connection. Our mission is to spread hope and encouragement through the power of sound and digital innovation.
                    </p>
                    <div className="grid md:grid-cols-2 gap-8 my-12">
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <h3 className="font-bold text-[#003366] mb-2">Our Vision</h3>
                        <p className="text-sm text-slate-600">To be a global beacon of light, connecting people to their faith and each other through inspired broadcasting.</p>
                      </div>
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <h3 className="font-bold text-[#003366] mb-2">Our Values</h3>
                        <p className="text-sm text-slate-600">Faith, Community, Integrity, and Excellence in everything we broadcast and build.</p>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Founded with a passion for both technology and ministry, PraiseRadioNG leverages modern AI to provide deeper insights into the music and messages we share, creating a more meaningful experience for our listeners worldwide.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12 max-w-4xl mx-auto"
              >
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-4xl font-black text-[#003366] mb-8">Get In Touch</h2>
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <p className="text-slate-600">We'd love to hear from you. Whether you have feedback, a question, or just want to say hello, reach out to us using the form or our contact details.</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <Radio size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                            <p className="font-bold text-[#003366]">hello@praiseradio.ng</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <Share2 size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Social</p>
                            <p className="font-bold text-[#003366]">@PraiseRadioNG</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Name</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500" placeholder="Your Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Message</label>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 h-32" placeholder="How can we help?"></textarea>
                      </div>
                      <button className="w-full py-4 bg-[#003366] text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-colors">
                        Send Message
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Player Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
          {/* Current Track Info */}
          <div 
            className="flex items-center gap-4 w-full md:w-1/3 cursor-pointer group"
            onClick={() => setIsDetailsModalOpen(true)}
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden shadow-md flex-shrink-0 relative bg-white flex items-center justify-center p-1">
              <img 
                src={state.currentStation?.cover} 
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                alt="Station Cover"
                onError={(e) => {
                  e.currentTarget.src = "https://picsum.photos/seed/radio/400/400";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Info className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Live</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">{listenerCount} Listeners</span>
              </div>
              <h3 className="font-bold text-[#003366] truncate group-hover:text-blue-600 transition-colors">
                {metadata ? metadata.title : state.currentStation?.name}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {metadata ? metadata.artist : state.currentStation?.genre}
              </p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center gap-2 w-full md:w-1/3">
            <div className="flex items-center gap-8">
              <button 
                onClick={handleRefresh}
                className="p-2 text-slate-400 hover:text-[#003366] transition-colors"
                title="Refresh Stream"
              >
                <RefreshCw size={18} className={cn(isBuffering && "animate-spin")} />
              </button>
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-[#FFC107] text-black flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                disabled={!state.currentStation}
              >
                {isBuffering ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : state.isPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-1" />
                )}
              </button>
            </div>
            <div className="w-full">
              <Visualizer isPlaying={state.isPlaying} height={12} />
            </div>
          </div>

          {/* Volume & Utility */}
          <div className="flex items-center justify-end gap-6 w-full md:w-1/3">
            <div className="flex items-center gap-3 w-32">
              <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-[#003366] transition-colors">
                {isMuted || state.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={isMuted ? 0 : state.volume}
                onChange={(e) => {
                  setState(prev => ({ ...prev, volume: parseFloat(e.target.value) }));
                  setIsMuted(false);
                }}
                className="flex-1 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 text-slate-400 hover:text-[#003366] transition-colors"
            >
              <Share2 size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-[#003366] transition-colors hidden md:block">
              <Maximize2 size={20} />
            </button>
          </div>
        </div>
      </footer>
   {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <RequestModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)} 
      />

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        station={state.currentStation}
      />

      <TrackDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        station={state.currentStation}
        metadata={metadata}
      />

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
      />

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-[90vw]",
              notification.type === "success" ? "bg-emerald-600 text-white" : "bg-[#003366] text-white"
            )}
          >
            <div className="flex-1 text-sm font-medium">
              {notification.message}
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
