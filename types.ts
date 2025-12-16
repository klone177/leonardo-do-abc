export enum Tab {
  PRODUCTS = 'LOJA',
  STAFF = 'EQUIPE',
  UPGRADES = 'POWER-UP',
  CREDITS = 'VIP',
  PROFILE = 'PERFIL',
  RANKING = 'TOP',
  CHAT = 'CHAT', // Nova aba
  ADMIN = 'GM'
}

export interface Product {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseRevenue: number;
  costMultiplier: number;
  unlockCost: number;
  reqPrestige: number; // Nível de cargo necessário
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  description: string;
  baseCost: number;
  multiplier: number; 
  affectsId?: string; 
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  triggerId?: string; 
}

export interface GameState {
  money: number;
  lifetimeEarnings: number; // Used for prestige
  startTime: number;
  lastSaveTime: number;
  
  // Progress
  productLevels: Record<string, number>;
  hiredStaff: Record<string, boolean>;
  purchasedUpgrades: Record<string, boolean>;
  
  // New Features
  credits: number;        // Moeda VIP
  playTime: number;       // Segundos online totais
  creditMultiplier: number; // Multiplicador comprado com créditos
  chatColor: string;      // Cor do chat escolhida pelo user
  
  // Prestige
  prestigeLevel: number; 
  prestigeMultiplier: number;
  
  // Settings
  soundEnabled: boolean;
}

export interface LeaderboardEntry {
  username: string;
  prestigeLevel: number;
  lifetimeEarnings: number;
  playTime: number; // Novo campo para ranking de tempo
  title: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  title: string;
  text: string;
  color?: string; // Cor da mensagem específica
  timestamp: number;
  isSystem?: boolean;
}

export interface TitleDefinition {
  name: string;
  cost: number;
}

// Custos para subir de cargo (Acumulado Vitalício)
export const TITLES: TitleDefinition[] = [
  { name: "NOOB", cost: 0 },
  { name: "REPOSITOR", cost: 1000000 }, // 1M
  { name: "CAIXA", cost: 5000000 }, // 5M
  { name: "FISCAL", cost: 25000000 }, // 25M
  { name: "GERENTE", cost: 100000000 }, // 100M
  { name: "DIRETOR", cost: 500000000 }, // 500M
  { name: "CEO", cost: 2500000000 }, // 2.5B
  { name: "SÓCIO", cost: 10000000000 }, // 10B
  { name: "DONO", cost: 50000000000 }, // 50B
  { name: "MAGNATA", cost: 250000000000 }, // 250B
  { name: "LENDA", cost: 1000000000000 }, // 1T
  { name: "DEUS VAREJO", cost: 10000000000000 } // 10T
];