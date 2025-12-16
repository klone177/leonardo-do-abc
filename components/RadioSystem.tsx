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
  const volumeRef = useRef(volume);

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
  }, [isPlaying, playlist, currentTrackIndex]); 

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

    // 8-bit Chime
    playTone(660, t, 0.2); 
    playTone(880, t + 0.2, 0.4); 
    
    return 1000; 
  };

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
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
        `OFERTA NO SETOR: ${product.name}!`,
        `${product.name} COM ${discount}% OFF!`,
        `LIMPEZA DE ESTOQUE: ${product.name}!`,
    ];
    const text = phrases[Math.floor(Math.random() * phrases.length)];

    setIsAnnouncing(true);
    setAnnouncementText(text);

    // 1. Duck Music 
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
        utterance.volume = 1.0; 
        utterance.rate = 1.05; 
        utterance.pitch = 1.0; 

        utterance.onend = () => {
            // 4. Restore music
            if (audioRef.current) {
                audioRef.current.volume = volumeRef.current;
            }
            setIsAnnouncing(false);
            setAnnouncementText('');
        };

        window.speechSynthesis.speak(utterance);
    }, chimeDuration - 300);
  };

  return (
    <div className="bg-gray-800 p-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] w-full max-w-xs mx-auto md:mx-0 relative">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={playNext}
        className="hidden"
      />

      {/* Header (Speaker Mesh Look) */}
      <div className="flex items-center justify-between bg-gray-900 p-2 border-2 border-gray-600 mb-2">
        <div className="flex items-center gap-2">
           <Volume2 size={16} className="text-red-500" />
           <span className="font-pixel text-xs text-gray-300 tracking-wide">RADIO-88</span>
        </div>
        
        {isAnnouncing && (
            <span className="text-[10px] text-yellow-300 font-pixel animate-pulse bg-red-600 px-1">
               LIVE
            </span>
        )}
      </div>

      {/* LCD Display */}
      <div className="bg-green-900 p-2 mb-2 border-inset border-4 border-gray-700 h-12 flex items-center justify-center overflow-hidden">
        {isAnnouncing ? (
            <span className="text-green-300 font-mono text-sm animate-pulse">{announcementText}</span>
        ) : playlist.length > 0 ? (
            <div className="w-full text-center">
                <span className="font-pixel text-xs text-green-300 whitespace-nowrap scroll-text">{playlist[currentTrackIndex].name.substring(0, 20)}</span>
            </div>
        ) : (
            <span className="text-green-800 font-pixel text-xs">NO TAPE</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <label className="cursor-pointer bg-gray-300 hover:bg-white p-2 border-2 border-black retro-btn text-xs flex items-center justify-center w-full" title="Carregar">
          <Upload size={14} className="text-black" />
          <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
        </label>

        <button 
            onClick={togglePlay}
            disabled={playlist.length === 0}
            className={`w-full p-2 border-2 border-black retro-btn flex justify-center ${isPlaying ? 'bg-yellow-400' : 'bg-green-500'}`}
        >
            {isPlaying ? <Pause size={14} className="text-black" /> : <Play size={14} className="text-black" />}
        </button>

        <button 
            onClick={playNext}
            disabled={playlist.length === 0}
            className="w-full p-2 bg-gray-300 hover:bg-white border-2 border-black retro-btn flex justify-center"
        >
            <SkipForward size={14} className="text-black" />
        </button>

        <button 
            onClick={() => setShowPlaylist(!showPlaylist)}
            disabled={playlist.length === 0}
            className={`w-full p-2 border-2 border-black retro-btn flex justify-center ${showPlaylist ? 'bg-blue-400' : 'bg-gray-300'}`}
        >
            <ListMusic size={14} className="text-black" />
        </button>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2 px-1">
         <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="text-gray-400 hover:text-white">
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
         </button>
         <input 
           type="range" 
           min="0" 
           max="1" 
           step="0.05" 
           value={volume} 
           onChange={(e) => setVolume(parseFloat(e.target.value))}
           className="w-full h-2 bg-gray-700 appearance-none cursor-pointer border border-gray-600"
         />
      </div>

      {/* Playlist Overlay (Cassette Case) */}
      {showPlaylist && playlist.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 bg-gray-100 border-4 border-black z-50 max-h-48 overflow-y-auto font-mono">
              <div className="p-1 border-b-2 border-black flex justify-between items-center bg-gray-300 sticky top-0">
                  <span className="text-[10px] font-bold px-1">TRACKS ({playlist.length})</span>
                  <button onClick={() => setShowPlaylist(false)}><X size={12} /></button>
              </div>
              <ul className="divide-y divide-gray-400">
                  {playlist.map((file, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => selectTrack(idx)}
                        className={`p-2 text-[10px] cursor-pointer hover:bg-blue-100 flex items-center gap-2 ${idx === currentTrackIndex ? 'bg-blue-200 font-bold' : ''}`}
                      >
                          <span>{idx + 1}.</span>
                          <span className="truncate">{file.name}</span>
                      </li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );
};