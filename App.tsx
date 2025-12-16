import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShoppingBasket, 
  Users, 
  TrendingUp, 
  Trophy, 
  Volume2, 
  VolumeX,
  Briefcase,
  Save,
  LogOut,
  ArrowUpCircle,
  Zap,
  Lock,
  User,
  ShieldAlert,
  Globe,
  AlertTriangle,
  Play,
  Gem,
  Clock,
  Coins,
  MessageSquare,
  Send,
  Palette
} from 'lucide-react';
import { INITIAL_PRODUCTS, AVAILABLE_STAFF, UPGRADES, FUNNY_QUOTES } from './constants';
import { GameState, Tab, TITLES, Product, LeaderboardEntry, ChatMessage } from './types';
import { formatMoney, formatTime, playSound, generateSaveHash, verifySaveHash, filterProfanity } from './services/utils';
import { FloatingText } from './components/FloatingText';
import { RadioSystem } from './components/RadioSystem';

// Initial State
const INITIAL_STATE: GameState = {
  money: 0,
  lifetimeEarnings: 0,
  startTime: Date.now(),
  lastSaveTime: Date.now(),
  productLevels: { balas: 1 }, // Start with Candy
  hiredStaff: {},
  purchasedUpgrades: {},
  
  // New Features Defaults
  credits: 0,
  playTime: 0,
  creditMultiplier: 1,
  chatColor: '#000000', // Default Black

  prestigeLevel: 0,
  prestigeMultiplier: 1,
  soundEnabled: true,
};

type BuyAmount = 1 | 10 | 25 | 50 | 100 | 'MAX';
type AuthMode = 'login' | 'register';
type RankingMode = 'MONEY' | 'TIME';

const PRESTIGE_BONUS_PER_LEVEL = 0.25; // 25% per level
const RANKING_UPDATE_MS = 60 * 1000; // 1 Minute

// Chat Colors Palette
const CHAT_COLORS = [
    '#000000', // Black
    '#1d4ed8', // Blue
    '#dc2626', // Red
    '#15803d', // Green
    '#7e22ce', // Purple
    '#c2410c', // Orange
    '#be185d', // Pink
];

// Fake data for leaderboard initialization
const INITIAL_BOTS: LeaderboardEntry[] = [
  { username: "MasterMarket", prestigeLevel: 8, lifetimeEarnings: 500000000000, title: TITLES[8].name, playTime: 36000 },
  { username: "SandraCaixa", prestigeLevel: 5, lifetimeEarnings: 45000000, title: TITLES[5].name, playTime: 12000 },
  { username: "SrBarriga", prestigeLevel: 7, lifetimeEarnings: 12000000000, title: TITLES[7].name, playTime: 86000 },
  { username: "RepositorFlash", prestigeLevel: 2, lifetimeEarnings: 50000, title: TITLES[2].name, playTime: 500 },
];

