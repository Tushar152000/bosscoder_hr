import type { AddressFields, EmployeeFull } from '@/types/employee';
import type { OnboardingAnswers } from '@/types/onboarding';

const sameAddress = (a: AddressFields, b: AddressFields) =>
  a.line1 === b.line1 && a.line2 === b.line2 && a.city === b.city && a.state === b.state && a.pincode === b.pincode;
const isBlank = (a: AddressFields) => !a.line1 && !a.line2 && !a.city && !a.state && !a.pincode;

/** The form pre-filled with whatever is already on the employee's record. */
export function answersFromEmployee(emp: EmployeeFull, flags: { noUan: boolean; firstJob: boolean }): OnboardingAnswers {
  return {
    phone: emp.phone,
    personalEmail: emp.personalEmail,
    dob: emp.dob,
    family: { ...emp.family },
    emergencyContact: { ...emp.emergencyContact },
    address: { ...emp.address },
    permanentSame: isBlank(emp.permanentAddress) || sameAddress(emp.address, emp.permanentAddress),
    permanentAddress: { ...emp.permanentAddress },
    pan: emp.identity.pan,
    aadhaar: emp.identity.aadhaar,
    uan: emp.uan,
    noUan: flags.noUan,
    firstJob: flags.firstJob,
    previousEmployment: { ...emp.previousEmployment },
  };
}
