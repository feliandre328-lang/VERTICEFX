export enum TransactionType {
  CONTRIBUTION = 'CONTRIBUTION', // Antigo Deposit
  REDEMPTION_CAPITAL = 'REDEMPTION_CAPITAL', // Antigo Withdrawal
  REDEMPTION_RESULT = 'REDEMPTION_RESULT',
  RESULT_DISTRIBUTION = 'RESULT_DISTRIBUTION', // Antigo Yield
  REFERRAL_CREDIT = 'REFERRAL_CREDIT', // Antigo Bonus
  REINVESTMENT = 'REINVESTMENT'
}

export enum TransactionStatus {
  ANALYSIS = 'ANALYSIS', // Antigo Pending
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export type UserRole = 'GUEST' | 'CLIENT' | 'ADMIN';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO String
  status: TransactionStatus;
  description: string;
  clientId?: string;
  clientName?: string;
  performanceFactor?: number;
}

export interface Investment {
  id: string;
  amount: number;
  startDate: string; // ISO String
  lockupDate: string; // Data de carência contratual
  status: 'ACTIVE' | 'LIQUIDATED';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  joinedDate: string;
  avatarUrl: string;
  isVerified: boolean;
  role: UserRole;
}

export interface Referral {
  id: string;
  name: string;
  joinedDate: string;
  status: 'ACTIVE' | 'PENDING';
  earnings: number;
}

export interface SystemState {
  balanceCapital: number;
  balanceResults: number; // Antigo Yields
  totalContributed: number;
  totalRedeemed: number;
  lastPerformanceFactor: number; // Variável, não fixo
  investments: Investment[];
  transactions: Transaction[];
  currentVirtualDate: string;
  pendingApprovals: number; // Contador para admin
  users: UserProfile[];
  referrals: Referral[];
}

export interface WithdrawalRequest {
  amount: number;
  type: 'CAPITAL' | 'RESULT';
}