export default function App() {
  // Auth State
  const [username, setUsername] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Game State
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PRODUCTS);
  const [clicks, setClicks] = useState<{id: number, x: number, y: number, value: number}[]>([]);
  const [quote, setQuote] = useState(FUNNY_QUOTES[0]);
  const [offlineEarnings, setOfflineEarnings] = useState<number | null>(null);
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
  const [rankingMode, setRankingMode] = useState<RankingMode>('MONEY');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [cheaterDetected, setCheaterDetected] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Refs for loop
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const usernameRef = useRef(username);
  usernameRef.current = username;

  const isAdmin = username?.toLowerCase() === 'klone177';

  // --- Initialization & Global Data ---

  // Load Initial Leaderboards (Legacy support handled in Update)
  useEffect(() => {
    if (!localStorage.getItem('leonardo_rank_money')) {
        localStorage.setItem('leonardo_rank_money', JSON.stringify(INITIAL_BOTS));
    }
    
    // Load Chat
    const storedChat = localStorage.getItem('leonardo_global_chat');
    if (storedChat) {
        setChatMessages(JSON.parse(storedChat));
    } else {
        const welcomeMsg: ChatMessage = {
            id: 'init-1',
            username: 'SYSTEM',
            title: 'BOT',
            text: 'Bem-vindo ao Chat Global! Respeite as regras.',
            color: '#dc2626',
            timestamp: Date.now(),
            isSystem: true
        };
        setChatMessages([welcomeMsg]);
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
     if (activeTab === Tab.CHAT) {
         chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }
  }, [chatMessages, activeTab]);

  // Update Ranking every 1 Minute
  useEffect(() => {
    if (!username || cheaterDetected) return;

    const updateRank = () => {
        if (usernameRef.current && !cheaterDetected) {
            updateGlobalLeaderboards(usernameRef.current, stateRef.current);
            refreshLocalLeaderboard(rankingMode);
        }
    };
    
    // Simulate Chat Activity (Bots)
    const chatBotInterval = setInterval(() => {
        if (Math.random() < 0.2) { // 20% chance every check
             const bots = ["MasterMarket", "SandraCaixa", "SrBarriga", "RepositorFlash"];
             const msgs = ["Alguem sabe como upa rapido?", "Acabei de virar Gerente!", "Opa, tudo bom?", "Esse jogo é viciante kkk", "Comprei o upgrade do tênis, muito bom."];
             const randomBot = bots[Math.floor(Math.random() * bots.length)];
             const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
             
             // Bots always use Dark Yellow
             addChatMessage(randomBot, "BOT", randomMsg, '#b45309');
        }
    }, 15000);

    // Initial update
    refreshLocalLeaderboard(rankingMode);

    const interval = setInterval(updateRank, RANKING_UPDATE_MS);
    return () => {
        clearInterval(interval);
        clearInterval(chatBotInterval);
    };
  }, [username, cheaterDetected, rankingMode]);

  const refreshLocalLeaderboard = (mode: RankingMode) => {
      const key = mode === 'MONEY' ? 'leonardo_rank_money' : 'leonardo_rank_time';
      const stored = localStorage.getItem(key);
      if (stored) {
          try {
              setLeaderboard(JSON.parse(stored));
          } catch(e) { setLeaderboard(INITIAL_BOTS); }
      } else {
          setLeaderboard(INITIAL_BOTS);
      }
  }

  const updateGlobalLeaderboards = (user: string, state: GameState) => {
    // 1. Update Money Ranking
    const moneyStr = localStorage.getItem('leonardo_rank_money');
    let moneyList: LeaderboardEntry[] = moneyStr ? JSON.parse(moneyStr) : [...INITIAL_BOTS];
    
    // Create Entry
    const titleIndex = Math.min(state.prestigeLevel, TITLES.length - 1);
    const entry: LeaderboardEntry = {
        username: user,
        prestigeLevel: state.prestigeLevel,
        lifetimeEarnings: state.lifetimeEarnings,
        playTime: state.playTime,
        title: TITLES[titleIndex].name
    };

    // Update Money List
    moneyList = moneyList.filter(u => u.username !== user);
    moneyList.push(entry);
    moneyList.sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings); // Pure Money Sort
    localStorage.setItem('leonardo_rank_money', JSON.stringify(moneyList.slice(0, 50)));

    // 2. Update Time Ranking
    const timeStr = localStorage.getItem('leonardo_rank_time');
    let timeList: LeaderboardEntry[] = timeStr ? JSON.parse(timeStr) : [...INITIAL_BOTS];
    
    timeList = timeList.filter(u => u.username !== user);
    timeList.push(entry);
    timeList.sort((a, b) => b.playTime - a.playTime); // Pure Time Sort
    localStorage.setItem('leonardo_rank_time', JSON.stringify(timeList.slice(0, 50)));
  };

  const checkUserExists = (user: string): boolean => {
    const list = localStorage.getItem('leonardo_rank_money');
    if (!list) return false;
    const entries: LeaderboardEntry[] = JSON.parse(list);
    return entries.some(u => u.username.toLowerCase() === user.toLowerCase());
  };

  // --- CHAT LOGIC ---
  const addChatMessage = (user: string, title: string, text: string, color?: string) => {
      const newMsg: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(),
          username: user,
          title: title,
          text: filterProfanity(text),
          color: color || '#000000',
          timestamp: Date.now()
      };
      
      setChatMessages(prev => {
          const updated = [...prev, newMsg].slice(-50); // Keep last 50
          localStorage.setItem('leonardo_global_chat', JSON.stringify(updated));
          return updated;
      });
      
      // Only play sound if chat is open or not local user
      if (user !== usernameRef.current) {
         playSound('message', stateRef.current.soundEnabled);
      }
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || !username) return;
      
      const currentTitle = TITLES[Math.min(gameState.prestigeLevel, TITLES.length - 1)].name;
      // Use User's Selected Color
      addChatMessage(username, currentTitle, chatInput, gameState.chatColor);
      setChatInput('');
  };

  const changeChatColor = (color: string) => {
      setGameState(prev => ({
          ...prev,
          chatColor: color
      }));
  };

  // --- Calculations ---

  const calculateBulkCost = useCallback((product: Product, currentLevel: number, amount: BuyAmount, currentMoney: number) => {
    const b = product.baseCost;
    const r = product.costMultiplier;
    
    if (amount === 'MAX') {
      const priceForNext = b * Math.pow(r, currentLevel);
      if (currentMoney < priceForNext) return { count: 0, cost: 0 };

      const numerator = currentMoney * (r - 1);
      const denominator = b * Math.pow(r, currentLevel);
      const maxK = Math.floor(Math.log(numerator / denominator + 1) / Math.log(r));
      
      const realCost = Math.floor(b * Math.pow(r, currentLevel) * (Math.pow(r, maxK) - 1) / (r - 1));
      return { count: maxK, cost: realCost };
    } else {
      const k = amount;
      const cost = Math.floor(b * Math.pow(r, currentLevel) * (Math.pow(r, k) - 1) / (r - 1));
      return { count: k, cost: cost };
    }
  }, []);

  const calculateProductIncome = useCallback((productId: string, level: number) => {
    const product = INITIAL_PRODUCTS.find(p => p.id === productId);
    if (!product || level === 0) return 0;

    let income = product.baseRevenue * level;

    // --- MILESTONE BONUS: x2 every 25 levels ---
    const milestones = Math.floor(level / 25);
    if (milestones > 0) {
      income *= Math.pow(2, milestones);
    }

    // Staff Multipliers
    AVAILABLE_STAFF.forEach(staff => {
      if (gameState.hiredStaff[staff.id]) {
        if (staff.affectsId === productId) income *= staff.multiplier;
        if (staff.affectsId === 'global') income *= staff.multiplier;
      }
    });

    // Upgrade Multipliers
    if (productId === 'agua' && gameState.purchasedUpgrades['leitor']) income *= 2;
    if (productId === 'balas' && gameState.purchasedUpgrades['leitor']) income *= 2;
    if (productId === 'padaria' && gameState.purchasedUpgrades['forno']) income *= 3;
    if (productId === 'hortifruti' && gameState.purchasedUpgrades['caminhao']) income *= 3;
    
    // Global Upgrades
    if (gameState.purchasedUpgrades['ar']) income *= 1.2;

    // Prestige Multiplier
    income *= gameState.prestigeMultiplier;

    // Credit VIP Multiplier
    income *= (gameState.creditMultiplier || 1);

    return income;
  }, [gameState.hiredStaff, gameState.purchasedUpgrades, gameState.prestigeMultiplier, gameState.creditMultiplier]);

  const calculateTotalEPS = useCallback(() => {
    let total = 0;
    Object.entries(gameState.productLevels).forEach(([id, level]) => {
      total += calculateProductIncome(id, level);
    });
    return total;
  }, [gameState.productLevels, calculateProductIncome]);

  const calculateClickPower = useCallback(() => {
    let power = 1;
    power += calculateTotalEPS() * 0.05; 
    if (gameState.purchasedUpgrades['tenis']) power *= 2;
    power *= gameState.prestigeMultiplier;
    power *= (gameState.creditMultiplier || 1);
    return Math.max(1, power);
  }, [calculateTotalEPS, gameState.purchasedUpgrades, gameState.prestigeMultiplier, gameState.creditMultiplier]);

  // --- Auth Logic ---

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    if (!loginInput.trim() || !passwordInput.trim()) {
        setLoginError("PREENCHA TUDO.");
        return;
    }
    
    const user = loginInput.trim();
    const pass = passwordInput.trim();
    
    // Check key
    const storedPass = localStorage.getItem(`leonardo_auth_${user}`);

    if (authMode === 'login') {
        // LOGIN MODE
        if (!storedPass) {
            setLoginError("USUARIO NAO ENCONTRADO.");
            return;
        }
        if (storedPass !== pass) {
            setLoginError("SENHA INCORRETA.");
            return;
        }
        // Success Login
        loadUser(user);
    } else {
        // REGISTER MODE
        if (storedPass) {
            setLoginError("USUARIO JA EXISTE.");
            return;
        }
        // DOUBLE CHECK: Check global registry just in case
        if (checkUserExists(user)) {
            setLoginError("NOME JA USADO NO RANKING.");
            return;
        }

        try {
            localStorage.setItem(`leonardo_auth_${user}`, pass);
            // Register initial stats to global leaderboard
            updateGlobalLeaderboards(user, INITIAL_STATE);
            
            setLoginSuccess("CONTA CRIADA! ENTRE AGORA.");
            setAuthMode('login'); // Switch to login tab
        } catch (err) {
            setLoginError("ERRO DE STORAGE.");
        }
    }
  };

  const loadUser = (user: string) => {
    setUsername(user);
    const saved = localStorage.getItem(`leonardo_save_${user}`);
    
    if (saved) {
      try {
        const parsedWrapper = JSON.parse(saved);
        
        let finalState = INITIAL_STATE;

        // Check if it's the new secure format { data: ..., hash: ... }
        if (parsedWrapper.data && parsedWrapper.hash) {
            const isValid = verifySaveHash(parsedWrapper.data, parsedWrapper.hash);
            if (!isValid) {
                alert("ERRO DE SEGURANÇA:\n\nDetectamos alterações manuais no seu arquivo de save.\nPara garantir a justiça do Ranking Global, seu progresso foi resetado.");
                setCheaterDetected(true);
            } else {
                // Merge to ensure new fields (credits, playTime) are initialized
                finalState = { ...INITIAL_STATE, ...parsedWrapper.data };
            }
        } 
        else if (parsedWrapper.money !== undefined) {
             finalState = { ...INITIAL_STATE, ...parsedWrapper };
        }

        setGameState(finalState);
        if (!cheaterDetected) checkOfflineEarnings(finalState);

      } catch (err) {
        setGameState(INITIAL_STATE);
      }
    } else {
      setGameState({ ...INITIAL_STATE, startTime: Date.now() });
      updateGlobalLeaderboards(user, INITIAL_STATE);
    }
    
    refreshLocalLeaderboard(rankingMode);
  };

  const checkOfflineEarnings = (parsed: GameState) => {
    const now = Date.now();
    const secondsOffline = (now - parsed.lastSaveTime) / 1000;
    
    if (secondsOffline < 10) return;

    let offlineTotal = 0;
    // Rough calc based on state
    Object.entries(parsed.productLevels).forEach(([id, level]) => {
       const product = INITIAL_PRODUCTS.find(p => p.id === id);
       if (product && level > 0) {
          let inc = product.baseRevenue * level * Math.pow(2, Math.floor(level/25));
          inc *= parsed.prestigeMultiplier;
          inc *= (parsed.creditMultiplier || 1);
          offlineTotal += inc;
       }
    });

    // Add multipliers roughly
    AVAILABLE_STAFF.forEach(staff => {
        if (parsed.hiredStaff[staff.id]) offlineTotal *= staff.multiplier;
    });

    if (offlineTotal > 0) {
       const earned = secondsOffline * offlineTotal;
       setOfflineEarnings(earned);
       setGameState(prev => ({
         ...prev,
         money: prev.money + earned,
         lifetimeEarnings: prev.lifetimeEarnings + earned,
         lastSaveTime: now
       }));
    }
  };

  const handleLogout = () => {
    saveGame();
    setUsername(null);
    setLoginInput('');
    setPasswordInput('');
    setLoginError(null);
    setGameState(INITIAL_STATE);
    setCheaterDetected(false);
  };

  const saveGame = () => {
    if (!usernameRef.current || cheaterDetected) return; // Don't save if cheater detected

    const toSave = { ...stateRef.current, lastSaveTime: Date.now() };
    
    // --- SECURITY SIGNING ---
    const hash = generateSaveHash(toSave);
    const securePackage = {
        data: toSave,
        hash: hash
    };
    // ------------------------

    localStorage.setItem(`leonardo_save_${usernameRef.current}`, JSON.stringify(securePackage));
    localStorage.setItem('leonardo_last_user', usernameRef.current);
  };

  useEffect(() => {
    const lastUser = localStorage.getItem('leonardo_last_user');
    if (lastUser && !username) setLoginInput(lastUser);
  }, []);

  // --- Game Loop ---

  useEffect(() => {
    if (!username || cheaterDetected) return;

    const interval = setInterval(() => {
      // --- SANITY CHECK (Anti-Cheat Runtime) ---
      if (gameState.money === Infinity || isNaN(gameState.money) || gameState.money < 0) {
          setCheaterDetected(true);
          setGameState(INITIAL_STATE); // Soft reset in memory
          return;
      }

      // Time Logic
      const newPlayTime = (gameState.playTime || 0) + 1;
      let newCredits = gameState.credits || 0;
      let soundToPlay = null;

      // Award Credit every 5 mins (300 seconds)
      if (newPlayTime > 0 && newPlayTime % 300 === 0) {
          newCredits += 1;
          soundToPlay = 'coin';
      }

      const eps = calculateTotalEPS();
      setGameState(prev => ({
        ...prev,
        money: prev.money + eps,
        lifetimeEarnings: prev.lifetimeEarnings + eps,
        lastSaveTime: Date.now(),
        playTime: newPlayTime,
        credits: newCredits
      }));

      if (soundToPlay) playSound('coin', gameState.soundEnabled);

      if (Math.random() < 0.05) setQuote(FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]);
    }, 1000);

    const saveInterval = setInterval(saveGame, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
    };
  }, [calculateTotalEPS, username, cheaterDetected, gameState.money, gameState.playTime]);

  // --- Actions ---

  const handleWorkClick = (e: React.MouseEvent) => {
    if (cheaterDetected) return;
    const power = calculateClickPower();
    playSound('click', gameState.soundEnabled);
    setGameState(prev => ({
      ...prev,
      money: prev.money + power,
      lifetimeEarnings: prev.lifetimeEarnings + power
    }));
    setClicks(prev => [...prev, { id: Date.now(), x: e.clientX, y: e.clientY, value: power }]);
  };

  const buyProduct = (product: Product) => {
    if (cheaterDetected) return;
    const currentLevel = gameState.productLevels[product.id] || 0;
    const { count, cost } = calculateBulkCost(product, currentLevel, buyAmount, gameState.money);
    if (count > 0 && gameState.money >= cost) {
      playSound('buy', gameState.soundEnabled);
      setGameState(prev => ({
        ...prev,
        money: prev.money - cost,
        productLevels: { ...prev.productLevels, [product.id]: currentLevel + count }
      }));
    }
  };

  const unlockProduct = (product: Product) => {
    if (cheaterDetected) return;
    if (gameState.money >= product.unlockCost) {
      playSound('upgrade', gameState.soundEnabled);
      setGameState(prev => ({
        ...prev,
        money: prev.money - product.unlockCost,
        productLevels: { ...prev.productLevels, [product.id]: 1 }
      }));
    }
  }

  const hireStaff = (staff: typeof AVAILABLE_STAFF[0]) => {
    if (cheaterDetected) return;
    if (gameState.money >= staff.baseCost && !gameState.hiredStaff[staff.id]) {
      playSound('upgrade', gameState.soundEnabled);
      setGameState(prev => ({
        ...prev,
        money: prev.money - staff.baseCost,
        hiredStaff: { ...prev.hiredStaff, [staff.id]: true }
      }));
    }
  };

  const buyUpgrade = (upgrade: typeof UPGRADES[0]) => {
    if (cheaterDetected) return;
    if (gameState.money >= upgrade.cost && !gameState.purchasedUpgrades[upgrade.id]) {
      playSound('upgrade', gameState.soundEnabled);
      setGameState(prev => ({
        ...prev,
        money: prev.money - upgrade.cost,
        purchasedUpgrades: { ...prev.purchasedUpgrades, [upgrade.id]: true }
      }));
    }
  };

  const buyCreditItem = () => {
      if (cheaterDetected) return;
      const cost = 10;
      if (gameState.credits >= cost) {
          playSound('coin', gameState.soundEnabled);
          setGameState(prev => ({
              ...prev,
              credits: prev.credits - cost,
              creditMultiplier: (prev.creditMultiplier || 1) * 2
          }));
      }
  };

  const handlePrestigeClick = () => {
      if (cheaterDetected) return;
      setShowPrestigeModal(true);
  };

  const confirmPrestige = () => {
    const nextIndex = gameState.prestigeLevel + 1;
    // Check if next title exists and if we can afford it
    if (nextIndex >= TITLES.length) return;
    const nextTitleCost = TITLES[nextIndex].cost;

    if (gameState.lifetimeEarnings < nextTitleCost) return;
    
    // New Calculation: 25% (0.25) per Prestige Level
    const newMultiplier = 1 + (nextIndex * PRESTIGE_BONUS_PER_LEVEL);

    // Manually construct new state to ensure deep reset
    const newState: GameState = {
        money: 0,
        lifetimeEarnings: 0,
        startTime: Date.now(),
        lastSaveTime: Date.now(),
        productLevels: { balas: 1 }, // Explicit reset
        hiredStaff: {}, // Explicit reset
        purchasedUpgrades: {}, // Explicit reset
        prestigeLevel: nextIndex,
        prestigeMultiplier: newMultiplier,
        
        // Preserve Credit Stats
        credits: gameState.credits,
        playTime: gameState.playTime,
        creditMultiplier: gameState.creditMultiplier,
        chatColor: gameState.chatColor, // Preserve Chat Color
        
        soundEnabled: gameState.soundEnabled
    };

    setGameState(newState);
    playSound('upgrade', gameState.soundEnabled);
    if (usernameRef.current) {
        // Use manual save to ensure signature is applied immediately
        const hash = generateSaveHash(newState);
        localStorage.setItem(`leonardo_save_${usernameRef.current}`, JSON.stringify({ data: newState, hash }));
        updateGlobalLeaderboards(usernameRef.current, newState);
    }
    setShowPrestigeModal(false);
  };

  const toggleSound = () => setGameState(prev => ({...prev, soundEnabled: !prev.soundEnabled}));

  // --- Admin Logic ---

  const adminAddMoney = (amount: number) => {
    setGameState(prev => ({...prev, money: prev.money + amount}));
  };
  
  const adminAddCredits = (amount: number) => {
    setGameState(prev => ({...prev, credits: (prev.credits || 0) + amount}));
  };

  // --- Helpers for Render ---
  const currentTitle = TITLES[Math.min(gameState.prestigeLevel, TITLES.length - 1)].name;
  const nextLevelIndex = gameState.prestigeLevel + 1;
  const nextTitleInfo = nextLevelIndex < TITLES.length ? TITLES[nextLevelIndex] : null;
  const eps = calculateTotalEPS();

  // --- VISUAL RENDER START ---
  
  // Adjusted for Mobile Compactness
  const containerClass = "min-h-screen bg-indigo-800 flex items-center justify-center p-0 md:p-6 pattern-dots overflow-hidden";
  const boxClass = "bg-white w-full max-w-6xl retro-border shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] z-10 relative flex flex-col h-screen md:h-[85vh] rounded-none md:rounded-lg";
  const headerClass = "bg-yellow-400 p-2 md:p-4 border-b-4 border-black relative flex flex-wrap justify-between items-center gap-2";

  // --- AUTH SCREEN ---
  if (!username) {
    return (
      <div className={containerClass}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50 pointer-events-none"></div>

        <div className="bg-white max-w-md w-full retro-border shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] z-10 relative overflow-hidden m-4">
           
           <div className="bg-yellow-400 p-6 text-center border-b-4 border-black relative">
              <div className="text-6xl mb-2 animate-bounce filter drop-shadow-md cursor-default hover:scale-110 transition-transform">👾</div>
              <h1 className="text-2xl font-pixel text-blue-800 leading-tight drop-shadow-sm stroke-white tracking-tighter">
                 LEONARDO DO ABC
              </h1>
              <div className="inline-block bg-red-500 text-white text-[10px] font-pixel px-2 py-1 mt-2 border-2 border-black transform -rotate-2">
                8-BIT TYCOON
              </div>
           </div>

           <div className="p-8 bg-white">
               <div className="flex mb-8 border-4 border-black p-1 bg-gray-100">
                  <button 
                    onClick={() => { setAuthMode('login'); setLoginError(null); setLoginSuccess(null); }}
                    className={`flex-1 py-2 font-bold text-sm font-pixel transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                  >
                    LOGIN
                  </button>
                  <button 
                    onClick={() => { setAuthMode('register'); setLoginError(null); setLoginSuccess(null); }}
                    className={`flex-1 py-2 font-bold text-sm font-pixel transition ${authMode === 'register' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                  >
                    REGISTRO
                  </button>
               </div>

               <form onSubmit={handleAuth} className="space-y-6">
                 <div>
                   <label className="block text-xs font-bold text-black mb-2 font-pixel">
                      <span className="bg-blue-100 px-2 py-1 border-2 border-black">JOGADOR</span>
                   </label>
                   <div className="relative">
                     <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-200 border-r-4 border-black flex items-center justify-center">
                        <User className="text-black" size={24} />
                     </div>
                     <input 
                       type="text" 
                       value={loginInput}
                       onChange={(e) => setLoginInput(e.target.value)}
                       className="w-full pl-16 pr-4 py-4 bg-white border-4 border-black focus:bg-blue-50 focus:outline-none font-pixel text-lg text-black placeholder-gray-400 uppercase"
                       placeholder="USUARIO..."
                     />
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-black mb-2 font-pixel">
                      <span className="bg-purple-100 px-2 py-1 border-2 border-black">SENHA</span>
                   </label>
                   <div className="relative">
                     <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-200 border-r-4 border-black flex items-center justify-center">
                        <Lock className="text-purple-600" size={24} />
                     </div>
                     <input 
                       type="password" 
                       value={passwordInput}
                       onChange={(e) => setPasswordInput(e.target.value)}
                       className="w-full pl-16 pr-4 py-4 bg-white border-4 border-black focus:bg-purple-50 focus:outline-none font-pixel text-lg text-purple-600 placeholder-gray-400"
                       placeholder="****"
                     />
                   </div>
                 </div>

                 {loginError && (
                    <div className="p-3 bg-red-100 text-red-600 text-xs border-4 border-red-500 font-pixel text-center">
                       ⚠️ {loginError}
                    </div>
                 )}
                 {loginSuccess && (
                    <div className="p-3 bg-green-100 text-green-600 text-xs border-4 border-green-500 font-pixel text-center">
                       ✅ {loginSuccess}
                    </div>
                 )}

                 <button type="submit" className={`w-full text-white font-pixel py-4 retro-border active:translate-y-1 active:shadow-none transition-transform hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${authMode === 'login' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-500 hover:bg-green-400'}`}>
                    {authMode === 'login' ? '▶ INICIAR' : '▶ CRIAR'}
                 </button>
               </form>
           </div>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN ---
  return (
    <div className={containerClass}>
      
      {cheaterDetected && (
          <div className="fixed inset-0 z-[100] bg-red-900 flex items-center justify-center p-8 text-white text-center font-pixel">
              <div className="retro-border bg-black p-8">
                  <AlertTriangle size={80} className="mx-auto mb-4 text-yellow-400 animate-pulse" />
                  <h1 className="text-2xl mb-4 text-red-500">HACK DETECTADO</h1>
                  <button onClick={handleLogout} className="bg-white text-red-900 px-6 py-4 retro-border hover:bg-gray-200 uppercase">Reiniciar</button>
              </div>
          </div>
      )}

      {clicks.map(click => <FloatingText key={click.id} x={click.x} y={click.y} value={click.value} onComplete={() => setClicks(p => p.filter(c => c.id !== click.id))} />)}

      {offlineEarnings && !cheaterDetected && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white retro-border p-6 max-w-sm w-full text-center">
            <h2 className="text-xl font-pixel text-blue-700 mb-4">VOCE VOLTOU!</h2>
            <div className="text-4xl font-pixel text-green-600 mb-6">${formatMoney(offlineEarnings)}</div>
            <button onClick={() => setOfflineEarnings(null)} className="w-full bg-green-500 hover:bg-green-400 text-white font-pixel py-3 retro-border retro-btn">COLETAR</button>
          </div>
        </div>
      )}

      {showPrestigeModal && nextTitleInfo && (
         <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white retro-border max-w-md w-full">
                <div className="bg-blue-800 p-6 text-white text-center border-b-4 border-black">
                    <h2 className="text-xl font-pixel mt-2 text-yellow-300">PROMOÇÃO DISPONIVEL!</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-yellow-100 border-4 border-yellow-600 p-4 text-sm text-yellow-900 font-bold">
                        <span className="font-pixel block mb-2 text-red-600">! ATENÇÃO: RESET !</span>
                        Ao aceitar o cargo de <span className="text-black font-bold">{nextTitleInfo.name}</span>, você reseta seu dinheiro e produtos.
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setShowPrestigeModal(false)} className="flex-1 py-4 bg-red-500 text-white font-pixel retro-border retro-btn text-xs">CANCELAR</button>
                        <button onClick={confirmPrestige} className="flex-1 py-4 bg-green-500 text-white font-pixel retro-border retro-btn text-xs">ACEITAR</button>
                    </div>
                </div>
            </div>
         </div>
      )}

      <div className={boxClass}>
        {/* HEADER */}
        <header className={headerClass}>
            <div className="flex flex-col z-10 w-full md:w-auto">
                <div className="flex justify-between items-center w-full md:justify-start gap-2">
                    <h1 className="text-sm md:text-xl font-pixel text-blue-800 drop-shadow-sm stroke-white truncate">LEONARDO TYCOON</h1>
                    <div className="md:hidden flex gap-2">
                        <div className="bg-indigo-900 text-white px-2 py-1 border-2 border-black flex items-center gap-1">
                            <Gem size={10} className="text-cyan-400" />
                            <span className="font-pixel text-xs text-cyan-300">{gameState.credits}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] md:text-xs font-mono font-bold bg-white border-2 border-black px-2 text-black truncate max-w-[100px]">
                        {username}
                    </span>
                    <span className="text-[10px] md:text-xs font-pixel text-white bg-blue-600 border-2 border-black px-2">
                        {currentTitle}
                    </span>
                    {isAdmin && <span className="text-[10px] bg-red-500 text-white border-2 border-black px-1 font-pixel">GM</span>}
                </div>
            </div>

            {/* Global Stats Bar */}
            <div className="flex items-center gap-1 md:gap-2 md:ml-auto z-10 w-full md:w-auto justify-between md:justify-end">
                {/* Time */}
                <div className="bg-indigo-900 text-white p-1 md:p-2 border-2 border-black flex items-center gap-2" title="Tempo Online">
                    <Clock size={14} className="text-yellow-400" />
                    <span className="font-mono text-xs md:text-sm">{formatTime(gameState.playTime || 0)}</span>
                </div>

                {/* Credits (Desktop) */}
                <div className="hidden md:flex bg-indigo-900 text-white p-2 border-2 border-black items-center gap-2" title="Créditos VIP">
                    <Gem size={16} className="text-cyan-400" />
                    <span className="font-pixel text-sm text-cyan-300">{gameState.credits || 0}</span>
                </div>

                {/* Money */}
                <div className="bg-black text-green-400 p-1 md:p-2 border-2 border-gray-500 min-w-[100px] md:min-w-[140px] text-right flex-1 md:flex-none">
                    <div className="text-sm md:text-lg font-pixel">${formatMoney(gameState.money)}</div>
                    <div className="text-[9px] md:text-[10px] text-gray-500 font-mono">+${formatMoney(eps)}/s</div>
                </div>
            </div>
        </header>

        {/* TICKER */}
        <div className="bg-black text-yellow-300 py-1 px-4 text-[10px] md:text-sm font-mono border-b-4 border-black overflow-hidden whitespace-nowrap z-0">
            <p className="animate-pulse uppercase">*** {quote} *** | NEXT CREDIT IN: {300 - ((gameState.playTime || 0) % 300)}s</p>
        </div>

        {/* CONTENT AREA - Mobile Compact Mode */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-100 relative">
            
            {/* LEFT: Work & Avatar (Compact on Mobile) */}
            <aside className="w-full md:w-1/3 p-2 md:p-4 bg-gray-200 border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-row md:flex-col items-center gap-2 md:gap-0 shrink-0 h-auto md:h-full overflow-visible md:overflow-y-auto z-20">
                <div className="hidden md:block w-full mb-4">
                    <RadioSystem />
                </div>

                {/* Mobile: Horizontal Layout | Desktop: Vertical */}
                <div className="flex flex-row md:flex-col items-center gap-2 w-full justify-between md:justify-center">
                    
                    {/* Work Button */}
                    <div className="cursor-pointer active:scale-95 transition-transform shrink-0" onClick={handleWorkClick}>
                        <div className="relative w-16 h-16 md:w-40 md:h-40 bg-blue-500 retro-border flex items-center justify-center">
                            <span className="text-2xl md:text-6xl drop-shadow-md grayscale-0">
                            {gameState.prestigeLevel === 0 ? '👷' : gameState.prestigeLevel < 2 ? '👔' : gameState.prestigeLevel < 5 ? '🕴️' : '🦁'}
                            </span>
                            {/* Tap Indicator (Hidden on tiny screens) */}
                            <div className="hidden md:block absolute -bottom-6 bg-white border-2 border-black px-4 py-1">
                                <span className="text-xs font-pixel text-black">CLICK!</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Compact */}
                    <div className="flex flex-col flex-1 gap-1">
                        <div className="bg-white p-1 md:p-4 retro-border text-center w-full shadow-md">
                            <p className="text-gray-500 text-[9px] md:text-xs font-pixel mb-1">PODER DE CLIQUE</p>
                            <p className="text-sm md:text-xl font-pixel text-blue-700 border-t-2 border-black pt-1 md:pt-2">${formatMoney(calculateClickPower())}</p>
                        </div>
                        {/* Mobile Actions */}
                        <div className="flex md:hidden gap-1">
                             <button onClick={() => { saveGame(); alert('SALVO!'); }} className="flex-1 p-1 bg-white border-2 border-black text-[9px] font-pixel">SALVAR</button>
                             <button onClick={handleLogout} className="flex-1 p-1 bg-red-500 text-white border-2 border-black text-[9px] font-pixel">SAIR</button>
                        </div>
                    </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:grid grid-cols-3 gap-2 w-full max-w-xs mt-4">
                    <button onClick={() => { saveGame(); alert('JOGO SALVO!'); }} className="p-2 bg-white hover:bg-gray-100 border-2 border-black retro-btn flex justify-center"><Save size={16} /></button>
                    <button onClick={toggleSound} className="p-2 bg-white hover:bg-gray-100 border-2 border-black retro-btn flex justify-center">{gameState.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
                    <button onClick={handleLogout} className="p-2 bg-red-500 hover:bg-red-400 text-white border-2 border-black retro-btn flex justify-center"><LogOut size={16} /></button>
                </div>
            </aside>

            {/* RIGHT: Main Tabs */}
            <main className="w-full md:w-2/3 flex flex-col h-full overflow-hidden">
                {/* Tab Navigation - Horizontal Scroll */}
                <div className="flex bg-gray-300 border-b-4 border-black overflow-x-auto no-scrollbar p-1 gap-1 shrink-0">
                    {Object.values(Tab).map(tab => {
                        if (tab === Tab.ADMIN && !isAdmin) return null;
                        const isActive = activeTab === tab;
                        let icon = <ShoppingBasket size={14} />;
                        if (tab === Tab.STAFF) icon = <Users size={14} />;
                        if (tab === Tab.UPGRADES) icon = <TrendingUp size={14} />;
                        if (tab === Tab.CREDITS) icon = <Gem size={14} className="text-cyan-600" />;
                        if (tab === Tab.PROFILE) icon = <Trophy size={14} />;
                        if (tab === Tab.RANKING) icon = <Globe size={14} />;
                        if (tab === Tab.CHAT) icon = <MessageSquare size={14} className="text-pink-600" />;
                        if (tab === Tab.ADMIN) icon = <ShieldAlert size={14} className="text-red-500" />;

                        return (
                            <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 md:py-3 px-2 text-[10px] md:text-xs font-pixel flex items-center justify-center gap-1 md:gap-2 border-2 border-black transition min-w-[70px] md:min-w-[80px] ${isActive ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                            >
                            {icon}
                            <span className={tab === Tab.CHAT ? "inline" : "hidden sm:inline"}>{tab}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 bg-gray-100 w-full pb-20 md:pb-4">
                    
                    {/* --- LOJA --- */}
                    {activeTab === Tab.PRODUCTS && (
                        <>
                            <div className="flex justify-center gap-2 flex-wrap mb-4">
                                {[1, 10, 25, 50, 100, 'MAX'].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setBuyAmount(amount as BuyAmount)}
                                    className={`px-3 py-1 text-[10px] font-pixel border-2 border-black ${buyAmount === amount ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
                                >
                                    x{amount}
                                </button>
                                ))}
                            </div>
                            <div className="space-y-2 md:space-y-4">
                                {INITIAL_PRODUCTS.map(product => {
                                    const level = gameState.productLevels[product.id] || 0;
                                    const isUnlocked = level > 0;
                                    const { count, cost } = calculateBulkCost(product, level, buyAmount, gameState.money);
                                    const canAfford = count > 0 && gameState.money >= cost;
                                    const currentIncome = calculateProductIncome(product.id, level);

                                    // Gating
                                    const reqPrestige = product.reqPrestige || 0;
                                    if (gameState.prestigeLevel < reqPrestige) {
                                        return (
                                            <div key={product.id} className="p-2 md:p-4 retro-border bg-gray-300 opacity-60 relative overflow-hidden grayscale">
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
                                                    <Lock size={24} className="text-gray-600 mb-1" />
                                                    <span className="font-pixel text-[10px] text-red-600 bg-white border-2 border-black px-2 py-1">REQ: {TITLES[reqPrestige].name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 blur-sm"><div className="w-12 h-12 bg-white border-2 border-black"></div><div className="h-4 w-32 bg-gray-400"></div></div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div key={product.id} className={`p-2 md:p-4 retro-border relative ${isUnlocked ? 'bg-white' : 'bg-yellow-50'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 md:gap-4">
                                                    <div className="text-2xl md:text-3xl bg-white w-10 h-10 md:w-14 md:h-14 border-2 border-black flex items-center justify-center relative">
                                                        {isUnlocked ? product.icon : '🔒'}
                                                        {isUnlocked && <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] md:text-[10px] px-1 md:px-2 py-0 font-pixel border border-black">{level}</div>}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-pixel text-[10px] md:text-sm ${isUnlocked ? 'text-black' : 'text-gray-600'}`}>{product.name}</h3>
                                                        {isUnlocked && <div className="text-xs md:text-lg text-green-700 font-bold font-mono">+${formatMoney(currentIncome)}/s</div>}
                                                    </div>
                                                </div>

                                                {isUnlocked ? (
                                                    <button onClick={() => buyProduct(product)} disabled={!canAfford} className={`flex flex-col items-center justify-center px-2 md:px-4 py-2 border-2 border-black min-w-[70px] md:min-w-[90px] retro-btn ${canAfford ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-gray-300 text-gray-500'}`}>
                                                        <span className="text-[9px] md:text-[10px] font-pixel mb-1">{buyAmount === 'MAX' ? `+${count}` : `+${buyAmount}`}</span>
                                                        <span className="font-bold text-[10px] md:text-xs font-pixel">${formatMoney(cost)}</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => unlockProduct(product)} disabled={gameState.money < product.unlockCost} className={`px-2 md:px-4 py-2 border-2 border-black font-pixel text-[10px] md:text-xs retro-btn ${gameState.money >= product.unlockCost ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-gray-500 text-gray-300'}`}>
                                                        LIBERAR<br/>${formatMoney(product.unlockCost)}
                                                    </button>
                                                )}
                                            </div>
                                            {isUnlocked && (
                                                <div className="mt-1 md:mt-2 w-full h-2 border-2 border-black bg-gray-200 relative">
                                                    <div className="h-full bg-yellow-400" style={{ width: `${(level % 25) / 25 * 100}%` }}></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* --- EQUIPE --- */}
                    {activeTab === Tab.STAFF && (
                        <div className="space-y-2 md:space-y-4">
                             {AVAILABLE_STAFF.map(staff => {
                                const hired = gameState.hiredStaff[staff.id];
                                const canAfford = gameState.money >= staff.baseCost;
                                return (
                                    <div key={staff.id} className={`p-2 md:p-4 retro-border bg-white relative ${hired ? 'bg-green-100' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <div className="bg-blue-200 border-2 border-black text-blue-800 p-2 h-fit hidden md:block"><Briefcase size={20} /></div>
                                                <div>
                                                    <h3 className="font-pixel text-xs text-black mb-1">{staff.name}</h3>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase">{staff.role}</p>
                                                    <p className="text-xs text-gray-800 mt-2 font-mono">"{staff.description}"</p>
                                                </div>
                                            </div>
                                            {hired ? (
                                                <div className="bg-green-500 border-2 border-black text-white text-[10px] px-2 py-1 font-pixel transform rotate-3">OK</div>
                                            ) : (
                                                <button onClick={() => hireStaff(staff)} disabled={!canAfford} className={`px-2 py-2 border-2 border-black font-pixel text-[10px] retro-btn ${canAfford ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-gray-300 text-gray-500'}`}>${formatMoney(staff.baseCost)}</button>
                                            )}
                                        </div>
                                    </div>
                                );
                             })}
                        </div>
                    )}
                    
                    {/* --- CHAT GLOBAL --- */}
                    {activeTab === Tab.CHAT && (
                        <div className="flex flex-col h-full retro-border bg-white relative">
                            <div className="bg-pink-600 text-white p-2 border-b-2 border-black text-center font-pixel text-xs flex justify-between items-center">
                                <span>CHAT GLOBAL</span>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-[10px]">LIVE</span>
                                </div>
                            </div>
                            
                            {/* Color Selector */}
                            <div className="bg-gray-200 border-b-2 border-black p-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-pixel text-black shrink-0">COR:</span>
                                {CHAT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => changeChatColor(color)}
                                        style={{ backgroundColor: color }}
                                        className={`w-5 h-5 border-2 ${gameState.chatColor === color ? 'border-white ring-2 ring-black scale-110' : 'border-black hover:scale-110'} transition-transform shrink-0`}
                                        title="Mudar cor do texto"
                                    />
                                ))}
                            </div>
                            
                            {/* Message List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 min-h-[300px]">
                                {chatMessages.map((msg) => {
                                    const isMe = msg.username === username;
                                    const isSystem = msg.isSystem;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] border-2 border-black p-2 ${isMe ? 'bg-blue-100' : isSystem ? 'bg-yellow-100' : 'bg-white'}`}>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className={`font-pixel text-[10px] ${isMe ? 'text-blue-700' : 'text-red-700'}`}>{msg.username}</span>
                                                    {!isSystem && <span className="text-[9px] bg-gray-200 border border-gray-400 px-1 text-gray-600 rounded-sm">{msg.title}</span>}
                                                </div>
                                                <p className="font-mono text-xs break-words font-bold" style={{ color: msg.color || '#000000' }}>{msg.text}</p>
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSendMessage} className="p-2 bg-gray-200 border-t-2 border-black flex gap-2">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    maxLength={100}
                                    placeholder="Digite aqui..."
                                    className="flex-1 border-2 border-black p-2 font-mono text-sm focus:outline-none"
                                />
                                <button type="submit" className="bg-blue-600 text-white p-2 border-2 border-black active:translate-y-1">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    )}
                    
                    {/* --- VIP SHOP (CREDITS) --- */}
                    {activeTab === Tab.CREDITS && (
                        <div className="space-y-4">
                            <div className="bg-indigo-900 text-white p-4 retro-border text-center">
                                <h2 className="text-xl font-pixel text-yellow-300 mb-2">LOJA VIP</h2>
                                <p className="text-sm font-mono mb-4">GANHE 1 CRÉDITO A CADA 5 MIN ONLINE.</p>
                                <div className="inline-block bg-black border-2 border-cyan-400 px-4 py-2 text-cyan-400 font-pixel text-lg">
                                    💎 {gameState.credits} CRÉDITOS
                                </div>
                            </div>

                            {/* Item: Multiplier */}
                            <div className="bg-white p-4 retro-border flex flex-col md:flex-row items-center gap-4">
                                <div className="bg-yellow-200 border-2 border-black p-4 hidden md:block">
                                    <Coins size={32} className="text-yellow-700" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="font-pixel text-sm text-black">MULTIPLICADOR DE LUCRO x2</h3>
                                    <p className="text-xs font-mono text-gray-600 mt-1">Dobra TODO o seu lucro permanentemente. Acumula!</p>
                                    <p className="text-xs font-bold text-purple-600 mt-1">Atual: x{(gameState.creditMultiplier || 1)}</p>
                                </div>
                                <button 
                                    onClick={buyCreditItem} 
                                    disabled={gameState.credits < 10}
                                    className={`px-4 py-3 border-2 border-black font-pixel text-xs retro-btn ${gameState.credits >= 10 ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-gray-300 text-gray-500'}`}
                                >
                                    COMPRAR<br/>💎 10
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- RANKING --- */}
                    {activeTab === Tab.RANKING && (
                        <div className="space-y-4">
                            <div className="flex gap-2 justify-center mb-4">
                                <button 
                                    onClick={() => setRankingMode('MONEY')}
                                    className={`px-4 py-2 font-pixel text-[10px] md:text-xs border-2 border-black ${rankingMode === 'MONEY' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'}`}
                                >
                                    MAGNATAS ($$$)
                                </button>
                                <button 
                                    onClick={() => setRankingMode('TIME')}
                                    className={`px-4 py-2 font-pixel text-[10px] md:text-xs border-2 border-black ${rankingMode === 'TIME' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600'}`}
                                >
                                    VICIADOS (TEMPO)
                                </button>
                            </div>

                            <div className="bg-white retro-border p-2 md:p-4">
                                <div className="bg-yellow-300 border-2 border-black p-2 mb-4 text-center font-pixel text-[10px]">
                                    ATUALIZADO A CADA 1 MINUTO
                                </div>
                                <table className="w-full text-left bg-gray-100 border-2 border-black">
                                    <thead className="bg-black text-white font-pixel text-[9px] md:text-[10px]">
                                        <tr>
                                            <th className="px-2 py-3 text-center">#</th>
                                            <th className="px-2 py-3">NOME</th>
                                            <th className="px-2 py-3 text-right">
                                                {rankingMode === 'MONEY' ? 'LUCRO TOTAL' : 'TEMPO ONLINE'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-black font-mono text-xs md:text-sm">
                                        {leaderboard.slice(0, 50).map((player, index) => {
                                            const isMe = player.username === username;
                                            
                                            // Row Background Logic
                                            let rowClass = isMe ? "bg-indigo-100" : "bg-white";
                                            if(index === 0) rowClass = "bg-yellow-200"; 
                                            if(index === 1) rowClass = "bg-gray-200";
                                            if(index === 2) rowClass = "bg-orange-200";

                                            // Name Color Logic based on Mode
                                            let nameColor = "text-black";
                                            if (rankingMode === 'MONEY') nameColor = "text-green-600 drop-shadow-sm";
                                            if (rankingMode === 'TIME') nameColor = "text-blue-600 drop-shadow-sm";

                                            return (
                                                <tr key={index} className={`${rowClass} border-b border-black/20`}>
                                                    <td className="px-2 py-2 text-center font-bold text-gray-600 font-pixel">{index + 1}</td>
                                                    <td className="px-2 py-2">
                                                        <div className={`font-bold uppercase text-[10px] md:text-xs ${nameColor} font-pixel`}>{player.username}</div>
                                                        <div className="text-[9px] text-gray-600 font-bold">{player.title}</div>
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-bold text-black font-mono">
                                                        {rankingMode === 'MONEY' ? `$${formatMoney(player.lifetimeEarnings)}` : formatTime(player.playTime || 0)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- ADMIN --- */}
                    {activeTab === Tab.ADMIN && isAdmin && (
                         <div className="space-y-4">
                            <div className="bg-black text-green-400 p-4 retro-border">
                                <h2 className="font-pixel text-sm mb-4">ADMIN CONSOLE</h2>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => adminAddMoney(100000000)} className="border border-green-500 p-2 text-xs hover:bg-green-900">+ $100M</button>
                                    <button onClick={() => adminAddCredits(100)} className="border border-cyan-500 p-2 text-xs hover:bg-cyan-900 text-cyan-400">+ 100 CREDITS</button>
                                </div>
                            </div>
                         </div>
                    )}
                    
                    {/* Render Upgrades and Profile tabs */}
                    {activeTab === Tab.UPGRADES && (
                        <div className="space-y-4">
                            {UPGRADES.map(upgrade => {
                            const bought = gameState.purchasedUpgrades[upgrade.id];
                            const canAfford = gameState.money >= upgrade.cost;
                            if (upgrade.triggerId && (gameState.productLevels[upgrade.triggerId] || 0) === 0) return null;
                            if (bought) return null;
                            return (
                                <div key={upgrade.id} className="bg-white p-4 retro-border flex justify-between items-center">
                                <div className="flex gap-3 items-center">
                                    <div className="bg-purple-200 border-2 border-black text-purple-800 p-2 hidden md:block"><Zap size={20} /></div>
                                    <div>
                                    <h3 className="font-pixel text-xs text-black">{upgrade.name}</h3>
                                    <p className="text-sm text-gray-600 font-mono">{upgrade.description}</p>
                                    </div>
                                </div>
                                <button onClick={() => buyUpgrade(upgrade)} disabled={!canAfford} className={`px-3 py-2 border-2 border-black font-pixel text-xs retro-btn ${canAfford ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-gray-300 text-gray-500'}`}>${formatMoney(upgrade.cost)}</button>
                                </div>
                            );
                            })}
                        </div>
                    )}

                    {activeTab === Tab.PROFILE && (
                        <div className="space-y-6 text-center">
                            <div className="bg-white p-6 retro-border relative">
                            <h2 className="text-xl font-pixel text-black">{currentTitle}</h2>
                            <p className="text-gray-500 font-mono uppercase">JOGADOR: {username}</p>
                            <div className="border-4 border-black bg-gray-100 p-4 mt-6">
                                <div className="flex justify-between items-center mb-2 border-b-2 border-gray-400 pb-2">
                                    <span className="font-pixel text-xs text-gray-500">TEMPO ONLINE</span>
                                    <span className="font-pixel text-sm text-black">{formatTime(gameState.playTime || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-pixel text-xs text-gray-500">CREDITOS</span>
                                    <span className="font-pixel text-sm text-cyan-600">{gameState.credits}</span>
                                </div>
                            </div>
                            </div>

                            <div className="bg-indigo-900 p-6 retro-border text-white border-4 border-black shadow-xl">
                                <h3 className="text-sm font-pixel mb-4 flex items-center justify-center gap-2 text-yellow-300"><ArrowUpCircle /> PRÓXIMO CARGO</h3>
                                {nextTitleInfo ? (
                                    <>
                                        <p className="text-indigo-200 text-sm font-mono mb-2">ALCANCE: <span className="text-white font-bold">{nextTitleInfo.name}</span></p>
                                        <p className="text-indigo-200 text-xs font-mono mb-4">CUSTO ACUMULADO: ${formatMoney(nextTitleInfo.cost)}</p>
                                        {gameState.lifetimeEarnings >= nextTitleInfo.cost ? (
                                            <button onClick={handlePrestigeClick} className="w-full bg-yellow-400 text-black border-2 border-white font-pixel py-3 hover:bg-yellow-300 retro-btn animate-pulse text-xs">PROMOÇÃO DISPONIVEL!</button>
                                        ) : (
                                            <div className="bg-black border-2 border-gray-600 p-3 font-mono text-sm">
                                            <span className="text-red-500">BLOQUEADO</span><br/>
                                            <div className="w-full bg-gray-800 h-4 border border-gray-600 mt-2">
                                                <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (gameState.lifetimeEarnings / nextTitleInfo.cost) * 100)}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 block">${formatMoney(gameState.lifetimeEarnings)} / ${formatMoney(nextTitleInfo.cost)}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-yellow-400 font-pixel">VOCÊ É UMA LENDA MÁXIMA!</p>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>

        {/* Footer Stripe */}
        <div className="h-4 flex border-t-4 border-black shrink-0">
            <div className="flex-1 bg-red-500 border-r-2 border-black"></div>
            <div className="flex-1 bg-yellow-400 border-r-2 border-black"></div>
            <div className="flex-1 bg-green-500 border-r-2 border-black"></div>
            <div className="flex-1 bg-blue-500"></div>
        </div>
      </div>
    </div>
  );
}