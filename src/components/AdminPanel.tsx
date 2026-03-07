import { useState } from "react";
import { X, Save, Lock, Layout, Radio, Calendar, Info, Quote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  content: any;
  onUpdate: (newContent: any) => Promise<void>;
}

export default function AdminPanel({ isOpen, onClose, content, onUpdate }: AdminPanelProps) {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"verse" | "about" | "stations" | "schedule">("verse");
  const [editedContent, setEditedContent] = useState(content);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoggedIn(true);
        localStorage.setItem("admin-token", data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onUpdate(editedContent);
      setError("Content updated successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update content");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#003366] rounded-xl flex items-center justify-center text-white shadow-lg">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#003366]">Administrator Panel</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Manage Station Content</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-bold text-[#003366]">Restricted Access</h3>
                <p className="text-slate-500 text-sm">Please enter the administrator password to continue.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#003366] text-white rounded-xl font-bold uppercase tracking-widest hover:bg-[#002244] transition-all disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Login to Admin"}
              </button>
              <p className="text-[10px] text-center text-slate-400 uppercase tracking-wider">
                Password is set in environment variables
              </p>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 space-y-2">
              {[
                { id: "verse", label: "Daily Verse", icon: Quote },
                { id: "about", label: "About Page", icon: Info },
                { id: "stations", label: "Radio Stations", icon: Radio },
                { id: "schedule", label: "Program Schedule", icon: Calendar }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${
                    activeSection === item.id 
                      ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
              
              <div className="pt-8 mt-auto">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                {error && <p className={`mt-4 text-center text-[10px] font-bold uppercase ${error.includes("success") ? "text-green-600" : "text-red-600"}`}>{error}</p>}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeSection === "verse" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-[#003366]">Edit Daily Verse</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Verse Text</label>
                      <textarea 
                        value={editedContent.verse.text}
                        onChange={(e) => setEditedContent({ ...editedContent, verse: { ...editedContent.verse, text: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 h-32 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Reference</label>
                      <input 
                        type="text"
                        value={editedContent.verse.reference}
                        onChange={(e) => setEditedContent({ ...editedContent, verse: { ...editedContent.verse, reference: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "about" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-[#003366]">Edit About Section</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Title</label>
                      <input 
                        type="text"
                        value={editedContent.about.title}
                        onChange={(e) => setEditedContent({ ...editedContent, about: { ...editedContent.about, title: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Content</label>
                      <textarea 
                        value={editedContent.about.content}
                        onChange={(e) => setEditedContent({ ...editedContent, about: { ...editedContent.about, content: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 h-48 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "stations" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#003366]">Manage Stations</h3>
                    <button 
                      onClick={() => {
                        const newStation = {
                          id: `station-${Date.now()}`,
                          name: "New Station",
                          url: "",
                          genre: "Gospel",
                          description: "",
                          cover: "https://picsum.photos/seed/new/400/400"
                        };
                        setEditedContent({ ...editedContent, stations: [...editedContent.stations, newStation] });
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Add New Station
                    </button>
                  </div>
                  <div className="space-y-8">
                    {editedContent.stations.map((station: any, idx: number) => (
                      <div key={station.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative">
                        <button 
                          onClick={() => {
                            const newStations = [...editedContent.stations];
                            newStations.splice(idx, 1);
                            setEditedContent({ ...editedContent, stations: newStations });
                          }}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Name</label>
                            <input 
                              type="text"
                              value={station.name}
                              onChange={(e) => {
                                const newStations = [...editedContent.stations];
                                newStations[idx].name = e.target.value;
                                setEditedContent({ ...editedContent, stations: newStations });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Genre</label>
                            <input 
                              type="text"
                              value={station.genre}
                              onChange={(e) => {
                                const newStations = [...editedContent.stations];
                                newStations[idx].genre = e.target.value;
                                setEditedContent({ ...editedContent, stations: newStations });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Stream URL</label>
                          <input 
                            type="text"
                            value={station.url}
                            onChange={(e) => {
                              const newStations = [...editedContent.stations];
                              newStations[idx].url = e.target.value;
                              setEditedContent({ ...editedContent, stations: newStations });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                          <input 
                            type="text"
                            value={station.description}
                            onChange={(e) => {
                              const newStations = [...editedContent.stations];
                              newStations[idx].description = e.target.value;
                              setEditedContent({ ...editedContent, stations: newStations });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "schedule" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#003366]">Manage Schedule</h3>
                    <button 
                      onClick={() => {
                        const newProgram = {
                          id: `prog-${Date.now()}`,
                          title: "New Program",
                          host: "Host Name",
                          startTime: "00:00",
                          endTime: "01:00",
                          description: ""
                        };
                        setEditedContent({ ...editedContent, schedule: [...editedContent.schedule, newProgram] });
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Add New Program
                    </button>
                  </div>
                  <div className="space-y-6">
                    {editedContent.schedule.map((prog: any, idx: number) => (
                      <div key={prog.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative">
                        <button 
                          onClick={() => {
                            const newSchedule = [...editedContent.schedule];
                            newSchedule.splice(idx, 1);
                            setEditedContent({ ...editedContent, schedule: newSchedule });
                          }}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Program Title</label>
                            <input 
                              type="text"
                              value={prog.title}
                              onChange={(e) => {
                                const newSchedule = [...editedContent.schedule];
                                newSchedule[idx].title = e.target.value;
                                setEditedContent({ ...editedContent, schedule: newSchedule });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Host</label>
                            <input 
                              type="text"
                              value={prog.host}
                              onChange={(e) => {
                                const newSchedule = [...editedContent.schedule];
                                newSchedule[idx].host = e.target.value;
                                setEditedContent({ ...editedContent, schedule: newSchedule });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Start Time</label>
                            <input 
                              type="text"
                              value={prog.startTime}
                              onChange={(e) => {
                                const newSchedule = [...editedContent.schedule];
                                newSchedule[idx].startTime = e.target.value;
                                setEditedContent({ ...editedContent, schedule: newSchedule });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">End Time</label>
                            <input 
                              type="text"
                              value={prog.endTime}
                              onChange={(e) => {
                                const newSchedule = [...editedContent.schedule];
                                newSchedule[idx].endTime = e.target.value;
                                setEditedContent({ ...editedContent, schedule: newSchedule });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                          <textarea 
                            value={prog.description}
                            onChange={(e) => {
                              const newSchedule = [...editedContent.schedule];
                              newSchedule[idx].description = e.target.value;
                              setEditedContent({ ...editedContent, schedule: newSchedule });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 h-20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
