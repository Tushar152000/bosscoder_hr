import type { EncryptedField } from '@/lib/crypto/encrypt';

export type Cadence = 'monthly' | 'quarterly';
export type CycleStatus = 'draft' | 'open' | 'closed';
export type SubmissionStatus = 'not-started' | 'in-progress' | 'submitted' | 'locked';
export type SubmissionKind = 'self' | 'manager';

/** Review cycle (one window — e.g. "April 2026" or "Q2 2026"). */
export interface ReviewCycleStored {
  cycleId: string;
  name: string;
  cadence: Cadence;
  /** 1–12 when cadence === 'monthly'. */
  month: number | null;
  /** 1–4 when cadence === 'quarterly'. */
  quarter: number | null;
  year: number;
  status: CycleStatus;
  assignedAt: FirebaseFirestore.Timestamp | null;
  openedAt: FirebaseFirestore.Timestamp | null;
  closedAt: FirebaseFirestore.Timestamp | null;
  selfCount: number;
  managerCount: number;
  selfSubmittedCount: number;
  managerSubmittedCount: number;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface ReviewCycle {
  cycleId: string;
  name: string;
  cadence: Cadence;
  month: number | null;
  quarter: number | null;
  year: number;
  status: CycleStatus;
  assignedAt: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  selfCount: number;
  managerCount: number;
  selfSubmittedCount: number;
  managerSubmittedCount: number;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Self-evaluation answers (employee POV) — 5 reflection questions, no
 * employee-side ratings. The manager rating (filled separately on the
 * manager-eval form) is what drives the user's rating chart over time.
 */
export interface SelfEvalAnswers {
  /** Q1 — What contributions did you make in the last month and what was the resulting business impact? */
  contributions: string;
  /** Q2 — What are your key deliverables and the expected business impact for the upcoming month? */
  upcomingDeliverables: string;
  /** Q3 — Cultural pillars (Customer centric, Fast execution, Excellent quality) — how did you showcase them? */
  culturalPillars: string;
  /** Q4 — What was your biggest challenge this month and how did you handle it? */
  biggestChallenge: string;
  /** Q5 — What's one thing you learned or improved this month? */
  learnedOrImproved: string;
}

export const SELF_EVAL_QUESTION_KEYS: (keyof SelfEvalAnswers)[] = [
  'contributions',
  'upcomingDeliverables',
  'culturalPillars',
  'biggestChallenge',
  'learnedOrImproved',
];

export const SELF_EVAL_QUESTION_LABELS: Record<keyof SelfEvalAnswers, string> = {
  contributions:
    'What contributions did you make in the last month and what was the resulting business impact?',
  upcomingDeliverables:
    'According to you, what are your key deliverables and the expected business impact for the upcoming month?',
  culturalPillars:
    'Cultural pillars (Customer centric, Fast execution, Excellent quality) — how did you showcase them in your daily work in the last month?',
  biggestChallenge:
    'What was your biggest challenge this month and how did you handle it?',
  learnedOrImproved:
    'What is one thing you learned or improved this month?',
};

/** @deprecated Self-eval no longer collects ratings — the manager rating is
 *  the canonical rating now. Type kept around purely for backward-compat with
 *  records saved before the schema change. New submissions don't write it. */
export interface SelfEvalRatings {
  goalCompletion: number;
  collaboration: number;
  workChallenging: number;
}

/** Manager-evaluation 1–5 ratings (decimals allowed; 1 best, 5 worst). */
export interface ManagerEvalRatings {
  tasksAchievement: number;
  culturalRating: number;
  newInitiatives: number;
  takingFeedback: number;
  reliability: number;
}

export const MANAGER_RATING_KEYS: (keyof ManagerEvalRatings)[] = [
  'tasksAchievement',
  'culturalRating',
  'newInitiatives',
  'takingFeedback',
  'reliability',
];

export const MANAGER_RATING_LABELS: Record<keyof ManagerEvalRatings, string> = {
  tasksAchievement: 'Tasks Achievement',
  culturalRating: 'Cultural Rating',
  newInitiatives: 'New Initiatives',
  takingFeedback: 'Taking Feedback',
  reliability: 'Reliability',
};

export interface ReviewSubmissionStored {
  submissionId: string;
  cycleId: string;
  cycleName: string;
  kind: SubmissionKind;

  subjectEmployeeId: string;
  subjectName: string;
  subjectEmail: string;
  subjectDepartment: string;

  reviewerUid: string | null;
  reviewerEmployeeId: string | null;
  reviewerEmail: string;
  reviewerName: string;

  status: SubmissionStatus;

  selfAnswers: SelfEvalAnswers | null;
  selfRatings: SelfEvalRatings | null;

  managerRatings: ManagerEvalRatings | null;
  managerOverallRating: number | null;
  managerNotes: EncryptedField | null;

  submittedAt: FirebaseFirestore.Timestamp | null;
  lockedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export interface ReviewSubmission {
  submissionId: string;
  cycleId: string;
  cycleName: string;
  kind: SubmissionKind;

  subjectEmployeeId: string;
  subjectName: string;
  subjectEmail: string;
  subjectDepartment: string;

  reviewerUid: string | null;
  reviewerEmployeeId: string | null;
  reviewerEmail: string;
  reviewerName: string;

  status: SubmissionStatus;

  selfAnswers: SelfEvalAnswers | null;
  selfRatings: SelfEvalRatings | null;

  managerRatings: ManagerEvalRatings | null;
  managerOverallRating: number | null;
  /** Plaintext (already decrypted by the read helper, when authorized). */
  managerNotes: string | null;

  submittedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Form input — no derived fields, no audit metadata. */
export interface SelfEvalInput {
  answers: SelfEvalAnswers;
}

export interface ManagerEvalInput {
  ratings: ManagerEvalRatings;
  notes: string | null;
}

export function emptySelfEvalInput(): SelfEvalInput {
  return {
    answers: {
      contributions: '',
      upcomingDeliverables: '',
      culturalPillars: '',
      biggestChallenge: '',
      learnedOrImproved: '',
    },
  };
}

export function emptyManagerEvalInput(): ManagerEvalInput {
  return {
    ratings: {
      tasksAchievement: 3,
      culturalRating: 3,
      newInitiatives: 3,
      takingFeedback: 3,
      reliability: 3,
    },
    notes: null,
  };
}

/** Average of all five manager ratings (rounded to 2 decimals). 1 best — 5 worst. */
export function computeManagerOverall(r: ManagerEvalRatings): number {
  const sum =
    r.tasksAchievement + r.culturalRating + r.newInitiatives + r.takingFeedback + r.reliability;
  return Math.round((sum / 5) * 100) / 100;
}

/** Build a human cycle name from its parts (e.g. "April 2026", "Q2 2026"). */
export function buildCycleName(args: { cadence: Cadence; month: number | null; quarter: number | null; year: number }): string {
  if (args.cadence === 'monthly' && args.month) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[args.month - 1]} ${args.year}`;
  }
  if (args.cadence === 'quarterly' && args.quarter) {
    return `Q${args.quarter} ${args.year}`;
  }
  return `Cycle ${args.year}`;
}
