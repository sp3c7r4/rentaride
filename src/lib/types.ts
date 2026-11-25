/** Domain types shared by the mock API and the UI. */

export type Role = "driver" | "owner";
export type Schedule = "daily" | "weekly" | "monthly";
export type TermMonths = 3 | 6 | 12;
export type KycStatus = "pending" | "verified" | "action_needed";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role | null;
  phone: string;
  city: string;
  kycStatus: KycStatus;
  onboarded: boolean;
  createdAt: string;
  /** RentARide staff who review KYC and listings. Staff have no role. */
  staff?: boolean;
  /** Reviewer feedback when verification needs action. */
  kycNote?: string;
  /** Driver only. */
  licence?: { number: string; expiry: string; fileName?: string };
  /** Owner only. */
  payoutAccount?: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
};

export type VehicleType =
  | "sedan"
  | "suv"
  | "van"
  | "electric"
  | "pickup"
  | "luxury";

export type VehicleStatus =
  | "pending_review"
  | "live"
  | "leased"
  | "unlisted"
  | "rejected";

export type Vehicle = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  plate: string;
  type: VehicleType;
  transmission: "automatic" | "manual";
  seats: number;
  fuel: "petrol" | "diesel" | "hybrid" | "electric";
  city: string;
  mileageKm: number;
  /** Price in NGN per repayment period. */
  pricing: Record<Schedule, number>;
  /** Cover photo. */
  photo: string;
  /** Additional photos shown in the gallery, after the cover. */
  gallery?: string[];
  /** File name of the registration document on file. */
  registrationDoc?: string;
  /** Reviewer feedback when a listing needs changes. */
  reviewNote?: string;
  status: VehicleStatus;
  rating: number;
  trips: number;
  createdAt: string;
};

export type RequestStatus = "pending" | "approved" | "declined" | "withdrawn";

export type LeaseRequest = {
  id: string;
  vehicleId: string;
  driverId: string;
  ownerId: string;
  schedule: Schedule;
  termMonths: TermMonths;
  startDate: string;
  message: string;
  status: RequestStatus;
  declineReason?: string;
  createdAt: string;
  decidedAt?: string;
};

export type LeaseStatus = "active" | "completed" | "terminated";

export type RepaymentStatus = "upcoming" | "due" | "paid" | "overdue";

export type Repayment = {
  id: string;
  index: number;
  dueDate: string;
  amount: number;
  status: RepaymentStatus;
  paidAt?: string;
  reference?: string;
  method?: "card" | "transfer" | "ussd";
};

export type Lease = {
  id: string;
  requestId: string;
  vehicleId: string;
  driverId: string;
  ownerId: string;
  schedule: Schedule;
  termMonths: TermMonths;
  startDate: string;
  endDate: string;
  deposit: number;
  status: LeaseStatus;
  repayments: Repayment[];
  createdAt: string;
};

export type PayoutStatus = "scheduled" | "paid";

export type Payout = {
  id: string;
  ownerId: string;
  /** Calendar month the payout covers, "YYYY-MM". */
  period: string;
  amount: number;
  status: PayoutStatus;
  payDate: string;
  reference?: string;
};

export type DisputeCategory =
  | "damage"
  | "payment"
  | "vehicle_condition"
  | "conduct"
  | "other";

export type DisputeStatus = "open" | "in_review" | "resolved";

export type DisputeMessage = {
  id: string;
  authorId: string | "support";
  body: string;
  createdAt: string;
  attachments?: string[];
};

export type Dispute = {
  id: string;
  leaseId: string;
  openedBy: string;
  category: DisputeCategory;
  subject: string;
  status: DisputeStatus;
  messages: DisputeMessage[];
  createdAt: string;
};

export type NotificationKind =
  | "request_received"
  | "request_approved"
  | "request_declined"
  | "payment_due"
  | "payment_received"
  | "payout_sent"
  | "dispute_update"
  | "kyc_update";

export type AppNotification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type ApiResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };
