import type { Role, VehicleType } from "@/lib/types";

export type StepId = "basic" | "licence" | "vehicle" | "payout";

export type KycLevel = {
  /** Step that completes this level. Level 1 (email) has no step. */
  step: StepId | null;
  level: number;
  title: string;
  description: string;
};

const EMAIL_LEVEL: KycLevel = {
  step: null,
  level: 1,
  title: "Email verified",
  description: "Your email address is confirmed.",
};

const BASIC: Omit<KycLevel, "level"> = {
  step: "basic",
  title: "Basic details",
  description: "Phone number and city.",
};

const LEVELS: Record<Role, Omit<KycLevel, "level">[]> = {
  driver: [
    BASIC,
    {
      step: "licence",
      title: "Driver's licence",
      description: "Verify your identity to lease a vehicle.",
    },
  ],
  owner: [
    BASIC,
    {
      step: "vehicle",
      title: "Your vehicle",
      description: "Optional. Add the vehicle you want to list.",
    },
    {
      step: "payout",
      title: "Payout account",
      description: "Where your monthly earnings are paid.",
    },
  ],
};

/** Ordered KYC levels for a role. Level 1 is always the verified email. */
export function getKycLevels(role: Role): KycLevel[] {
  return [EMAIL_LEVEL, ...LEVELS[role].map((l, i) => ({ ...l, level: i + 2 }))];
}

/** Ordered onboarding steps for a role (everything after email). */
export function getSteps(role: Role): StepId[] {
  return LEVELS[role].map((l) => l.step as StepId);
}

export type VehicleDraft = {
  id: string;
  make: string;
  model: string;
  year: string;
  colour: string;
  plate: string;
  type: VehicleType;
  transmission: "automatic" | "manual";
  /** Weekly price in NGN. Daily and monthly prices are derived from it. */
  weeklyPrice: number;
  registrationDoc?: File;
  photo?: File;
  /** Downscaled photo kept for the listing. */
  photoDataUrl?: string;
};

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "pickup", label: "Pickup" },
  { value: "electric", label: "Electric" },
  { value: "luxury", label: "Luxury" },
];

export type OnboardingData = {
  phone: string;
  city: string;
  licenceNumber: string;
  licenceExpiry: string;
  licenceFile?: File;
  vehicles: VehicleDraft[];
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export const emptyOnboardingData: OnboardingData = {
  phone: "",
  city: "",
  licenceNumber: "",
  licenceExpiry: "",
  vehicles: [],
  bankCode: "",
  accountNumber: "",
  accountName: "",
};

export const BANKS = [
  { value: "044", label: "Access Bank" },
  { value: "063", label: "Access Bank (Diamond)" },
  { value: "050", label: "Ecobank Nigeria" },
  { value: "070", label: "Fidelity Bank" },
  { value: "011", label: "First Bank of Nigeria" },
  { value: "214", label: "First City Monument Bank" },
  { value: "00103", label: "Globus Bank" },
  { value: "058", label: "Guaranty Trust Bank" },
  { value: "030", label: "Heritage Bank" },
  { value: "082", label: "Keystone Bank" },
  { value: "50211", label: "Kuda Microfinance Bank" },
  { value: "50515", label: "Moniepoint MFB" },
  { value: "999992", label: "OPay" },
  { value: "999991", label: "PalmPay" },
  { value: "076", label: "Polaris Bank" },
  { value: "101", label: "Providus Bank" },
  { value: "221", label: "Stanbic IBTC Bank" },
  { value: "068", label: "Standard Chartered Bank" },
  { value: "232", label: "Sterling Bank" },
  { value: "032", label: "Union Bank of Nigeria" },
  { value: "033", label: "United Bank for Africa" },
  { value: "215", label: "Unity Bank" },
  { value: "035", label: "Wema Bank" },
  { value: "057", label: "Zenith Bank" },
];

/** Cities where vehicles can be listed. */
export const CITIES = [
  "Abeokuta",
  "Abuja",
  "Benin City",
  "Calabar",
  "Enugu",
  "Ibadan",
  "Ilorin",
  "Jos",
  "Kaduna",
  "Kano",
  "Lagos",
  "Owerri",
  "Port Harcourt",
  "Uyo",
  "Warri",
];
