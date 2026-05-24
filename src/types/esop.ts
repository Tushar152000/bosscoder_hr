export type EsopGrantType = 'ESOP' | 'PSU';
export type EsopGrantStatus = 'active' | 'exercised' | 'lapsed';

export interface VestingMilestone {
  date: Date;
  shares: number;
}

export interface VestingMilestoneStored {
  date: FirebaseFirestore.Timestamp;
  shares: number;
}

/** Company-level plan created per AGM / board resolution. */
export interface EsopPlanStored {
  planId: string;
  name: string;
  agmDate: FirebaseFirestore.Timestamp;
  totalShares: number;
  faceValue: number;
  valuationTotal: number;
  perShareValue: number;
  valuationYear: number;
  type: EsopGrantType;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface EsopPlan {
  planId: string;
  name: string;
  agmDate: Date;
  totalShares: number;
  faceValue: number;
  valuationTotal: number;
  perShareValue: number;
  valuationYear: number;
  type: EsopGrantType;
}

/** Per-employee grant linked to a plan. */
export interface EsopGrantStored {
  grantId: string;
  employeeId: string;
  planId: string;
  sharesGranted: number;
  sharesVested: number;
  grantDate: FirebaseFirestore.Timestamp;
  vestingStartDate: FirebaseFirestore.Timestamp;
  cliffMonths: number;
  vestingMonths: number;
  vestingSchedule: VestingMilestoneStored[];
  status: EsopGrantStatus;
  notes: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface EsopGrant {
  grantId: string;
  employeeId: string;
  planId: string;
  sharesGranted: number;
  sharesVested: number;
  grantDate: Date;
  vestingStartDate: Date;
  cliffMonths: number;
  vestingMonths: number;
  vestingSchedule: VestingMilestone[];
  status: EsopGrantStatus;
  notes: string;
}

export interface EsopGrantWithPlan extends EsopGrant {
  plan: EsopPlan;
}
