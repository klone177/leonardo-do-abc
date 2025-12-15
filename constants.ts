import { Product, Staff, Upgrade } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'balas',
    name: 'Balas e Chicletes',
    icon: '🍬',
    baseCost: 10,
    baseRevenue: 0.5,
    costMultiplier: 1.15,
    unlockCost: 0
  },
  {
    id: 'agua',
    name: 'Água Mineral',
    icon: '💧',
    baseCost: 120,
    baseRevenue: 4,
    costMultiplier: 1.15,
    unlockCost: 50
  },
  {
    id: 'padaria',
    name: 'Pão Francês',
    icon: '🥖',
    baseCost: 800,
    baseRevenue: 15,
    costMultiplier: 1.14,
    unlockCost: 500
  },
  {
    id: 'hortifruti',
    name: 'Frutas e Verduras',
    icon: '🍎',
    baseCost: 4500,
    baseRevenue: 80,
    costMultiplier: 1.13,
    unlockCost: 2500
  },
  {
    id: 'arroz',
    name: 'Arroz (Cesta Básica)',
    icon: '🍚',
    baseCost: 20000,
    baseRevenue: 400,
    costMultiplier: 1.12,
    unlockCost: 12000
  },
  {
    id: 'acougue',
    name: 'Carnes Nobres',
    icon: '🥩',
    baseCost: 150000,
    baseRevenue: 2500,
    costMultiplier: 1.11,
    unlockCost: 80000
  },
  {
    id: 'eletro',
    name: 'Eletrodomésticos',
    icon: '📺',
    baseCost: 1000000,
    baseRevenue: 18000,
    costMultiplier: 1.10,
    unlockCost: 600000
  }
];

export const AVAILABLE_STAFF: Staff[] = [
  {
    id: 'bryan',
    name: 'Bryan',
    role: 'Estagiário',
    description: 'Repõe as Balas rapidinho. Lucro Balas x2',
    baseCost: 500,
    multiplier: 2,
    affectsId: 'balas'
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'Repositor de Bebidas',
    description: 'Ninguém fica com sede. Lucro Água x2',
    baseCost: 2000,
    multiplier: 2,
    affectsId: 'agua'
  },
  {
    id: 'samuel',
    name: 'Samuel',
    role: 'Padeiro Chefe',
    description: 'O pão sai quentinho. Lucro Padaria x2',
    baseCost: 10000,
    multiplier: 2,
    affectsId: 'padaria'
  },
  {
    id: 'kaue',
    name: 'Kaue',
    role: 'Açougueiro',
    description: 'Corte preciso. Lucro Açougue x2',
    baseCost: 250000,
    multiplier: 2,
    affectsId: 'acougue'
  },
  {
    id: 'uriel',
    name: 'Uriel',
    role: 'Gerente Geral',
    description: 'Coordena toda a loja. Lucro Global +50%',
    baseCost: 5000000,
    multiplier: 1.5,
    affectsId: 'global'
  }
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'tenis',
    name: 'Tênis Ortopédico',
    description: 'Menos dor nas costas. Clique x2.',
    cost: 300
  },
  {
    id: 'leitor',
    name: 'Leitor de Código',
    description: 'Bipa mais rápido. Água e Balas x2.',
    cost: 1500,
    triggerId: 'agua'
  },
  {
    id: 'forno',
    name: 'Forno Industrial',
    description: 'Assa mais pão. Padaria x3.',
    cost: 12000,
    triggerId: 'padaria'
  },
  {
    id: 'paleteira',
    name: 'Paleteira Elétrica',
    description: 'Carrega peso sem esforço. Arroz x3.',
    cost: 50000,
    triggerId: 'arroz'
  },
  {
    id: 'ar',
    name: 'Ar Condicionado Central',
    description: 'Clientes ficam mais tempo. Global +20%.',
    cost: 200000
  }
];

export const FUNNY_QUOTES = [
  "Atenção frente de caixa, cliente aguardando.",
  "Limpeza no corredor 4, vidro quebrado.",
  "Promoção: Leve 3 e pague 3 (mas sorrindo).",
  "O sistema caiu, chama o TI!",
  "Quem comeu o chocolate do estoque?",
  "Fim de mês o mercado lota.",
  "Cuidado com o carrinho no calcanhar.",
  "Leonardo sonha com férias em Acapulco.",
  "Procura-se o dono de um fusca azul no estacionamento.",
  "Hoje o dia tá rendendo!",
  "A meta é bater a meta.",
  "Sorria, você está sendo filmado (e avaliado)."
];