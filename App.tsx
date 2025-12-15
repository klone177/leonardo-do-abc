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
  UserPlus,
  LogIn,
  ShieldAlert,
  Ticket,
  PlusCircle,
  Trash2,
  Globe,
  Medal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { INITIAL_PRODUCTS, AVAILABLE_STAFF, UPGRADES, FUNNY_QUOTES } from './constants';
import { GameState, Tab, TITLES, Product, GameCode, LeaderboardEntry } from './types';
import { formatMoney, playSound, generateSaveHash, verifySaveHash } from './services/utils';
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
  prestigeLevel: 0,
  prestigeMultiplier: 1,
  redeemedCodes: [],
  soundEnabled: true,
};

type BuyAmount = 1 | 10 | 25 | 50 | 100 | 'MAX';
type AuthMode = 'login' | 'register';

const PRESTIGE_BONUS_PER_LEVEL = 0.25; // 25% per level
const CODE_EXPIRATION_MS = 60 * 1000; // 1 Minute
const RANKING_UPDATE_MS = 5 * 60 * 1000; // 5 Minutes

// Fake data for leaderboard initialization
const INITIAL_BOTS: LeaderboardEntry[] = [
  { username: "MasterMarket", prestigeLevel: 8, lifetimeEarnings: 500000000000, title: TITLES[8] },
  { username: "SandraCaixa", prestigeLevel: 5, lifetimeEarnings: 45000000, title: TITLES[5] },
  { username: "SrBarriga", prestigeLevel: 7, lifetimeEarnings: 12000000000, title: TITLES[7] },
  { username: "RepositorFlash", prestigeLevel: 2, lifetimeEarnings: 50000, title: TITLES[2] },
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [cheaterDetected, setCheaterDetected] = useState(false);

  // Code System State
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // Admin State
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeType, setNewCodeType] = useState<'MONEY' | 'MULTIPLIER'>('MONEY');
  const [newCodeValue, setNewCodeValue] = useState(1000);
  const [serverCodes, setServerCodes] = useState<GameCode[]>([]);

  // Refs for loop
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const usernameRef = useRef(username);
  usernameRef.current = username;

  const isAdmin = username?.toLowerCase() === 'klone177';

  // --- Initialization & Global Data ---

  // Load Codes and Initial Leaderboard
  useEffect(() => {
    const storedCodes = localStorage.getItem('leonardo_server_codes');
    if (storedCodes) {
      try {
        setServerCodes(JSON.parse(storedCodes));
      } catch (e) { setServerCodes([]); }
    }

    // Initialize Leaderboard with bots if empty
    const storedLeaderboard = localStorage.getItem('leonardo_global_users');
    if (!storedLeaderboard) {
      localStorage.setItem('leonardo_global_users', JSON.stringify(INITIAL_BOTS));
      setLeaderboard(INITIAL_BOTS);
    } else {
      try {
        setLeaderboard(JSON.parse(storedLeaderboard));
      } catch (e) {
        setLeaderboard(INITIAL_BOTS);
      }
    }
  }, []);

  // Update Ranking every 5 Minutes
  useEffect(() => {
    if (!username || cheaterDetected) return;

    const updateRank = () => {
        if (usernameRef.current && !cheaterDetected) {
            updateGlobalLeaderboard(usernameRef.current, stateRef.current);
            // Also refresh local view
            const storedLeaderboard = localStorage.getItem('leonardo_global_users');
            if (storedLeaderboard) setLeaderboard(JSON.parse(storedLeaderboard));
        }
    };

    // Initial update on login is handled in loadUser, here we set the interval
    const interval = setInterval(updateRank, RANKING_UPDATE_MS);
    return () => clearInterval(interval);
  }, [username, cheaterDetected]);

  // Clean up expired codes from Admin view periodically
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
        setServerCodes(prev => [...prev]); // Force re-render to update timers
    }, 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const saveServerCodes = (codes: GameCode[]) => {
    setServerCodes(codes);
    localStorage.setItem('leonardo_server_codes', JSON.stringify(codes));
  };

  const updateGlobalLeaderboard = (user: string, state: GameState) => {
    const currentListStr = localStorage.getItem('leonardo_global_users');
    let list: LeaderboardEntry[] = currentListStr ? JSON.parse(currentListStr) : [...INITIAL_BOTS];
    
    // Remove existing entry for this user
    list = list.filter(u => u.username !== user);
    
    // Add updated entry
    const titleIndex = Math.min(state.prestigeLevel, TITLES.length - 1);
    list.push({
      username: user,
      prestigeLevel: state.prestigeLevel,
      lifetimeEarnings: state.lifetimeEarnings,
      title: TITLES[titleIndex]
    });

    // Sort: 1. Prestige (Desc), 2. Earnings (Desc)
    list.sort((a, b) => {
      if (b.prestigeLevel !== a.prestigeLevel) return b.prestigeLevel - a.prestigeLevel;
      return b.lifetimeEarnings - a.lifetimeEarnings;
    });

    localStorage.setItem('leonardo_global_users', JSON.stringify(list));
  };

  const checkUserExists = (user: string): boolean => {
    const currentListStr = localStorage.getItem('leonardo_global_users');
    if (!currentListStr) return false;
    const list: LeaderboardEntry[] = JSON.parse(currentListStr);
    return list.some(u => u.username.toLowerCase() === user.toLowerCase());
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
    if (productId === 'arroz' && gameState.purchasedUpgrades['paleteira']) income *= 3;
    
    // Global Upgrades
    if (gameState.purchasedUpgrades['ar']) income *= 1.2;

    // Prestige Multiplier
    income *= gameState.prestigeMultiplier;

    return income;
  }, [gameState.hiredStaff, gameState.purchasedUpgrades, gameState.prestigeMultiplier]);

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
    return Math.max(1, power);
  }, [calculateTotalEPS, gameState.purchasedUpgrades, gameState.prestigeMultiplier]);

  // --- Auth Logic ---

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    if (!loginInput.trim() || !passwordInput.trim()) {
        setLoginError("Preencha todos os campos.");
        return;
    }
    
    const user = loginInput.trim();
    const pass = passwordInput.trim();
    
    // Check key
    const storedPass = localStorage.getItem(`leonardo_auth_${user}`);

    if (authMode === 'login') {
        // LOGIN MODE
        if (!storedPass) {
            setLoginError("Usuário não encontrado. Crie uma conta primeiro.");
            return;
        }
        if (storedPass !== pass) {
            setLoginError("Senha incorreta.");
            return;
        }
        // Success Login
        loadUser(user);
    } else {
        // REGISTER MODE
        if (storedPass) {
            setLoginError("Este nome de usuário já está registrado.");
            return;
        }
        // DOUBLE CHECK: Check global registry just in case
        if (checkUserExists(user)) {
            setLoginError("Este nome de jogador já está em uso no ranking.");
            return;
        }

        try {
            localStorage.setItem(`leonardo_auth_${user}`, pass);
            // Register initial stats to global leaderboard
            updateGlobalLeaderboard(user, INITIAL_STATE);
            
            setLoginSuccess("Conta criada com sucesso! Você pode entrar agora.");
            setAuthMode('login'); // Switch to login tab
        } catch (err) {
            setLoginError("Erro ao salvar conta (Storage cheio?).");
        }
    }
  };

  const loadUser = (user: string) => {
    setUsername(user);
    const saved = localStorage.getItem(`leonardo_save_${user}`);
    
    if (saved) {
      try {
        const parsedWrapper = JSON.parse(saved);
        
        // --- SECURITY CHECK ---
        let finalState = INITIAL_STATE;

        // Check if it's the new secure format { data: ..., hash: ... }
        if (parsedWrapper.data && parsedWrapper.hash) {
            const isValid = verifySaveHash(parsedWrapper.data, parsedWrapper.hash);
            if (!isValid) {
                alert("ERRO DE SEGURANÇA:\n\nDetectamos alterações manuais no seu arquivo de save.\nPara garantir a justiça do Ranking Global, seu progresso foi resetado.");
                // We do NOT load the corrupted state. We keep INITIAL_STATE.
                setCheaterDetected(true);
            } else {
                finalState = { ...INITIAL_STATE, ...parsedWrapper.data };
            }
        } 
        // Backward compatibility for old saves (migrate them once)
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
      updateGlobalLeaderboard(user, INITIAL_STATE);
    }
    
    // Update local ranking view immediately on load
    const storedLeaderboard = localStorage.getItem('leonardo_global_users');
    if (storedLeaderboard) setLeaderboard(JSON.parse(storedLeaderboard));
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

      const eps = calculateTotalEPS();
      setGameState(prev => ({
        ...prev,
        money: prev.money + eps,
        lifetimeEarnings: prev.lifetimeEarnings + eps,
        lastSaveTime: Date.now()
      }));

      if (Math.random() < 0.05) setQuote(FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]);
    }, 1000);

    const saveInterval = setInterval(saveGame, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
    };
  }, [calculateTotalEPS, username, cheaterDetected, gameState.money]);

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

  const handlePrestigeClick = () => {
      if (cheaterDetected) return;
      setShowPrestigeModal(true);
  };

  const confirmPrestige = () => {
    const prestigeCurrency = gameState.lifetimeEarnings / 1000000;
    if (prestigeCurrency < 1) return;
    
    // New Calculation: 25% (0.25) per Prestige Level
    const nextLevel = gameState.prestigeLevel + 1;
    const newMultiplier = 1 + (nextLevel * PRESTIGE_BONUS_PER_LEVEL);

    // Manually construct new state to ensure deep reset
    const newState: GameState = {
        money: 0,
        lifetimeEarnings: 0,
        startTime: Date.now(),
        lastSaveTime: Date.now(),
        productLevels: { balas: 1 }, // Explicit reset
        hiredStaff: {}, // Explicit reset
        purchasedUpgrades: {}, // Explicit reset
        prestigeLevel: nextLevel,
        prestigeMultiplier: newMultiplier,
        redeemedCodes: gameState.redeemedCodes, // Keep redeemed codes
        soundEnabled: gameState.soundEnabled
    };

    setGameState(newState);
    playSound('upgrade', gameState.soundEnabled);
    if (usernameRef.current) {
        // Use manual save to ensure signature is applied immediately
        const hash = generateSaveHash(newState);
        localStorage.setItem(`leonardo_save_${usernameRef.current}`, JSON.stringify({ data: newState, hash }));
        updateGlobalLeaderboard(usernameRef.current, newState);
    }
    setShowPrestigeModal(false);
  };

  const toggleSound = () => setGameState(prev => ({...prev, soundEnabled: !prev.soundEnabled}));

  // --- Code System ---

  const handleRedeemCode = () => {
    if (cheaterDetected) return;
    const code = codeInput.trim().toUpperCase();
    if (!code) return;

    if (gameState.redeemedCodes.includes(code)) {
        setCodeMessage({ type: 'error', text: 'Código já resgatado!' });
        return;
    }

    // Check vs Server Codes
    const foundCode = serverCodes.find(c => c.code === code);
    
    if (foundCode) {
        // Check Expiration (1 minute)
        const now = Date.now();
        const expiresAt = foundCode.createdAt + CODE_EXPIRATION_MS;
        
        if (now > expiresAt) {
            setCodeMessage({ type: 'error', text: 'Código expirado!' });
            return;
        }

        let successText = "";
        setGameState(prev => {
            let newMoney = prev.money;
            let newMult = prev.prestigeMultiplier;

            if (foundCode.type === 'MONEY') {
                newMoney += foundCode.value;
                successText = `Resgatado: +$${formatMoney(foundCode.value)}`;
            } else if (foundCode.type === 'MULTIPLIER') {
                newMult += foundCode.value;
                successText = `Resgatado: +${foundCode.value}x Multiplicador!`;
            }

            return {
                ...prev,
                money: newMoney,
                prestigeMultiplier: newMult,
                redeemedCodes: [...prev.redeemedCodes, code]
            };
        });
        setCodeMessage({ type: 'success', text: successText });
        playSound('upgrade', gameState.soundEnabled);
        setCodeInput('');
    } else {
        setCodeMessage({ type: 'error', text: 'Código inválido.' });
    }
  };

  // --- Admin Logic ---

  const handleCreateCode = () => {
    if (!newCodeName) return;
    const finalCode = newCodeName.trim().toUpperCase();
    
    if (serverCodes.find(c => c.code === finalCode)) {
        alert("Código já existe!");
        return;
    }

    const newCode: GameCode = {
        code: finalCode,
        type: newCodeType,
        value: Number(newCodeValue),
        createdBy: username || 'Admin',
        createdAt: Date.now()
    };

    const updated = [...serverCodes, newCode];
    saveServerCodes(updated);
    alert(`Código ${finalCode} criado! Válido por 1 minuto.`);
    setNewCodeName('');
  };

  const handleDeleteCode = (codeToDelete: string) => {
    const updated = serverCodes.filter(c => c.code !== codeToDelete);
    saveServerCodes(updated);
  };

  const adminAddMoney = (amount: number) => {
    setGameState(prev => ({...prev, money: prev.money + amount}));
  };

  // --- Auth Screen ---
  if (!username) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
           <div className="text-center mb-6">
              <div className="text-6xl mb-2">📛</div>
              <h1 className="text-3xl font-display font-bold text-blue-700">Leonardo do ABC</h1>
              <p className="text-slate-500">O simulador de supermercado definitivo.</p>
           </div>

           {/* Auth Tabs */}
           <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => { setAuthMode('login'); setLoginError(null); setLoginSuccess(null); }}
                className={`flex-1 py-2 rounded-md font-bold text-sm transition ${authMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => { setAuthMode('register'); setLoginError(null); setLoginSuccess(null); }}
                className={`flex-1 py-2 rounded-md font-bold text-sm transition ${authMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Criar Conta
              </button>
           </div>

           <form onSubmit={handleAuth} className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">Nome de Usuário</label>
               <div className="relative">
                 <User className="absolute left-3 top-3 text-slate-400" size={20} />
                 <input 
                   type="text" 
                   value={loginInput}
                   onChange={(e) => setLoginInput(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                   placeholder="Ex: leo123"
                 />
               </div>
             </div>
             
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                 <input 
                   type="password" 
                   value={passwordInput}
                   onChange={(e) => setPasswordInput(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                   placeholder="********"
                 />
               </div>
             </div>

             {loginError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">{loginError}</div>}
             {loginSuccess && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg font-medium">{loginSuccess}</div>}

             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2">
                {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                {authMode === 'login' ? 'Acessar Loja' : 'Registrar Usuário'}
             </button>
           </form>
        </div>
      </div>
    );
  }

  // --- Main Game ---

  const eps = calculateTotalEPS();
  const currentTitle = TITLES[Math.min(gameState.prestigeLevel, TITLES.length - 1)];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 font-sans overflow-hidden flex flex-col">
      {cheaterDetected && (
          <div className="fixed inset-0 z-[100] bg-red-900/95 flex items-center justify-center p-8 backdrop-blur text-white text-center">
              <div>
                  <AlertTriangle size={80} className="mx-auto mb-4 text-yellow-400 animate-pulse" />
                  <h1 className="text-4xl font-bold font-display mb-4">Ação Suspeita Detectada</h1>
                  <p className="text-xl mb-8">Valores impossíveis ou modificação de save detectada.</p>
                  <button onClick={handleLogout} className="bg-white text-red-900 px-6 py-3 rounded font-bold hover:bg-slate-200">Reiniciar Jogo</button>
              </div>
          </div>
      )}

      {clicks.map(click => <FloatingText key={click.id} x={click.x} y={click.y} value={click.value} onComplete={() => setClicks(p => p.filter(c => c.id !== click.id))} />)}

      {/* Offline Modal */}
      {offlineEarnings && !cheaterDetected && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-bounce-in text-center">
            <h2 className="text-2xl font-display font-bold text-blue-600 mb-2">Bem-vindo de volta!</h2>
            <p className="text-gray-600 mb-4">A loja faturou enquanto você dormia:</p>
            <div className="text-4xl font-bold text-green-600 mb-6">${formatMoney(offlineEarnings)}</div>
            <button onClick={() => setOfflineEarnings(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Coletar</button>
          </div>
        </div>
      )}

      {/* Prestige Modal */}
      {showPrestigeModal && (
         <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-6 text-white text-center">
                    <div className="inline-block p-3 bg-white/20 rounded-full mb-2 backdrop-blur-md">
                         <ArrowUpCircle size={48} className="text-yellow-300" />
                    </div>
                    <h2 className="text-2xl font-display font-bold">Promoção de Cargo!</h2>
                    <p className="text-indigo-200">Você foi notado pela diretoria.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-yellow-800">
                        <span className="font-bold block mb-1">⚠️ ATENÇÃO: REINÍCIO</span>
                        Ao aceitar, seu Dinheiro, Produtos e Funcionários serão zerados. Você manterá apenas seus Códigos e ganhará um multiplicador permanente.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 font-bold uppercase">Bônus Atual</p>
                            <p className="text-xl font-bold text-slate-400">x{gameState.prestigeMultiplier.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-600 font-bold uppercase">Novo Bônus</p>
                            <p className="text-xl font-bold text-green-600">
                                x{(1 + (gameState.prestigeLevel + 1) * PRESTIGE_BONUS_PER_LEVEL).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-green-600">(+{PRESTIGE_BONUS_PER_LEVEL * 100}%/Cargo)</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => setShowPrestigeModal(false)}
                            className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <XCircle size={18} /> Cancelar
                        </button>
                        <button 
                            onClick={confirmPrestige}
                            className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                        >
                            <CheckCircle size={18} /> Aceitar
                        </button>
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* HEADER */}
      <header className="bg-blue-600 text-white p-2 md:p-4 shadow-md z-10 sticky top-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-display font-bold flex items-center gap-2">
              <span className="text-xl md:text-2xl">📛</span> <span className="hidden md:inline">Leonardo do ABC</span>
            </h1>
            <span className="text-blue-200 text-xs font-medium flex items-center gap-1">
               {username} {isAdmin && <span className="text-yellow-300 font-bold">[ADMIN]</span>} • {currentTitle}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* RADIO COMPONENT (Shows smaller on mobile) */}
            <div className="hidden md:block w-64">
                <RadioSystem />
            </div>

            <div className="flex gap-2">
                <button onClick={() => { saveGame(); alert('Jogo Salvo!'); }} className="p-2 hover:bg-blue-700 rounded-full transition" title="Salvar">
                <Save size={20} />
                </button>
                <button onClick={toggleSound} className="p-2 hover:bg-blue-700 rounded-full transition">
                {gameState.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
                <button onClick={handleLogout} className="p-2 hover:bg-blue-700 rounded-full transition" title="Sair">
                <LogOut size={20} />
                </button>
            </div>
            
            <div className="text-right min-w-[80px]">
              <div className="text-xl md:text-3xl font-bold font-display flex items-center justify-end gap-1">
                <span className="text-green-300">$</span> {formatMoney(gameState.money)}
              </div>
              <div className="text-xs text-blue-200">+${formatMoney(eps)}/s</div>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="bg-yellow-400 text-yellow-900 py-1 px-4 text-sm font-bold text-center overflow-hidden whitespace-nowrap shadow-sm z-0">
        <p className="animate-pulse">{quote}</p>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden max-w-6xl mx-auto w-full flex flex-col md:flex-row">
        
        {/* LEFT: WORK & AVATAR */}
        <section className="w-full md:w-1/3 p-4 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-200 bg-white md:bg-transparent overflow-y-auto">
            {/* Mobile Radio */}
            <div className="md:hidden w-full mb-4">
                <RadioSystem />
            </div>

            <div className="mb-6 relative group cursor-pointer mt-4" onClick={handleWorkClick}>
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <div className="relative w-40 h-40 md:w-64 md:h-64 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-xl transform transition active:scale-95 hover:scale-105 border-4 border-white select-none">
                <span className="text-7xl md:text-9xl filter drop-shadow-lg">
                  {gameState.prestigeLevel === 0 ? '👷' : gameState.prestigeLevel < 3 ? '👔' : gameState.prestigeLevel < 6 ? '🕴️' : '🦁'}
                </span>
              </div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-md border border-slate-100 whitespace-nowrap">
                <span className="text-sm font-bold text-slate-600">Repor Estoque!</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-center w-full max-w-xs">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Poder do Clique</p>
                <p className="text-xl font-bold text-blue-600">${formatMoney(calculateClickPower())}</p>
            </div>
        </section>

        {/* RIGHT: TABS & LISTS */}
        <section className="w-full md:w-2/3 flex flex-col h-full bg-slate-50">
          <div className="flex bg-white shadow-sm overflow-x-auto no-scrollbar">
            {Object.values(Tab).map(tab => {
               if (tab === Tab.ADMIN && !isAdmin) return null;
               return (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition min-w-[90px] ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  {tab === Tab.PRODUCTS && <ShoppingBasket size={18} />}
                  {tab === Tab.STAFF && <Users size={18} />}
                  {tab === Tab.UPGRADES && <TrendingUp size={18} />}
                  {tab === Tab.PROFILE && <Trophy size={18} />}
                  {tab === Tab.RANKING && <Globe size={18} />}
                  {tab === Tab.ADMIN && <ShieldAlert size={18} className="text-red-500" />}
                  <span className="hidden sm:inline">{tab}</span>
                </button>
              );
            })}
          </div>

          {activeTab === Tab.PRODUCTS && (
             <div className="p-2 bg-slate-100 flex justify-center gap-2 flex-wrap shadow-inner">
                {[1, 10, 25, 50, 100, 'MAX'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBuyAmount(amount as BuyAmount)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${buyAmount === amount ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
                  >
                    x{amount}
                  </button>
                ))}
             </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">
            
            {activeTab === Tab.PRODUCTS && (
              <div className="space-y-3">
                {INITIAL_PRODUCTS.map(product => {
                  const level = gameState.productLevels[product.id] || 0;
                  const isUnlocked = level > 0;
                  const { count, cost } = calculateBulkCost(product, level, buyAmount, gameState.money);
                  const canAfford = count > 0 && gameState.money >= cost;
                  const isMax = buyAmount === 'MAX';
                  const currentIncome = calculateProductIncome(product.id, level);
                  const progress = (level % 25) / 25 * 100;
                  
                  return (
                    <div key={product.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${isUnlocked ? 'border-blue-500' : 'border-slate-300 bg-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-4">
                            <div className="text-3xl bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center shadow-inner relative">
                              {isUnlocked ? product.icon : '🔒'}
                              {isUnlocked && <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-white">{level}</div>}
                            </div>
                            <div>
                              <h3 className={`font-bold ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{product.name}</h3>
                              {isUnlocked && <div className="text-xs text-slate-500 font-medium"><span className="text-green-600 font-bold">+${formatMoney(currentIncome)}/s</span></div>}
                            </div>
                        </div>

                        {isUnlocked ? (
                          <button 
                            onClick={() => buyProduct(product)}
                            disabled={!canAfford}
                            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg font-bold text-sm min-w-[100px] transition ${canAfford ? 'bg-green-500 hover:bg-green-600 text-white shadow-md active:translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            <span className="text-xs font-normal opacity-90">{isMax ? `+${count}` : `+${buyAmount}`}</span>
                            <span>${formatMoney(cost)}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => unlockProduct(product)}
                            disabled={gameState.money < product.unlockCost}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${gameState.money >= product.unlockCost ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                          >
                            Liberar ${formatMoney(product.unlockCost)}
                          </button>
                        )}
                      </div>
                      {isUnlocked && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden flex items-center relative">
                          <div className="bg-yellow-400 h-full transition-all duration-300" style={{ width: `${level % 25 === 0 && level > 0 ? 100 : progress}%` }}></div>
                          {level % 25 === 0 && level > 0 && <span className="absolute right-0 text-[8px] font-bold text-yellow-600 bg-yellow-100 px-1 rounded-full">2x BÔNUS</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === Tab.STAFF && (
              <div className="space-y-3">
                {AVAILABLE_STAFF.map(staff => {
                  const hired = gameState.hiredStaff[staff.id];
                  const canAfford = gameState.money >= staff.baseCost;
                  return (
                    <div key={staff.id} className={`bg-white p-4 rounded-xl shadow-sm border ${hired ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="bg-orange-100 text-orange-600 p-2 rounded-lg h-fit"><Briefcase size={20} /></div>
                          <div>
                            <h3 className="font-bold text-slate-800">{staff.role}: {staff.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">{staff.description}</p>
                          </div>
                        </div>
                        {hired ? (
                          <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase">Contratado</span>
                        ) : (
                          <button onClick={() => hireStaff(staff)} disabled={!canAfford} className={`px-3 py-2 rounded-lg font-bold text-sm min-w-[80px] ${canAfford ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-slate-200 text-slate-400'}`}>${formatMoney(staff.baseCost)}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === Tab.UPGRADES && (
              <div className="space-y-3">
                {UPGRADES.map(upgrade => {
                  const bought = gameState.purchasedUpgrades[upgrade.id];
                  const canAfford = gameState.money >= upgrade.cost;
                  if (upgrade.triggerId && (gameState.productLevels[upgrade.triggerId] || 0) === 0) return null;
                  if (bought) return null;
                  return (
                    <div key={upgrade.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                      <div className="flex gap-3 items-center">
                         <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><Zap size={20} /></div>
                        <div>
                          <h3 className="font-bold text-slate-800">{upgrade.name}</h3>
                          <p className="text-xs text-slate-500">{upgrade.description}</p>
                        </div>
                      </div>
                      <button onClick={() => buyUpgrade(upgrade)} disabled={!canAfford} className={`px-3 py-2 rounded-lg font-bold text-sm ${canAfford ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-200 text-slate-400'}`}>${formatMoney(upgrade.cost)}</button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === Tab.PROFILE && (
              <div className="space-y-6 text-center pt-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="text-4xl mb-2">🏆</div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">{currentTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">Conta: {username}</p>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase font-bold">Ganho Vitalício</div>
                      <div className="text-lg font-bold text-slate-800">${formatMoney(gameState.lifetimeEarnings)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase font-bold">Mult. Prestígio</div>
                      <div className="text-lg font-bold text-purple-600">x{gameState.prestigeMultiplier.toFixed(2)}</div>
                    </div>
                  </div>
                  <button onClick={() => { saveGame(); alert("Jogo salvo com sucesso!"); }} className="mt-4 w-full border border-blue-600 text-blue-600 font-bold py-2 rounded hover:bg-blue-50">Salvar Progresso Agora</button>
                </div>

                {/* Redeem Code */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-700 flex items-center justify-center gap-2 mb-2">
                    <Ticket size={16} /> Resgatar Código
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Insira o código..." 
                      className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm uppercase"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                    />
                    <button onClick={handleRedeemCode} className="bg-slate-800 text-white px-4 py-2 rounded font-bold text-sm hover:bg-slate-900">OK</button>
                  </div>
                  {codeMessage && (
                    <div className={`mt-2 text-xs font-bold ${codeMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {codeMessage.text}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
                  <h3 className="text-xl font-bold font-display mb-2 flex items-center justify-center gap-2"><ArrowUpCircle /> Promoção de Cargo</h3>
                  <p className="text-indigo-100 text-sm mb-4">Resete seu progresso atual para ganhar um multiplicador permanente baseado no seu Ganho Vitalício.</p>
                  
                  {gameState.lifetimeEarnings >= 1000000 ? (
                    <button onClick={handlePrestigeClick} className="w-full bg-white text-indigo-700 font-bold py-3 rounded-lg hover:bg-indigo-50 transition shadow-lg active:scale-95 animate-pulse">
                        Verificar Promoção
                    </button>
                  ) : (
                    <div className="bg-black/20 p-3 rounded-lg text-sm font-medium">
                      Requer $1M em Ganhos Vitalícios.
                      <div className="w-full bg-black/30 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-green-400 h-full transition-all duration-500" style={{ width: `${Math.min(100, (gameState.lifetimeEarnings / 1000000) * 100)}%` }}></div>
                      </div>
                      <div className="mt-1 text-xs opacity-75">${formatMoney(gameState.lifetimeEarnings)} / $1M</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* RANKING TAB */}
            {activeTab === Tab.RANKING && (
               <div className="space-y-4 pt-2">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-center mb-6">
                        <div className="inline-block p-3 bg-yellow-100 rounded-full mb-2">
                            <Globe className="text-yellow-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-slate-800">Ranking Global</h2>
                        <p className="text-slate-500">Os maiores magnatas do varejo</p>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-center">#</th>
                                    <th className="px-4 py-3">Jogador</th>
                                    <th className="px-4 py-3 text-right">Patrimônio (Total)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard.slice(0, 10).map((player, index) => {
                                    const isMe = player.username === username;
                                    let rankIcon = <span className="font-bold text-slate-500">#{index + 1}</span>;
                                    let rowClass = "bg-white hover:bg-slate-50";

                                    if (index === 0) {
                                        rankIcon = <span className="text-2xl">🥇</span>;
                                        rowClass = "bg-yellow-50/50 hover:bg-yellow-50";
                                    } else if (index === 1) {
                                        rankIcon = <span className="text-2xl">🥈</span>;
                                    } else if (index === 2) {
                                        rankIcon = <span className="text-2xl">🥉</span>;
                                    }

                                    return (
                                        <tr key={index} className={`${rowClass} ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                                            <td className="px-4 py-3 text-center w-16">{rankIcon}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {player.username}
                                                    {isMe && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Eu</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Medal size={12} className="text-orange-400" /> {player.title}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-green-600">
                                                ${formatMoney(player.lifetimeEarnings)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {leaderboard.length === 0 && (
                        <div className="text-center p-4 text-slate-500 italic">Carregando ranking...</div>
                    )}
                 </div>
               </div>
            )}

            {/* ADMIN TAB */}
            {activeTab === Tab.ADMIN && isAdmin && (
                <div className="space-y-6 pt-2">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-red-500">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                            <ShieldAlert className="text-red-500" />
                            <h2 className="text-xl font-bold font-display">Painel de Administrador</h2>
                        </div>
                        
                        {/* Cheats */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase">Trapaças Rápidas</h3>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => adminAddMoney(1000000)} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-bold">+ $1M</button>
                                <button onClick={() => adminAddMoney(1000000000)} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-bold">+ $1B</button>
                                <button onClick={() => setGameState(prev => ({...prev, prestigeLevel: prev.prestigeLevel + 1}))} className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">+1 Cargo</button>
                                <button onClick={() => setGameState(prev => ({...prev, redeemedCodes: []}))} className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-bold">Resetar Códigos</button>
                            </div>
                        </div>

                        {/* Code Generator */}
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase flex items-center gap-2"><Ticket size={14} /> Gerador de Códigos Globais (1 Min Validade)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Nome do Código</label>
                                    <input value={newCodeName} onChange={e => setNewCodeName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" placeholder="EX: DINHEIRO10" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Valor</label>
                                    <input type="number" value={newCodeValue} onChange={e => setNewCodeValue(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Tipo de Prêmio</label>
                                    <select value={newCodeType} onChange={(e: any) => setNewCodeType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white">
                                        <option value="MONEY">Dinheiro ($)</option>
                                        <option value="MULTIPLIER">Multiplicador (x)</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleCreateCode} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded flex items-center justify-center gap-2 text-sm">
                                <PlusCircle size={16} /> Criar e Salvar Código
                            </button>
                        </div>

                        {/* List Codes */}
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase">Códigos Gerados ({serverCodes.length})</h3>
                            <div className="space-y-2">
                                {serverCodes.length === 0 && <p className="text-xs text-slate-600 italic">Nenhum código gerado.</p>}
                                {serverCodes.map((code, idx) => {
                                    const timeLeft = Math.max(0, Math.ceil((code.createdAt + CODE_EXPIRATION_MS - Date.now()) / 1000));
                                    const isExpired = timeLeft === 0;

                                    return (
                                        <div key={idx} className={`bg-slate-800 p-2 rounded border flex justify-between items-center ${isExpired ? 'border-red-900 opacity-50' : 'border-green-700'}`}>
                                            <div>
                                                <span className="font-bold text-yellow-400">{code.code}</span>
                                                <span className="text-xs text-slate-400 ml-2">({code.type === 'MONEY' ? '$' : 'x'}{code.value})</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-mono flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-green-400'}`}>
                                                    <Clock size={12} /> {timeLeft}s
                                                </span>
                                                <button onClick={() => handleDeleteCode(code.code)} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}