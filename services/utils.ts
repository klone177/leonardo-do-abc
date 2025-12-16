// Format numbers like 1.2M, 500k, etc.
export const formatMoney = (amount: number): string => {
  if (amount < 1000) return Math.floor(amount).toString();
  
  const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi"];
  const suffixNum = Math.floor(("" + Math.floor(amount)).length / 3);
  
  let shortValue = parseFloat((suffixNum !== 0 ? (amount / Math.pow(1000, suffixNum)) : amount).toPrecision(3));
  if (shortValue % 1 !== 0) {
    shortValue = parseFloat(shortValue.toFixed(1));
  }
  return shortValue + suffixes[suffixNum];
};

export const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

// --- PROFANITY FILTER ---
const BAD_WORDS = [
  "merda", "bosta", "porra", "caralho", "puta", "puto", "buceta", "pinto", "cú", "cu", 
  "foder", "foda", "caralhos", "vagabunda", "arrombado", "fudido", "fuck", "shit", "ass", 
  "bitch", "piss", "dick", "cock", "pussy", "nigger", "fag", "viado", "gay", "corno" 
  // Adicione mais conforme necessário, lista básica
];

export const filterProfanity = (text: string): string => {
  let filtered = text;
  BAD_WORDS.forEach(word => {
     // Cria um regex case insensitive para a palavra
     const regex = new RegExp(`\\b${word}\\b`, 'gi');
     filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
};

// --- SECURITY SYSTEM ---
const SECRET_SALT = "LEONARDO_ABC_SECURE_KEY_V1_2025_#$@!";

// Simple DJB2-like hash for client-side integrity check
export const generateSaveHash = (data: any): string => {
  const str = JSON.stringify(data) + SECRET_SALT;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to Base64 to make it look like a signature and harder to read
  return btoa(hash.toString() + "SIG");
};

export const verifySaveHash = (data: any, originalHash: string): boolean => {
  const calculated = generateSaveHash(data);
  return calculated === originalHash;
};
// -----------------------

// Simple audio synth
const audioCtx = typeof window !== 'undefined' && window.AudioContext ? new window.AudioContext() : null;

export const playSound = (type: 'click' | 'buy' | 'upgrade' | 'coin' | 'message', enabled: boolean) => {
  if (!enabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'click') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'buy') {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'upgrade') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } else if (type === 'coin') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'message') {
    // Low notification blip
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  }
};