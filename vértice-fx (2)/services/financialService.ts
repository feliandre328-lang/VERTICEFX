import { SystemState, Transaction, Investment, TransactionType, TransactionStatus, UserProfile, Referral } from '../types';

const STORAGE_KEY = 'nexus_asset_data_v3_roles';

// Let's create some mock users for the KYC section
const MOCK_USERS: UserProfile[] = [
    {
        id: 'CLT-8821',
        name: 'Carlos Mendes',
        email: 'carlos.m@example.com',
        referralCode: 'VFX-9921',
        joinedDate: '2023-11-15',
        avatarUrl: 'https://i.pravatar.cc/150?u=carlos',
        isVerified: true,
        role: 'CLIENT'
    },
    {
        id: 'CLT-1234',
        name: 'Ana Silva',
        email: 'ana.silva@example.com',
        referralCode: 'VFX-1234',
        joinedDate: '2024-01-20',
        avatarUrl: 'https://i.pravatar.cc/150?u=ana',
        isVerified: false,
        role: 'CLIENT'
    },
    {
        id: 'CLT-5678',
        name: 'Pedro Costa',
        email: 'pedro.costa@example.com',
        referralCode: 'VFX-5678',
        joinedDate: '2024-03-10',
        avatarUrl: 'https://i.pravatar.cc/150?u=pedro',
        isVerified: true,
        role: 'CLIENT'
    },
    {
        id: 'CLT-9101',
        name: 'Juliana Ferreira',
        email: 'juliana.f@example.com',
        referralCode: 'VFX-9101',
        joinedDate: '2024-05-02',
        avatarUrl: 'https://i.pravatar.cc/150?u=juliana',
        isVerified: false,
        role: 'CLIENT'
    }
];

const MOCK_REFERRALS: Referral[] = [
    { id: 'REF-001', name: 'Juliana Ferreira', joinedDate: '2024-05-02', status: 'ACTIVE', earnings: 250.00 },
    { id: 'REF-002', name: 'Marcos Andrade', joinedDate: '2024-05-15', status: 'ACTIVE', earnings: 150.00 },
    { id: 'REF-003', name: 'Beatriz Lima', joinedDate: '2024-06-01', status: 'PENDING', earnings: 0 },
    { id: 'REF-004', name: 'Ricardo Souza', joinedDate: '2024-06-05', status: 'ACTIVE', earnings: 300.00 },
    { id: 'REF-005', name: 'Fernanda Alves', joinedDate: '2024-06-10', status: 'PENDING', earnings: 0 },
    { id: 'REF-006', name: 'Gabriel Martins', joinedDate: '2024-06-11', status: 'ACTIVE', earnings: 540.00 },
];

const INITIAL_STATE: SystemState = {
  balanceCapital: 0,
  balanceResults: 0,
  totalContributed: 0,
  totalRedeemed: 0,
  lastPerformanceFactor: 0, 
  investments: [],
  transactions: [],
  currentVirtualDate: new Date().toISOString(),
  pendingApprovals: 0,
  users: MOCK_USERS,
  referrals: MOCK_REFERRALS,
};

const generateId = (prefix: string = '') => prefix + Math.random().toString(36).substr(2, 9).toUpperCase();

export const getSystemState = (): SystemState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Recalculate pending approvals on load to be safe
    parsed.pendingApprovals = parsed.transactions.filter((t: Transaction) => t.status === TransactionStatus.ANALYSIS).length;
    // Ensure users array exists for backwards compatibility
    if (!parsed.users) {
      parsed.users = MOCK_USERS;
    }
    if (!parsed.referrals) {
      parsed.referrals = MOCK_REFERRALS;
    }
    return parsed;
  }
  return INITIAL_STATE;
};

