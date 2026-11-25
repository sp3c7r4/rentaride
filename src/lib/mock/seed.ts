import { addMonths, buildRepayments, depositFor } from "@/lib/pricing";
import type {
  AppNotification,
  Dispute,
  Lease,
  LeaseRequest,
  Payout,
  User,
  Vehicle,
  VehicleType,
} from "@/lib/types";

/** Shape of the demo data. Loaded into Postgres by `npm run db:seed`. */
export type Db = {
  version: number;
  users: User[];
  vehicles: Vehicle[];
  requests: LeaseRequest[];
  leases: Lease[];
  payouts: Payout[];
  disputes: Dispute[];
  notifications: AppNotification[];
};

export const DEMO_DRIVER_EMAIL = "driver@demo.rentaride.ng";
export const DEMO_OWNER_EMAIL = "owner@demo.rentaride.ng";
export const DEMO_REVIEWER_EMAIL = "review@demo.rentaride.ng";

/** Staff reviewer and a driver waiting for KYC review (added in DB v5). */
export function seedReviewUsers(): User[] {
  return [
    user(
      "usr_reviewer",
      "Funmi",
      "Adeyemi",
      DEMO_REVIEWER_EMAIL,
      null,
      "Lagos",
      { staff: true },
    ),
    user(
      "usr_kemi",
      "Kemi",
      "Oladipo",
      "kemi@example.com",
      "driver",
      "Ibadan",
      {
        phone: "0812 456 7788",
        kycStatus: "pending",
        createdAt: daysAgo(1),
        licence: {
          number: "OYO44120CD07",
          expiry: "2029-02-14",
          fileName: "kemi-licence.jpg",
        },
      },
    ),
  ];
}

const unsplash = (id: string, extra = "") =>
  `https://images.unsplash.com/${id}?w=1600&q=75&auto=format&fit=crop${extra}`;

/**
 * Seed photos have one shot per car, so the gallery uses focal-point crops of
 * that shot as detail views (front, rear, wheel). Real listings use uploads.
 */
const angles = (id: string) => [
  unsplash(id, "&crop=focalpoint&fp-x=0.3&fp-y=0.55&fp-z=1.8"),
  unsplash(id, "&crop=focalpoint&fp-x=0.72&fp-y=0.5&fp-z=1.8"),
  unsplash(id, "&crop=focalpoint&fp-x=0.62&fp-y=0.72&fp-z=2.6"),
];

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function user(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: User["role"],
  city: string,
  extra: Partial<User> = {},
): User {
  return {
    id,
    firstName,
    lastName,
    email,
    role,
    phone: "0803 000 0000",
    city,
    kycStatus: "verified",
    onboarded: true,
    createdAt: daysAgo(180),
    ...extra,
  };
}

let plateSeq = 0;

function vehicle(
  id: string,
  ownerId: string,
  make: string,
  model: string,
  year: number,
  type: VehicleType,
  city: string,
  weekly: number,
  photo: string,
  extra: Partial<Vehicle> = {},
): Vehicle {
  return {
    id,
    ownerId,
    make,
    model,
    year,
    colour: "Silver",
    plate: `${city.slice(0, 3).toUpperCase()}-${((214 + plateSeq++ * 53) % 900) + 100}${"ABCDEFGH"[plateSeq % 8]}K`,
    type,
    transmission: "automatic",
    seats: type === "van" ? 12 : type === "pickup" ? 5 : 5,
    fuel: type === "electric" ? "electric" : "petrol",
    city,
    mileageKm: (2026 - year) * 14_000,
    pricing: {
      daily: Math.round(weekly / 6 / 500) * 500,
      weekly,
      monthly: weekly * 4,
    },
    photo: unsplash(photo),
    gallery: angles(photo),
    status: "live",
    rating: 4.6,
    trips: 12,
    createdAt: daysAgo(120),
    ...extra,
  };
}

