'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { adminDb, Timestamp } from '@/lib/firebase/admin';
import {
  createEsopPlan,
  updateEsopPlan,
  deleteEsopPlan,
  createEsopGrant,
  updateEsopGrant,
  deleteEsopGrant,
} from '@/lib/firestore/esop';
import type { EsopGrantType } from '@/types/esop';

type ActionResult = { ok: true } | { ok: false; error: string };

async function requirePrivileged(): Promise<ActionResult | null> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Forbidden' };
  return null;
}

export async function createEsopPlanAction(fd: FormData): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await createEsopPlan({
      name: String(fd.get('name') ?? '').trim(),
      agmDate: Timestamp.fromDate(new Date(String(fd.get('agmDate')))),
      totalShares: Number(fd.get('totalShares')),
      faceValue: Number(fd.get('faceValue')),
      valuationTotal: Number(fd.get('valuationTotal')),
      perShareValue: Number(fd.get('perShareValue')),
      valuationYear: Number(fd.get('valuationYear')),
      type: String(fd.get('type')) as EsopGrantType,
    });
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateEsopPlanAction(planId: string, fd: FormData): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await updateEsopPlan(planId, {
      name: String(fd.get('name') ?? '').trim(),
      agmDate: Timestamp.fromDate(new Date(String(fd.get('agmDate')))),
      totalShares: Number(fd.get('totalShares')),
      faceValue: Number(fd.get('faceValue')),
      valuationTotal: Number(fd.get('valuationTotal')),
      perShareValue: Number(fd.get('perShareValue')),
      valuationYear: Number(fd.get('valuationYear')),
      type: String(fd.get('type')) as EsopGrantType,
    });
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteEsopPlanAction(planId: string): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await deleteEsopPlan(planId);
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createEsopGrantAction(fd: FormData): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await createEsopGrant({
      employeeId: String(fd.get('employeeId')),
      planId: String(fd.get('planId')),
      sharesGranted: Number(fd.get('sharesGranted')),
      sharesVested: Number(fd.get('sharesVested') ?? 0),
      grantDate: Timestamp.fromDate(new Date(String(fd.get('grantDate')))),
      vestingStartDate: Timestamp.fromDate(new Date(String(fd.get('vestingStartDate')))),
      cliffMonths: Number(fd.get('cliffMonths') ?? 12),
      vestingMonths: Number(fd.get('vestingMonths') ?? 48),
      vestingSchedule: [],
      status: 'active',
      notes: String(fd.get('notes') ?? ''),
    });
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateEsopGrantAction(grantId: string, fd: FormData): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await updateEsopGrant(grantId, {
      sharesGranted: Number(fd.get('sharesGranted')),
      sharesVested: Number(fd.get('sharesVested')),
      grantDate: Timestamp.fromDate(new Date(String(fd.get('grantDate')))),
      vestingStartDate: Timestamp.fromDate(new Date(String(fd.get('vestingStartDate')))),
      cliffMonths: Number(fd.get('cliffMonths')),
      vestingMonths: Number(fd.get('vestingMonths')),
      notes: String(fd.get('notes') ?? ''),
    });
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteEsopGrantAction(grantId: string): Promise<ActionResult> {
  const denied = await requirePrivileged();
  if (denied) return denied;
  try {
    await deleteEsopGrant(grantId);
    revalidatePath('/esop');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
