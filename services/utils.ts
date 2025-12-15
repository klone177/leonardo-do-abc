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

export const playSound = (type: 'click' | 'buy' | 'upgrade', enabled: boolean) => {
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
  }
};