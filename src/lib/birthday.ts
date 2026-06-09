import { format, parse, differenceInCalendarDays } from 'date-fns';

export function getDaysUntilBirthday(dateOfBirth: string): number {
  const today = new Date();
  const thisYear = today.getFullYear();
  const bday = parse(`${thisYear}-${dateOfBirth}`, 'yyyy-MM-dd', new Date());

  const diff = differenceInCalendarDays(bday, today);
  if (diff < 0) {
    const nextYear = parse(`${thisYear + 1}-${dateOfBirth}`, 'yyyy-MM-dd', new Date());
    return differenceInCalendarDays(nextYear, today);
  }
  return diff;
}

export function isBirthdayToday(dateOfBirth: string): boolean {
  const today = format(new Date(), 'MM-dd');
  return dateOfBirth === today;
}

export function getUpcomingBirthdays(
  employees: { employeeId: string; displayName: string; department?: string; dateOfBirth?: string }[]
) {
  return employees
    .filter((e) => e.dateOfBirth)
    .map((e) => ({
      id: e.employeeId,
      name: e.displayName,
      department: e.department,
      daysUntil: getDaysUntilBirthday(e.dateOfBirth!),
    }))
    .filter((e) => e.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
