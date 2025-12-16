import { Product, Staff, Upgrade } from './types';

// Balanceamento para exigir reset (Prestigio) para avançar
// Nivel 0: Acesso a Balas, Agua, Padaria. Meta: 1M
// Nivel 1: Acesso a Hortifruti, Arroz. Meta: 5M
// Nivel 2: Acesso a Acougue, Eletro. Meta: 25M
// Nivel 3: Acesso a Moveis, Informatica. Meta: 100M
// Nivel 4: Acesso a Automotivo, Imoveis. Meta: 500M

export const INITIAL_PRODUCTS: Product[] = [
  // --- NÍVEL 0 (Inicial) ---
  {
    id: 'balas',
    name: 'Balas',
    icon: '🍬',
    baseCost: 10,
    baseRevenue: 1,
    costMultiplier: 1.15,
    unlockCost: 0,
    reqPrestige: 0
  },
  {
    id: 'agua',
    name: 'Água',
    icon: '💧',
    baseCost: 250,
    baseRevenue: 8,
    costMultiplier: 1.15,
    unlockCost: 100,
    reqPrestige: 0
  },
  {
    id: 'padaria',
    name: 'Pão',
    icon: '🥖',
    baseCost: 1500,
    baseRevenue: 40,
    costMultiplier: 1.14,
    unlockCost: 1000,
    reqPrestige: 0
  },

  // --- NÍVEL 1 (Requer Cargo Repositor - 1M acumulado) ---
  {
    id: 'hortifruti',
    name: 'Hortifruti',
    icon: '🍎',
    baseCost: 15000,
    baseRevenue: 250,
    costMultiplier: 1.13,
    unlockCost: 10000,
    reqPrestige: 1
  },
  {
    id: 'arroz',
    name: 'Cesta Básica',
    icon: '🍚',
    baseCost: 60000,
    baseRevenue: 800,
    costMultiplier: 1.12,
    unlockCost: 40000,
    reqPrestige: 1
  },

  // --- NÍVEL 2 (Requer Cargo Caixa - 5M acumulado) ---
  {
    id: 'acougue',
    name: 'Açougue',
    icon: '🥩',
    baseCost: 350000,
    baseRevenue: 3500,
    costMultiplier: 1.11,
    unlockCost: 200000,
    reqPrestige: 2
  },
  {
    id: 'eletro',
    name: 'Eletro',
    icon: '📺',
    baseCost: 1500000,
    baseRevenue: 12000,
    costMultiplier: 1.10,
    unlockCost: 1000000,
    reqPrestige: 2
  },

  // --- NÍVEL 3 (Requer Cargo Fiscal - 25M acumulado) ---
  {
    id: 'moveis',
    name: 'Móveis',
    icon: '🪑',
    baseCost: 8000000,
    baseRevenue: 55000,
    costMultiplier: 1.09,
    unlockCost: 5000000,
    reqPrestige: 3
  },
  {
    id: 'informatica',
    name: 'Informática',
    icon: '💻',
    baseCost: 40000000,
    baseRevenue: 220000,
    costMultiplier: 1.08,
    unlockCost: 25000000,
    reqPrestige: 3
  },

  // --- NÍVEL 4 (Requer Cargo Gerente - 100M acumulado) ---
  {
    id: 'automotivo',
    name: 'Peças Auto',
    icon: '🚗',
    baseCost: 150000000,
    baseRevenue: 900000,
    costMultiplier: 1.07,
    unlockCost: 100000000,
    reqPrestige: 4
  },
  {
    id: 'imoveis',
    name: 'Imóveis',
    icon: '🏢',
    baseCost: 1000000000, // 1B
    baseRevenue: 5000000, // 5M
    costMultiplier: 1.06,
    unlockCost: 750000000,
    reqPrestige: 4
  }
];

export const AVAILABLE_STAFF: Staff[] = [
  {
    id: 'bryan',
    name: 'Bryan',
    role: 'Estagiário',
    description: 'Lucro Balas x2',
    baseCost: 1000,
    multiplier: 2,
    affectsId: 'balas'
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'Repositor',
    description: 'Lucro Água x2',
    baseCost: 5000,
    multiplier: 2,
    affectsId: 'agua'
  },
  {
    id: 'samuel',
    name: 'Samuel',
    role: 'Padeiro',
    description: 'Lucro Pão x2',
    baseCost: 25000,
    multiplier: 2,
    affectsId: 'padaria'
  },
  {
    id: 'joao',
    name: 'João',
    role: 'Feirante',
    description: 'Lucro Hortifruti x2',
    baseCost: 150000,
    multiplier: 2,
    affectsId: 'hortifruti'
  },
  {
    id: 'kaue',
    name: 'Kaue',
    role: 'Açougueiro',
    description: 'Lucro Açougue x2',
    baseCost: 1000000,
    multiplier: 2,
    affectsId: 'acougue'
  },
  {
    id: 'uriel',
    name: 'Uriel',
    role: 'Gerente',
    description: 'Lucro Global +50%',
    baseCost: 50000000,
    multiplier: 1.5,
    affectsId: 'global'
  }
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'tenis',
    name: 'Tênis Ortopédico',
    description: 'Clique x2.',
    cost: 500
  },
  {
    id: 'leitor',
    name: 'Leitor Código',
    description: 'Água/Balas x2.',
    cost: 2500,
    triggerId: 'agua'
  },
  {
    id: 'forno',
    name: 'Forno Turbo',
    description: 'Pão x3.',
    cost: 20000,
    triggerId: 'padaria'
  },
  {
    id: 'caminhao',
    name: 'Caminhão',
    description: 'Hortifruti x3.',
    cost: 100000,
    triggerId: 'hortifruti'
  },
  {
    id: 'ar',
    name: 'Ar Condicionado',
    description: 'Global +20%.',
    cost: 5000000
  }
];

export const FUNNY_QUOTES = [
  "Atenção frente de caixa!",
  "Limpeza no corredor 4.",
  "Leve 3 e pague 3!",
  "O sistema caiu!",
  "Quem comeu o estoque?",
  "Fim de mês lotado.",
  "Cuidado com o carrinho.",
  "Leonardo quer férias.",
  "Hoje o dia rende!",
  "A meta é bater a meta.",
  "Sorria, sendo filmado.",
  "Dinheiro não traz felicidade, compra!"
];