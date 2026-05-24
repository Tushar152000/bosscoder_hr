const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatINR(amount: number): string {
  return '₹' + new Intl.NumberFormat('en-IN').format(Math.round(amount));
}

export function formatLakh(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return formatINR(amount);
}

export function formatShares(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatDateObj(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export type VestingStatus = 'done' | 'next' | 'future';

export function vestingStatus(date: Date, now = new Date()): VestingStatus {
  if (date <= now) return 'done';
  const nearFuture = new Date(now);
  nearFuture.setMonth(nearFuture.getMonth() + 13);
  if (date <= nearFuture) return 'next';
  return 'future';
}
