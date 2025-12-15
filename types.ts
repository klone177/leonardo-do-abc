export enum Tab {
  PRODUCTS = 'Produtos',
  STAFF = 'Equipe',
  UPGRADES = 'Melhorias',
  PROFILE = 'Perfil',
  RANKING = 'Ranking',
  ADMIN = 'Admin'
}

export interface Product {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseRevenue: number;
  costMultiplier: number; // Usually around 1.15
  unlockCost: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  description: string;
  baseCost: number;
  multiplier: number; // Multiplies global income or specific product
  affectsId?: string; // 'global' or product ID
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  triggerId?: string; // Only show if this product is unlocked
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (state: GameState) => boolean;
  unlocked: boolean;
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
  
  // Prestige
  prestigeLevel: number; // 0 = Repositor, 1 = Líder, etc.
  prestigeMultiplier: number;
  
  // Codes
  redeemedCodes: string[];

  // Settings
  soundEnabled: boolean;
}

export interface GameCode {
  code: string;
  type: 'MONEY' | 'MULTIPLIER';
  value: number;
  createdBy: string;
  createdAt: number; // Timestamp for expiration
}

export interface LeaderboardEntry {
  username: string;
  prestigeLevel: number;
  lifetimeEarnings: number;
  title: string;
}

export const TITLES = [
  "Repositor Júnior",
  "Repositor Sênior",
  "Líder de Corredor",
  "Sub-Gerente",
  "Gerente de Setor",
  "Gerente Geral",
  "Diretor Regional",
  "Sócio Minoritário",
  "Sócio Majoritário",
  "Dono do ABC",
  "Magnata do Varejo",
  "Lenda do Mercado"
];