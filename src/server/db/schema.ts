/**
 * Database schema. Money is whole naira (integer). IDs are prefixed nanoids
 * (see `newId`) so they match the ids the frontend already uses.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const ts = (name: string) => timestamp(name, { withTimezone: true });

// ── Enums ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["driver", "owner"]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "verified",
  "action_needed",
]);
export const codePurposeEnum = pgEnum("code_purpose", [
  "email_verify",
  "password_reset",
]);
export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "sedan",
  "suv",
  "van",
  "electric",
  "pickup",
  "luxury",
]);
export const transmissionEnum = pgEnum("transmission", ["automatic", "manual"]);
export const fuelEnum = pgEnum("fuel", [
  "petrol",
  "diesel",
  "hybrid",
  "electric",
]);
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "pending_review",
  "live",
  "leased",
  "unlisted",
  "rejected",
]);
export const scheduleEnum = pgEnum("schedule", ["daily", "weekly", "monthly"]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "declined",
  "withdrawn",
]);
export const leaseStatusEnum = pgEnum("lease_status", [
  "active",
  "completed",
  "terminated",
]);
export const repaymentStatusEnum = pgEnum("repayment_status", [
  "upcoming",
  "due",
  "paid",
  "overdue",
]);
export const paymentChannelEnum = pgEnum("payment_channel", [
  "card",
  "transfer",
  "ussd",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "abandoned",
]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "scheduled",
  "processing",
  "paid",
  "failed",
]);
export const disputeCategoryEnum = pgEnum("dispute_category", [
  "damage",
  "payment",
  "vehicle_condition",
  "conduct",
  "other",
]);
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "in_review",
  "resolved",
]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "request_received",
  "request_approved",
  "request_declined",
  "payment_due",
  "payment_received",
  "payout_sent",
  "dispute_update",
  "kyc_update",
]);
export const uploadKindEnum = pgEnum("upload_kind", [
  "vehicle_photo",
  "registration",
  "licence",
  "evidence",
]);

// ── Accounts ────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: roleEnum("role"),
    phone: text("phone").notNull().default(""),
    city: text("city").notNull().default(""),
    emailVerifiedAt: ts("email_verified_at"),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
    kycNote: text("kyc_note"),
    onboarded: boolean("onboarded").notNull().default(false),
    staff: boolean("staff").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token. The token itself is never stored. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: codePurposeEnum("purpose").notNull(),
    /** HMAC of the code or token with AUTH_SECRET. */
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("codes_user_purpose_idx").on(t.userId, t.purpose)],
);

export const driverLicences = pgTable("driver_licences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  expiry: date("expiry").notNull(),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  updatedAt: updatedAt(),
});

export const payoutAccounts = pgTable("payout_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bankCode: text("bank_code").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  /** Paystack transfer recipient, created on the first payout. */
  recipientCode: text("recipient_code"),
  updatedAt: updatedAt(),
});

// ── Files ───────────────────────────────────────────────────────────────────
export const uploads = pgTable(
  "uploads",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: uploadKindEnum("kind").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("uploads_key_key").on(t.key)],
);

// ── Vehicles ────────────────────────────────────────────────────────────────
export const vehicles = pgTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    colour: text("colour").notNull(),
    plate: text("plate").notNull(),
    type: vehicleTypeEnum("type").notNull(),
    transmission: transmissionEnum("transmission").notNull(),
    seats: integer("seats").notNull(),
    fuel: fuelEnum("fuel").notNull(),
    city: text("city").notNull(),
    mileageKm: integer("mileage_km").notNull(),
    priceDaily: integer("price_daily").notNull(),
    priceWeekly: integer("price_weekly").notNull(),
    priceMonthly: integer("price_monthly").notNull(),
    status: vehicleStatusEnum("status").notNull().default("pending_review"),
    reviewNote: text("review_note"),
    registrationKey: text("registration_key"),
    registrationName: text("registration_name"),
    rating: numeric("rating", { precision: 2, scale: 1, mode: "number" })
      .notNull()
      .default(0),
    trips: integer("trips").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("vehicles_owner_idx").on(t.ownerId),
    index("vehicles_status_idx").on(t.status),
    // A plate can only be on one active listing. Rejected listings free it.
    uniqueIndex("vehicles_plate_active_key")
      .on(sql`upper(regexp_replace(${t.plate}, '\\W', '', 'g'))`)
      .where(sql`${t.status} <> 'rejected'`),
  ],
);

export const vehiclePhotos = pgTable(
  "vehicle_photos",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    /** `/files/<key>` for uploads, or an absolute URL for seed photos. */
    src: text("src").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("vehicle_photos_vehicle_idx").on(t.vehicleId, t.position)],
);

