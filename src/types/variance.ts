export interface VarianceRecord {
  varianceType: string;
  customer: string;
  promotionName: string;
  sumOfVariance: number;
  lineKey?: string;
  promotionType?: string;
  productGroup?: string;
  lbe2ExpectedSpend?: number;
  throughput?: number;
  include?: boolean;
  account?: string;
  mecCustomer?: string;
  salesRep?: string;
  channel?: string;
  firstReceiver?: string;
  periodMonth?: string;
  periodYear?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface MonthlyData {
  id?: number;
  name: string;
  uploadDate: Date;
  month: string;
  year: number;
  records: VarianceRecord[];
}

export interface CommentaryDriver {
  description: string;
  amount: number;
}

export interface PromoTypeSection {
  promoType: string;
  total: number;
  drivers: CommentaryDriver[];
}

export interface CommentarySection {
  title: string;
  total: number;
  promoTypes: PromoTypeSection[];
}

export interface Commentary {
  changedSinceLBE2: CommentarySection;
  favorableClosures: CommentarySection;
  overPerformance: CommentarySection;
  promotionMiss: CommentarySection;
  totalVariance: number;
  summary: string;
}

export interface Filters {
  account: string;
  mecCustomer: string;
  salesRep: string;
  period: string; // "all" or "Month Year" format
}

// Mapping of variance types to commentary categories
export const VARIANCE_TYPE_MAPPING: Record<string, keyof Omit<Commentary, 'totalVariance' | 'summary'>> = {
  // Changed since LBE2 category
  'Promo Additions/Removals': 'changedSinceLBE2',
  'Promotion Additions': 'changedSinceLBE2',
  'Promotion Removals': 'changedSinceLBE2',
  'Promo Changes': 'changedSinceLBE2',

  // Favorable Closures category
  'Favorable Under Performance': 'favorableClosures',
  'Favorable No Performance': 'favorableClosures',

  // Over Performance category (unfavorable)
  'Under Accrued Variance': 'overPerformance',

  // Promotion Miss category (unfavorable)
  'Non-Accrued Variance': 'promotionMiss',
};

// Variance types that are excluded from commentary
export const EXCLUDED_VARIANCE_TYPES = [
  'Not Measured',
  'No Variance',
  'Vividly Accrual Rounding',
];