export function createSeed(): Db {
  plateSeq = 0;
  const owner = user(
    "usr_owner_demo",
    "Adaeze",
    "Nwosu",
    DEMO_OWNER_EMAIL,
    "owner",
    "Abuja",
    {
      payoutAccount: {
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "ADAEZE NWOSU",
      },
    },
  );
  const driver = user(
    "usr_driver_demo",
    "Emeka",
    "Okafor",
    DEMO_DRIVER_EMAIL,
    "driver",
    "Lagos",
    { licence: { number: "LAG12345AA01", expiry: "2028-06-30" } },
  );
  const tunde = user(
    "usr_tunde",
    "Tunde",
    "Bakare",
    "tunde@example.com",
    "driver",
    "Abuja",
    { licence: { number: "ABJ55312BB02", expiry: "2027-11-15" } },
  );
  const ibrahim = user(
    "usr_ibrahim",
    "Ibrahim",
    "Musa",
    "ibrahim@example.com",
    "owner",
    "Kano",
  );
  const ngozi = user(
    "usr_ngozi",
    "Ngozi",
    "Eze",
    "ngozi@example.com",
    "owner",
    "Port Harcourt",
  );

  const vehicles: Vehicle[] = [
    vehicle(
      "veh_camry",
      owner.id,
      "Toyota",
      "Camry",
      2019,
      "sedan",
      "Lagos",
      45_000,
      "photo-1621007947382-bb3c3994e3fb",
      { colour: "Grey", status: "leased", rating: 4.8, trips: 31 },
    ),
    vehicle(
      "veh_expedition",
      owner.id,
      "Ford",
      "Expedition",
      2018,
      "suv",
      "Abuja",
      70_000,
      "photo-1533473359331-0135ef1b58bf",
      { colour: "White", seats: 7, rating: 4.7, trips: 18 },
    ),
    vehicle(
      "veh_mustang",
      owner.id,
      "Ford",
      "Mustang",
      2017,
      "luxury",
      "Abuja",
      100_000,
      "photo-1494976388531-d1058494cdd8",
      {
        colour: "Orange",
        seats: 4,
        status: "pending_review",
        rating: 0,
        trips: 0,
        createdAt: daysAgo(2),
      },
    ),
    vehicle(
      "veh_gtr",
      owner.id,
      "Nissan",
      "GT-R",
      2018,
      "luxury",
      "Lagos",
      150_000,
      "photo-1568605117036-5fe5e7bab0b7",
      { colour: "Silver", seats: 4, rating: 4.9, trips: 9 },
    ),
    vehicle(
      "veh_audi_a6",
      ibrahim.id,
      "Audi",
      "A6 Avant",
      2020,
      "luxury",
      "Kano",
      95_000,
      "photo-1606664515524-ed2f786a0bd6",
      { colour: "Black", rating: 4.9, trips: 44 },
    ),
    vehicle(
      "veh_juke",
      ibrahim.id,
      "Nissan",
      "Juke",
      2019,
      "suv",
      "Kano",
      42_000,
      "photo-1609521263047-f8f205293f24",
      { colour: "Grey", transmission: "manual", rating: 4.5, trips: 22 },
    ),
    vehicle(
      "veh_accent",
      ibrahim.id,
      "Hyundai",
      "Accent",
      2020,
      "sedan",
      "Lagos",
      40_000,
      "photo-1619767886558-efdc259cde1a",
      { colour: "Black", rating: 4.6, trips: 38 },
    ),
    vehicle(
      "veh_gle",
      ngozi.id,
      "Mercedes-Benz",
      "GLE Coupe",
      2019,
      "luxury",
      "Lagos",
      130_000,
      "photo-1590362891991-f776e747a588",
      { colour: "White", rating: 4.8, trips: 12 },
    ),
    vehicle(
      "veh_bmw4",
      ngozi.id,
      "BMW",
      "4 Series",
      2019,
      "luxury",
      "Port Harcourt",
      115_000,
      "photo-1580273916550-e323be2ae537",
      { colour: "Grey", seats: 4, rating: 4.7, trips: 16 },
    ),
    vehicle(
      "veh_fiat500",
      ngozi.id,
      "Fiat",
      "500",
      2018,
      "sedan",
      "Port Harcourt",
      32_000,
      "photo-1549317661-bd32c8ce0db2",
      {
        colour: "Blue",
        seats: 4,
        transmission: "manual",
        rating: 4.4,
        trips: 27,
      },
    ),
  ];

  // Demo driver's active lease on the Camry: weekly, 6 months, ~9 weeks in.
  const leaseStart = new Date(Date.now() - 63 * DAY);
  const camry = vehicles[0];
  const leaseRequest: LeaseRequest = {
    id: "req_camry",
    vehicleId: camry.id,
    driverId: driver.id,
    ownerId: owner.id,
    schedule: "weekly",
    termMonths: 6,
    startDate: leaseStart.toISOString(),
    message: "I drive for a ride-hailing app full time in Lagos.",
    status: "approved",
    createdAt: daysAgo(70),
    decidedAt: daysAgo(68),
  };
  const lease: Lease = {
    id: "lse_camry",
    requestId: leaseRequest.id,
    vehicleId: camry.id,
    driverId: driver.id,
    ownerId: owner.id,
    schedule: "weekly",
    termMonths: 6,
    startDate: leaseStart.toISOString(),
    endDate: addMonths(leaseStart, 6).toISOString(),
    deposit: depositFor(camry.pricing.weekly),
    status: "active",
    repayments: buildRepayments(
      leaseStart,
      "weekly",
      6,
      camry.pricing.weekly,
      new Date(),
      "rp_camry",
    ),
    createdAt: daysAgo(68),
  };

  // Pending request on the CR-V from another driver, for the owner to review.
  const pendingRequest: LeaseRequest = {
    id: "req_expedition_tunde",
    vehicleId: "veh_expedition",
    driverId: tunde.id,
    ownerId: owner.id,
    schedule: "monthly",
    termMonths: 12,
    startDate: new Date(Date.now() + 7 * DAY).toISOString(),
    message:
      "Looking for a reliable SUV for airport runs in Abuja. Happy to pay monthly.",
    status: "pending",
    createdAt: daysAgo(1),
  };

  // Owner payouts: 2 paid months plus the scheduled one.
  const month = (offset: number) => {
    const d = addMonths(new Date(), offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const payDate = (offset: number) => {
    const d = addMonths(new Date(), offset);
    d.setDate(5);
    return d.toISOString();
  };
  const weeklyShare = camry.pricing.weekly * 4 * 0.8;
  const payouts: Payout[] = [
    {
      id: "pay_1",
      ownerId: owner.id,
      period: month(-2),
      amount: weeklyShare,
      status: "paid",
      payDate: payDate(-1),
      reference: "PO-7K2M41",
    },
    {
      id: "pay_2",
      ownerId: owner.id,
      period: month(-1),
      amount: weeklyShare,
      status: "paid",
      payDate: payDate(0),
      reference: "PO-9QW3C8",
    },
    {
      id: "pay_3",
      ownerId: owner.id,
      period: month(0),
      amount: weeklyShare,
      status: "scheduled",
      payDate: payDate(1),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: "ntf_1",
      userId: owner.id,
      kind: "request_received",
      title: "New lease request",
      body: "Tunde Bakare wants to lease your Ford Expedition for 12 months.",
      href: "/dashboard/requests",
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: "ntf_2",
      userId: owner.id,
      kind: "payout_sent",
      title: "Payout sent",
      body: "Your payout for last month has been sent to GTBank ••••6789.",
      href: "/dashboard/payouts",
      read: true,
      createdAt: daysAgo(10),
    },
    {
      id: "ntf_3",
      userId: driver.id,
      kind: "payment_due",
      title: "Repayment due soon",
      body: "Your weekly repayment for the Toyota Camry is due this week.",
      href: "/dashboard/leases",
      read: false,
      createdAt: daysAgo(0),
    },
    {
      id: "ntf_4",
      userId: driver.id,
      kind: "payment_received",
      title: "Payment received",
      body: "We received your weekly repayment. Thank you.",
      href: "/dashboard/payments",
      read: true,
      createdAt: daysAgo(7),
    },
  ];

  return {
    version: 5,
    users: [owner, driver, tunde, ibrahim, ngozi, ...seedReviewUsers()],
    vehicles,
    requests: [leaseRequest, pendingRequest],
    leases: [lease],
    payouts,
    disputes: seedDisputes(driver.id, owner.id),
    notifications,
  };
}

/** Demo dispute on the Camry lease so the disputes pages have content. */
export function seedDisputes(driverId: string, ownerId: string): Dispute[] {
  const at = (days: number, minutes = 0) =>
    new Date(Date.now() - days * DAY + minutes * 60_000).toISOString();
  return [
    {
      id: "dsp_camry_ac",
      leaseId: "lse_camry",
      openedBy: driverId,
      category: "vehicle_condition",
      subject: "Air conditioning stopped working",
      status: "in_review",
      createdAt: at(4),
      messages: [
        {
          id: "msg_ac_1",
          authorId: driverId,
          body: "The AC stopped blowing cold air on Monday afternoon on the Third Mainland Bridge. I can't drive passengers like this in Lagos heat. Can the owner arrange a repair?",
          createdAt: at(4),
        },
        {
          id: "msg_ac_2",
          authorId: "support",
          body: "Thanks for reporting this. A case manager has been assigned and will review the details and evidence with both parties. Expect an update within 2 working days.",
          createdAt: at(4, 1),
        },
        {
          id: "msg_ac_3",
          authorId: ownerId,
          body: "Sorry about this. My mechanic in Yaba can look at it on Thursday morning. I'll cover the cost.",
          createdAt: at(3),
        },
      ],
    },
  ];
}