// ── Requests and leases ─────────────────────────────────────────────────────
export const leaseRequests = pgTable(
  "lease_requests",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schedule: scheduleEnum("schedule").notNull(),
    termMonths: integer("term_months").notNull(),
    startDate: date("start_date").notNull(),
    message: text("message").notNull().default(""),
    status: requestStatusEnum("status").notNull().default("pending"),
    declineReason: text("decline_reason"),
    decidedAt: ts("decided_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("requests_owner_idx").on(t.ownerId, t.status),
    index("requests_driver_idx").on(t.driverId, t.status),
    index("requests_vehicle_idx").on(t.vehicleId, t.status),
  ],
);

export const leases = pgTable(
  "leases",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => leaseRequests.id),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    driverId: text("driver_id")
      .notNull()
      .references(() => users.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    schedule: scheduleEnum("schedule").notNull(),
    termMonths: integer("term_months").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    deposit: integer("deposit").notNull(),
    depositPaidAt: ts("deposit_paid_at"),
    status: leaseStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("leases_request_key").on(t.requestId),
    index("leases_driver_idx").on(t.driverId),
    index("leases_owner_idx").on(t.ownerId),
    // One active lease per vehicle and per driver, enforced by the database
    // so two approvals racing each other can't both succeed.
    uniqueIndex("leases_active_vehicle_key")
      .on(t.vehicleId)
      .where(sql`${t.status} = 'active'`),
    uniqueIndex("leases_active_driver_key")
      .on(t.driverId)
      .where(sql`${t.status} = 'active'`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    /** Our reference, sent to Paystack. */
    reference: text("reference").notNull(),
    leaseId: text("lease_id")
      .notNull()
      .references(() => leases.id),
    repaymentId: text("repayment_id").notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => users.id),
    /** Total charged, in naira: repayment plus deposit when included. */
    amount: integer("amount").notNull(),
    depositAmount: integer("deposit_amount").notNull().default(0),
    channel: paymentChannelEnum("channel"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paystackId: text("paystack_id"),
    gatewayResponse: text("gateway_response"),
    paidAt: ts("paid_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("payments_reference_key").on(t.reference),
    index("payments_lease_idx").on(t.leaseId),
  ],
);

export const repayments = pgTable(
  "repayments",
  {
    id: text("id").primaryKey(),
    leaseId: text("lease_id")
      .notNull()
      .references(() => leases.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    dueDate: date("due_date").notNull(),
    amount: integer("amount").notNull(),
    status: repaymentStatusEnum("status").notNull(),
    paidAt: ts("paid_at"),
    paymentId: text("payment_id").references(() => payments.id),
  },
  (t) => [uniqueIndex("repayments_lease_index_key").on(t.leaseId, t.index)],
);

export const payouts = pgTable(
  "payouts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    /** Calendar month the payout covers, "YYYY-MM". */
    period: text("period").notNull(),
    amount: integer("amount").notNull().default(0),
    status: payoutStatusEnum("status").notNull().default("scheduled"),
    payDate: date("pay_date").notNull(),
    reference: text("reference"),
    transferCode: text("transfer_code"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payouts_owner_period_key").on(t.ownerId, t.period)],
);

/** Raw Paystack webhook events, kept for idempotency and audit. */
export const paystackEvents = pgTable(
  "paystack_events",
  {
    id: text("id").primaryKey(),
    event: text("event").notNull(),
    reference: text("reference").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: ts("processed_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("paystack_events_key").on(t.event, t.reference)],
);

// ── Disputes, notifications, support ────────────────────────────────────────
export const disputes = pgTable(
  "disputes",
  {
    id: text("id").primaryKey(),
    leaseId: text("lease_id")
      .notNull()
      .references(() => leases.id),
    openedBy: text("opened_by")
      .notNull()
      .references(() => users.id),
    category: disputeCategoryEnum("category").notNull(),
    subject: text("subject").notNull(),
    status: disputeStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("disputes_lease_idx").on(t.leaseId)],
);

export const disputeMessages = pgTable(
  "dispute_messages",
  {
    id: text("id").primaryKey(),
    disputeId: text("dispute_id")
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    /** Null for messages from RentARide support. */
    authorId: text("author_id").references(() => users.id),
    body: text("body").notNull().default(""),
    /** Upload keys. Images render inline, documents as file chips. */
    attachments: jsonb("attachments")
      .$type<{ key: string; name: string; contentType: string }[]>()
      .notNull()
      .default([]),
    createdAt: createdAt(),
  },
  (t) => [index("dispute_messages_dispute_idx").on(t.disputeId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: text("id").primaryKey(),
  ticket: text("ticket").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  createdAt: createdAt(),
});
