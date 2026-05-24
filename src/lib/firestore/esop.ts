import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import type {
  EsopGrant,
  EsopGrantStored,
  EsopGrantWithPlan,
  EsopPlan,
  EsopPlanStored,
  VestingMilestone,
} from '@/types/esop';

const PLANS = HR.esopPlans;
const GRANTS = HR.esopGrants;

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date {
  return ts?.toDate() ?? new Date(0);
}

function toPlan(d: EsopPlanStored): EsopPlan {
  return {
    planId: d.planId,
    name: d.name,
    agmDate: tsToDate(d.agmDate),
    totalShares: d.totalShares,
    faceValue: d.faceValue,
    valuationTotal: d.valuationTotal,
    perShareValue: d.perShareValue,
    valuationYear: d.valuationYear,
    type: d.type,
  };
}

function toGrant(d: EsopGrantStored): EsopGrant {
  const vestingSchedule: VestingMilestone[] = (d.vestingSchedule ?? []).map((m) => ({
    date: tsToDate(m.date),
    shares: m.shares,
  }));
  return {
    grantId: d.grantId,
    employeeId: d.employeeId,
    planId: d.planId,
    sharesGranted: d.sharesGranted,
    sharesVested: d.sharesVested,
    grantDate: tsToDate(d.grantDate),
    vestingStartDate: tsToDate(d.vestingStartDate),
    cliffMonths: d.cliffMonths ?? 12,
    vestingMonths: d.vestingMonths ?? 48,
    vestingSchedule,
    status: d.status ?? 'active',
    notes: d.notes ?? '',
  };
}

export async function listEsopPlans(): Promise<EsopPlan[]> {
  const snap = await adminDb.collection(PLANS).orderBy('agmDate', 'desc').get();
  return snap.docs.map((d) => toPlan(d.data() as EsopPlanStored));
}

export async function getEsopPlan(planId: string): Promise<EsopPlan | null> {
  const doc = await adminDb.collection(PLANS).doc(planId).get();
  if (!doc.exists) return null;
  return toPlan(doc.data() as EsopPlanStored);
}

export async function createEsopPlan(
  data: Omit<EsopPlanStored, 'planId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = adminDb.collection(PLANS).doc();
  const stored: EsopPlanStored = {
    ...data,
    planId: ref.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(stored);
  return ref.id;
}

export async function updateEsopPlan(
  planId: string,
  data: Partial<Omit<EsopPlanStored, 'planId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await adminDb.collection(PLANS).doc(planId).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteEsopPlan(planId: string): Promise<void> {
  await adminDb.collection(PLANS).doc(planId).delete();
}

export async function listGrantsForEmployee(employeeId: string): Promise<EsopGrantWithPlan[]> {
  const snap = await adminDb.collection(GRANTS).where('employeeId', '==', employeeId).get();
  if (snap.empty) return [];
  const grants = snap.docs.map((d) => toGrant(d.data() as EsopGrantStored));
  const planIds = [...new Set(grants.map((g) => g.planId))];
  const planDocs = await Promise.all(planIds.map((id) => getEsopPlan(id)));
  const planMap = new Map(planDocs.filter(Boolean).map((p) => [p!.planId, p!]));
  return grants
    .filter((g) => planMap.has(g.planId))
    .map((g) => ({ ...g, plan: planMap.get(g.planId)! }))
    .sort((a, b) => b.plan.agmDate.getTime() - a.plan.agmDate.getTime());
}

export async function listAllGrants(): Promise<EsopGrant[]> {
  const snap = await adminDb.collection(GRANTS).orderBy('grantDate', 'desc').get();
  return snap.docs.map((d) => toGrant(d.data() as EsopGrantStored));
}

export async function createEsopGrant(
  data: Omit<EsopGrantStored, 'grantId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = adminDb.collection(GRANTS).doc();
  const stored: EsopGrantStored = {
    ...data,
    grantId: ref.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(stored);
  return ref.id;
}

export async function updateEsopGrant(
  grantId: string,
  data: Partial<Omit<EsopGrantStored, 'grantId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await adminDb.collection(GRANTS).doc(grantId).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteEsopGrant(grantId: string): Promise<void> {
  await adminDb.collection(GRANTS).doc(grantId).delete();
}

export async function listGrantsForPlan(planId: string): Promise<EsopGrant[]> {
  const snap = await adminDb.collection(GRANTS).where('planId', '==', planId).get();
  return snap.docs.map((d) => toGrant(d.data() as EsopGrantStored));
}

/** Backfill vestingSchedule for a grant that uses cliffMonths/vestingMonths model. */
export function deriveVestingSchedule(grant: EsopGrant): VestingMilestone[] {
  if (grant.vestingSchedule.length > 0) return grant.vestingSchedule;
  const years = grant.vestingMonths / 12;
  const sharesPerYear = Math.floor(grant.sharesGranted / years);
  const schedule: VestingMilestone[] = [];
  for (let i = 1; i <= years; i++) {
    const d = new Date(grant.vestingStartDate);
    d.setMonth(d.getMonth() + grant.cliffMonths - 12 + i * 12);
    schedule.push({ date: d, shares: i === years ? grant.sharesGranted - sharesPerYear * (years - 1) : sharesPerYear });
  }
  return schedule;
}
