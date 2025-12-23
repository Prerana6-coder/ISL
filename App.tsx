
import React, { useState, useCallback, useRef, useEffect } from 'react';
import CameraView from './components/CameraView';
import { GestureLabel } from './types';
import { gestureService } from './services/gestureService';

const API_BASE = "http://localhost:8000/api";

const App: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedWord, setDetectedWord] = useState<string>(GestureLabel.NONE);
  const [confidence, setConfidence] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_detections: 0, unique_gestures: 0 });
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendError, setBackendError] = useState(false);
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const selectedVoiceURIRef = useRef<string>("");

  const lastSpokenRef = useRef<string>("");
  const lastLoggedRef = useRef<string>("");
  const speechCooldownRef = useRef<boolean>(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        const preferred = availableVoices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('google uk english female')
        );
        const initialUri = preferred?.voiceURI || availableVoices[0].voiceURI;
        setSelectedVoiceURI(initialUri);
        selectedVoiceURIRef.current = initialUri;
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);

  useEffect(() => {
    selectedVoiceURIRef.current = selectedVoiceURI;
  }, [selectedVoiceURI]);

  // Persistent poll for backend status
  useEffect(() => {
    const sync = () => {
      fetchHistory();
      fetchStats();
    };
    sync();
    const interval = setInterval(sync, 5000);
    const modeCheck = setInterval(() => setIsDemoMode(gestureService.isDemoMode), 2000);
    return () => {
      clearInterval(interval);
      clearInterval(modeCheck);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history?limit=5`);
      if (res.ok) {
        setHistory(await res.json());
        setBackendError(false);
      } else {
        setBackendError(true);
      }
    } catch (e) {
      setBackendError(true);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        setStats(await res.json());
        setBackendError(false);
      }
    } catch (e) {
      setBackendError(true);
    }
  };

  const logToLocalDB = async (word: string, conf: number) => {
    if (word === GestureLabel.NONE || word === lastLoggedRef.current) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/detections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, confidence: conf })
      });
      if (res.ok) {
        lastLoggedRef.current = word;
        setBackendError(false);
        fetchHistory();
        fetchStats();
      }
    } catch (e) {
      setBackendError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const speak = (text: string, force: boolean = false) => {
    if (!force && (text === GestureLabel.NONE || text === lastSpokenRef.current || speechCooldownRef.current)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const v = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoiceURIRef.current);
    if (v) utterance.voice = v;
    if (!force) {
      speechCooldownRef.current = true;
      utterance.onend = () => { speechCooldownRef.current = false; };
    }
    window.speechSynthesis.speak(utterance);
    if (!force) lastSpokenRef.current = text;
  };

  const handleDetection = useCallback((word: string, conf: number) => {
    setDetectedWord(word);
    setConfidence(conf);
    if (word !== GestureLabel.NONE) {
      speak(word);
      logToLocalDB(word, conf);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            ISL SENSE <span className="text-xs align-top text-slate-500 font-normal ml-2">MVP</span>
          </h1>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isDemoMode ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isDemoMode ? 'Demo Mode' : 'AI Active'}
            </span>
            {isSyncing && <span className="text-[9px] text-cyan-400 animate-pulse font-mono uppercase ml-2">Syncing...</span>}
            {backendError && (
              <span className="flex items-center text-[9px] text-red-500 font-bold uppercase ml-2 animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5" />
                Backend Offline
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setIsCameraActive(!isCameraActive)}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg ${
            isCameraActive 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' 
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
          }`}
        >
          {isCameraActive ? 'Stop Session' : 'Start Session'}
        </button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <div className="lg:col-span-2 space-y-6">
          <CameraView onDetection={handleDetection} isActive={isCameraActive} />
          
          <div className="p-8 rounded-2xl glass border border-white/5 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Detected Phrase</span>
            <div className={`text-6xl font-black transition-all duration-300 text-center ${detectedWord !== GestureLabel.NONE ? 'text-emerald-400' : 'text-slate-700'}`}>
              {detectedWord}
            </div>
            {detectedWord !== GestureLabel.NONE && (
              <div className="mt-4 flex items-center space-x-2">
                <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${confidence * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-500">{(confidence * 100).toFixed(0)}% Match</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass border border-white/5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Voice Settings</h3>
            <select 
              value={selectedVoiceURI} 
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl glass border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Detections</p>
              <p className="text-2xl font-black text-emerald-400">{stats.total_detections}</p>
            </div>
            <div className="p-4 rounded-xl glass border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Unique Signs</p>
              <p className="text-2xl font-black text-cyan-400">{stats.unique_gestures}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass border border-white/5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Local History</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item, i) => (
                <div key={item.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-semibold text-slate-200">{item.word}</span>
                  <span className="text-[9px] text-slate-500 font-mono italic">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {history.length === 0 && !backendError && (
                <div className="text-center py-8 opacity-40 text-xs italic">Awaiting detections...</div>
              )}
              {backendError && (
                <div className="text-center py-8 text-red-500/60 text-[10px] font-bold">START MAIN.PY TO SEE HISTORY</div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-white/5 text-center text-slate-600 text-[10px] font-bold tracking-widest uppercase">
        <p>&copy; 2024 ISL SENSE AI. LOCAL DATABASE PERSISTENCE ENABLED.</p>
      </footer>
    </div>
  );
};

export default App;
