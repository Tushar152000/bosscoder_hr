import type { EncryptedField } from '@/lib/crypto/encrypt';

export type EmploymentType = 'full-time' | 'intern' | 'contractor';
export type EmployeeStatus = 'active' | 'on-notice' | 'left';

/** Storage shape — what lives in Firestore. Sensitive fields are ciphertext. */
export interface EmployeeStored {
  employeeId: string;
  userUid: string | null;
  displayName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  designation: string;
  department: string;
  /** Departments this employee owns at the leadership level — they can view
   *  performance review submissions for everyone in those departments. */
  managedDepartments: string[];
  teamId: string | null;
  managerId: string | null;
  joiningDate: FirebaseFirestore.Timestamp;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  exitDate: FirebaseFirestore.Timestamp | null;
  active: boolean;
  searchTokens: string[];
  compensation: {
    ctc: EncryptedField | null;
    salary: EncryptedField | null;
    bonus: EncryptedField | null;
  };
  bank: {
    accountNumber: EncryptedField | null;
    ifsc: EncryptedField | null;
    beneficiaryName: EncryptedField | null;
  };
  identity: {
    pan: EncryptedField | null;
    aadhaar: EncryptedField | null;
  };
  address: {
    line1: EncryptedField | null;
    line2: EncryptedField | null;
    city: EncryptedField | null;
    state: EncryptedField | null;
    pincode: EncryptedField | null;
  };
  dob: EncryptedField | null;
  /** MM-DD only (e.g. "06-02") — no year stored for privacy. Used for birthday display. */
  dateOfBirth?: string;
  emergencyContact: {
    name: EncryptedField | null;
    phone: EncryptedField | null;
  };
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  createdBy: string;
  updatedBy: string;
}

/** Public, non-sensitive fields. Always safe to render. */
export interface EmployeePublic {
  employeeId: string;
  userUid: string | null;
  displayName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  designation: string;
  department: string;
  managedDepartments: string[];
  teamId: string | null;
  managerId: string | null;
  joiningDate: Date;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  exitDate: Date | null;
  active: boolean;
  /** MM-DD only (e.g. "06-02") — no year stored for privacy. */
  dateOfBirth?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Decrypted sensitive fields. Only returned to authorized callers. */
export interface EmployeeSensitive {
  compensation: {
    ctc: string | null;
    salary: string | null;
    bonus: string | null;
  };
  bank: {
    accountNumber: string | null;
    ifsc: string | null;
    beneficiaryName: string | null;
  };
  identity: {
    pan: string | null;
    aadhaar: string | null;
  };
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  dob: string | null;
  emergencyContact: {
    name: string | null;
    phone: string | null;
  };
}

export interface EmployeeFull extends EmployeePublic, EmployeeSensitive {}

/** Input shape for create/update forms. Sensitive fields as plaintext. */
export interface EmployeeInput {
  displayName: string;
  email: string;
  personalEmail: string | null;
  /** Mobile number — required on the form. Storage may still hold null for
   *  legacy records created before this field was mandatory. */
  phone: string;
  designation: string;
  department: string;
  managedDepartments: string[];
  teamId: string | null;
  managerId: string | null;
  joiningDate: string; // YYYY-MM-DD
  employmentType: EmploymentType;
  status: EmployeeStatus;
  exitDate: string | null;
  userUid: string | null;
  // Sensitive (plaintext on the wire — encrypted at rest server-side):
  compensation: {
    ctc: string | null;
    salary: string | null;
    bonus: string | null;
  };
  bank: {
    accountNumber: string | null;
    ifsc: string | null;
    beneficiaryName: string | null;
  };
  identity: {
    pan: string | null;
    aadhaar: string | null;
  };
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  dob: string | null;
  /** MM-DD only (e.g. "06-02") — no year for privacy. Used for birthday display. */
  dateOfBirth?: string | null;
  emergencyContact: {
    name: string | null;
    phone: string | null;
  };
}

export const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'intern', 'contractor'];
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['active', 'on-notice', 'left'];
