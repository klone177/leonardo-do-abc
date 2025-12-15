import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Upload, Volume2, Volume1, VolumeX, SkipForward, ListMusic, X } from 'lucide-react';
import { INITIAL_PRODUCTS } from '../constants';

export const RadioSystem: React.FC = () => {
  const [playlist, setPlaylist] = useState<File[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeRef = useRef(volume); // Ref to access latest volume in timeouts/callbacks

  // Update volume ref and audio element
  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current && !isAnnouncing) {
        audioRef.current.volume = volume;
    }
  }, [volume, isAnnouncing]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setPlaylist(prev => [...prev, ...newFiles]);
      // If it was empty, prepare to play first track
      if (playlist.length === 0) {
        setCurrentTrackIndex(0);
      }
    }
  };

  // Play/Pause Logic
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (playlist.length > 0 && (!audioRef.current.src || audioRef.current.src === window.location.href)) {
         const url = URL.createObjectURL(playlist[currentTrackIndex]);
         audioRef.current.src = url;
         audioRef.current.volume = volume;
      }
      audioRef.current.play().catch(e => console.log("Interaction required"));
    }
    setIsPlaying(!isPlaying);
  };

  // Next Track Logic
  const playNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    changeTrack(nextIndex);
  };

  // Select Specific Track
  const selectTrack = (index: number) => {
    changeTrack(index);
  };

  const changeTrack = (index: number) => {
    setCurrentTrackIndex(index);
    if (audioRef.current && playlist[index]) {
        const url = URL.createObjectURL(playlist[index]);
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
    }
  };

  // Announcer Logic (Every 60-120 seconds)
  useEffect(() => {
    if (!isPlaying || playlist.length === 0) return;

    const minTime = 60000; // 1 min
    const maxTime = 120000; // 2 min
    const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);

    const timer = setTimeout(() => {
      triggerAnnouncement();
    }, randomTime);

    return () => clearTimeout(timer);
  }, [isPlaying, playlist, currentTrackIndex]); // Re-schedule after interactions

  // --- Audio Effects ---

  const playChime = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    
    const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.stop(start + duration);
    };

    // "Ding-Dong" sound
    playTone(660, t, 0.6); // High E
    playTone(550, t + 0.4, 0.8); // Lower C#
    
    return 1500; // Duration of chime in ms
  };

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // Prioritize "Google Português" or "Microsoft" voices which are more natural
    return voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) ||
           voices.find(v => v.lang === 'pt-BR' && v.name.includes('Natural')) ||
           voices.find(v => v.lang === 'pt-BR');
  };

  const triggerAnnouncement = () => {
    if (!audioRef.current || isAnnouncing) return;

    // Pick random product
    const product = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
    const discount = Math.floor(Math.random() * 30) + 10;
    const phrases = [
        `Atenção senhores clientes! Oferta relâmpago no setor de ${product.name}!`,
        `Somente hoje! ${product.name} com ${discount}% de desconto! Aproveite!`,
        `Limpeza total de estoque em ${product.name}. Corra antes que acabe!`,
        `Atenção! ${product.name} com preço de custo no corredor central.`
    ];
    const text = phrases[Math.floor(Math.random() * phrases.length)];

    setIsAnnouncing(true);
    setAnnouncementText(text);

    // 1. Duck Music relative to current volume (keep it very low but audible if volume is high)
    const currentVol = volumeRef.current;
    if (audioRef.current) {
        audioRef.current.volume = Math.min(currentVol * 0.1, 0.05); 
    }

    // 2. Play Chime
    const chimeDuration = playChime();

    // 3. Speak after chime
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const bestVoice = getBestVoice();
        if (bestVoice) utterance.voice = bestVoice;
        
        utterance.lang = 'pt-BR';
        utterance.volume = 1.0; // Max volume for voice
        utterance.rate = 1.05; 
        utterance.pitch = 1.0; 

        utterance.onend = () => {
            // 4. Restore music
            if (audioRef.current) {
                const targetVol = volumeRef.current;
                // Fade back in
                const fadeInterval = setInterval(() => {
                    if (!audioRef.current) {
                         clearInterval(fadeInterval);
                         return;
                    }
                    if (audioRef.current.volume >= targetVol) {
                        audioRef.current.volume = targetVol;
                        clearInterval(fadeInterval);
                        return;
                    }
                    audioRef.current.volume = Math.min(targetVol, audioRef.current.volume + 0.05);
                }, 100);
            }
            setIsAnnouncing(false);
            setAnnouncementText('');
        };

        window.speechSynthesis.speak(utterance);
    }, chimeDuration - 300);
  };

  return (
    <div className="bg-slate-800 text-white p-3 rounded-xl shadow-lg flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0 border border-slate-600 relative">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={playNext}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Volume2 size={18} className="text-green-400" />
           <span className="font-display font-bold text-sm tracking-wide">Rádio ABC</span>
        </div>
        
        {isAnnouncing && (
            <span className="text-xs text-yellow-400 animate-pulse font-bold flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                <Mic size={10} /> AO VIVO
            </span>
        )}
      </div>

      {/* Track Info Display */}
      <div className="bg-black/40 p-3 rounded-lg text-xs flex items-center justify-center text-center h-10 border border-slate-700/50">
        {isAnnouncing ? (
            <span className="text-yellow-300 italic animate-pulse">"{announcementText}"</span>
        ) : playlist.length > 0 ? (
            <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-slate-200 truncate w-full">{playlist[currentTrackIndex].name}</span>
            </div>
        ) : (
            <span className="text-slate-500 italic">Nenhuma música selecionada</span>
        )}
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-between gap-2">
        <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition text-xs flex items-center gap-1.5 text-slate-300" title="Carregar MP3">
          <Upload size={14} />
          <span className="hidden sm:inline">Add</span>
          <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
        </label>

        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-full border border-slate-700">
            <button 
                onClick={togglePlay}
                disabled={playlist.length === 0}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${playlist.length === 0 ? 'bg-slate-800 text-slate-600' : isPlaying ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-green-600 text-white hover:bg-green-500'}`}
            >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>

            <button 
                onClick={playNext}
                disabled={playlist.length === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition disabled:opacity-30 disabled:hover:bg-slate-700"
                title="Pular"
            >
                <SkipForward size={14} />
            </button>
        </div>

        <button 
            onClick={() => setShowPlaylist(!showPlaylist)}
            disabled={playlist.length === 0}
            className={`p-2 rounded-lg transition relative ${showPlaylist ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} disabled:opacity-50`}
            title="Playlist"
        >
            <ListMusic size={16} />
            {playlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-slate-800">
                    {playlist.length}
                </span>
            )}
        </button>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2 px-1 pt-1 border-t border-slate-700/50">
         <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="text-slate-400 hover:text-white transition">
            {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
         </button>
         <input 
           type="range" 
           min="0" 
           max="1" 
           step="0.05" 
           value={volume} 
           onChange={(e) => setVolume(parseFloat(e.target.value))}
           className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400 transition-all"
           style={{
             backgroundImage: `linear-gradient(to right, #22c55e ${volume * 100}%, #334155 ${volume * 100}%)`
           }}
         />
      </div>

      {/* Playlist Overlay */}
      {showPlaylist && playlist.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto custom-scrollbar">
              <div className="p-2 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                  <span className="text-xs font-bold text-slate-400 px-1">Fila ({playlist.length})</span>
                  <button onClick={() => setShowPlaylist(false)} className="p-1 hover:bg-slate-800 rounded"><X size={12} className="text-slate-400" /></button>
              </div>
              <ul className="divide-y divide-slate-800">
                  {playlist.map((file, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => selectTrack(idx)}
                        className={`p-2.5 text-xs cursor-pointer hover:bg-slate-800 transition flex items-center gap-3 ${idx === currentTrackIndex ? 'bg-slate-800/80' : ''}`}
                      >
                          <span className={`w-5 text-center font-bold ${idx === currentTrackIndex ? 'text-green-400' : 'text-slate-500'}`}>
                            {idx === currentTrackIndex && isPlaying ? <span className="animate-pulse">▶</span> : idx + 1}
                          </span>
                          <span className={`truncate flex-1 ${idx === currentTrackIndex ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                            {file.name}
                          </span>
                      </li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );
};