export const saveSystemState = (state: SystemState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// --- USER MANAGEMENT ---
export const createUser = (userData: Omit<UserProfile, 'id' | 'referralCode' | 'joinedDate' | 'avatarUrl' | 'isVerified' | 'role'>): SystemState => {
    const state = getSystemState();
    const newUser: UserProfile = {
        ...userData,
        id: generateId('CLT-'),
        referralCode: generateId('VFX-'),
        joinedDate: new Date().toISOString(),
        avatarUrl: `https://i.pravatar.cc/150?u=${generateId()}`,
        isVerified: false, // All new users start as unverified
        role: 'CLIENT',
    };

    const newState = {
        ...state,
        users: [...state.users, newUser],
    };
    saveSystemState(newState);
    return newState;
};

export const createContribution = (amount: number): SystemState => {
  const state = getSystemState();
  const now = new Date(state.currentVirtualDate);
  const lockupDate = new Date(now);
  lockupDate.setDate(lockupDate.getDate() + 90); 

  const newInvestment: Investment = {
    id: generateId(),
    amount,
    startDate: now.toISOString(),
    lockupDate: lockupDate.toISOString(),
    status: 'ACTIVE',
  };

  const transaction: Transaction = {
    id: generateId(),
    type: TransactionType.CONTRIBUTION,
    amount,
    date: now.toISOString(),
    status: TransactionStatus.COMPLETED,
    description: 'Aporte de Capital (Contrato Digital Aceito)',
  };

  const newState = {
    ...state,
    balanceCapital: state.balanceCapital + amount,
    totalContributed: state.totalContributed + amount,
    investments: [newInvestment, ...state.investments],
    transactions: [transaction, ...state.transactions],
  };

  saveSystemState(newState);
  return newState;
};

// --- ADMIN FUNCTIONS ---

export const toggleUserVerification = (userId: string): SystemState => {
    const state = getSystemState();
    const updatedUsers = state.users.map(user => {
        if (user.id === userId) {
            return { ...user, isVerified: !user.isVerified };
        }
        return user;
    });

    const newState = {
        ...state,
        users: updatedUsers
    };

    saveSystemState(newState);
    return newState;
};

export const processManualPerformance = (percentage: number): SystemState => {
  const state = getSystemState();
  
  // Cálculo sobre o capital ativo
  const periodResult = state.balanceCapital * (percentage / 100);

  const now = new Date(state.currentVirtualDate);
  now.setDate(now.getDate() + 1);

  // Se houver prejuízo ou lucro zero (apenas avança data)
  if (periodResult <= 0) {
     const newState = {
      ...state,
      currentVirtualDate: now.toISOString(),
      lastPerformanceFactor: percentage,
    };
    saveSystemState(newState);
    return newState;
  }

  const transaction: Transaction = {
    id: generateId(),
    type: TransactionType.RESULT_DISTRIBUTION,
    amount: periodResult,
    date: now.toISOString(),
    status: TransactionStatus.COMPLETED,
    description: `Apuração Manual de Resultados (Ref: ${now.toLocaleDateString()})`,
    performanceFactor: percentage,
  };

  const newState = {
    ...state,
    balanceResults: state.balanceResults + periodResult,
    transactions: [transaction, ...state.transactions],
    currentVirtualDate: now.toISOString(),
    lastPerformanceFactor: percentage,
  };

  saveSystemState(newState);
  return newState;
};

export const approveTransaction = (transactionId: string): SystemState => {
  const state = getSystemState();
  const updatedTransactions = state.transactions.map(t => {
    if (t.id === transactionId) {
      return { ...t, status: TransactionStatus.COMPLETED, description: t.description + ' - Aprovado' };
    }
    return t;
  });

  const newState = {
    ...state,
    transactions: updatedTransactions,
    pendingApprovals: updatedTransactions.filter(t => t.status === TransactionStatus.ANALYSIS).length
  };
  saveSystemState(newState);
  return newState;
};

export const rejectTransaction = (transactionId: string): SystemState => {
  const state = getSystemState();
  // Find transaction to refund balance
  const tx = state.transactions.find(t => t.id === transactionId);
  
  if (!tx) return state;

  // Refund logic (reverse the subtraction done during request)
  let newCapital = state.balanceCapital;
  let newResults = state.balanceResults;

  if (tx.type === TransactionType.REDEMPTION_CAPITAL) {
    newCapital += tx.amount;
  } else if (tx.type === TransactionType.REDEMPTION_RESULT) {
    newResults += tx.amount;
  }

  const updatedTransactions = state.transactions.map(t => {
    if (t.id === transactionId) {
      return { ...t, status: TransactionStatus.REJECTED, description: t.description + ' - Rejeitado (Estornado)' };
    }
    return t;
  });

  const newState = {
    ...state,
    balanceCapital: newCapital,
    balanceResults: newResults,
    transactions: updatedTransactions,
    pendingApprovals: updatedTransactions.filter(t => t.status === TransactionStatus.ANALYSIS).length
  };
  saveSystemState(newState);
  return newState;
};

// --- END ADMIN FUNCTIONS ---

// Lógica de Performance Variável (Simulação automática para Demo)
export const processPerformanceDistribution = (): SystemState => {
  // Simula variação de mercado entre -0.1% e +0.8%
  const marketVolatility = (Math.random() * 0.9) - 0.1;
  const performancePercent = parseFloat(marketVolatility.toFixed(2));
  return processManualPerformance(performancePercent);
};

export const requestRedemption = (amount: number, type: 'CAPITAL' | 'RESULT', scheduledDate?: string, user?: UserProfile): { success: boolean; message: string; newState?: SystemState } => {
  const state = getSystemState();
  const currentDate = new Date(state.currentVirtualDate);
  const requestDate = scheduledDate ? new Date(scheduledDate) : currentDate;
  
  // Basic date validation
  if (scheduledDate && requestDate < new Date(currentDate.toDateString())) {
     return { success: false, message: 'A data do agendamento não pode ser retroativa.' };
  }

  if (type === 'RESULT') {
    if (amount > state.balanceResults) {
      return { success: false, message: 'Saldo de resultados insuficiente para liquidação.' };
    }
  }

  if (type === 'CAPITAL') {
    if (amount > state.balanceCapital) {
      return { success: false, message: 'Capital insuficiente.' };
    }
    
    // Check lockup against the REQUEST DATE, giving user benefit if they schedule for future
    const liquidCapital = state.investments
      .filter(inv => inv.status === 'ACTIVE' && new Date(inv.lockupDate) <= requestDate)
      .reduce((sum, inv) => sum + inv.amount, 0);

    if (amount > liquidCapital) {
       return { success: false, message: `Saldo bloqueado por carência contratual na data selecionada. Disponível: ${liquidCapital.toFixed(2)}` };
    }
  }

  const dateStr = scheduledDate ? new Date(scheduledDate).toLocaleDateString('pt-BR') : 'Imediato';

  const transaction: Transaction = {
    id: generateId(),
    type: type === 'CAPITAL' ? TransactionType.REDEMPTION_CAPITAL : TransactionType.REDEMPTION_RESULT,
    amount: amount,
    date: state.currentVirtualDate, // Record transaction at current time
    status: TransactionStatus.ANALYSIS, 
    description: `Solicitação de Resgate (${type === 'CAPITAL' ? 'Capital' : 'Resultados'}) - Agendado: ${dateStr}`,
    clientId: user?.id,
    clientName: user?.name,
  };

  const newState = {
    ...state,
    balanceCapital: type === 'CAPITAL' ? state.balanceCapital - amount : state.balanceCapital,
    balanceResults: type === 'RESULT' ? state.balanceResults - amount : state.balanceResults,
    totalRedeemed: state.totalRedeemed + amount,
    transactions: [transaction, ...state.transactions],
    pendingApprovals: state.pendingApprovals + 1
  };

  saveSystemState(newState);
  return { success: true, message: `Solicitação agendada para ${dateStr} enviada para análise.`, newState };
};

export const reinvestResults = (): { success: boolean; message: string; newState?: SystemState } => {
  const state = getSystemState();
  
  if (state.balanceResults <= 0) {
    return { success: false, message: 'Sem saldo de performance para novos aportes.' };
  }

  const amount = state.balanceResults;
  const now = new Date(state.currentVirtualDate);
  const lockupDate = new Date(now);
  lockupDate.setDate(lockupDate.getDate() + 90);

  const newInvestment: Investment = {
    id: generateId(),
    amount,
    startDate: now.toISOString(),
    lockupDate: lockupDate.toISOString(),
    status: 'ACTIVE',
  };

  const transactionOut: Transaction = {
    id: generateId(),
    type: TransactionType.REINVESTMENT,
    amount,
    date: now.toISOString(),
    status: TransactionStatus.COMPLETED,
    description: 'Reinvestimento de Resultados (Novo Contrato)',
  };

  const newState = {
    ...state,
    balanceResults: 0,
    balanceCapital: state.balanceCapital + amount,
    totalContributed: state.totalContributed + amount,
    investments: [newInvestment, ...state.investments],
    transactions: [transactionOut, ...state.transactions],
  };

  saveSystemState(newState);
  return { success: true, message: 'Novo aporte realizado com sucesso.', newState };
};