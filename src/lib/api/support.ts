import type { ApiResult } from "@/lib/types";
import { sendContactMessageAction } from "@/server/actions/account";

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "account", label: "My account or verification" },
  { value: "payments", label: "Payments and payouts" },
  { value: "listing", label: "Report a listing" },
  { value: "partnership", label: "Fleet or partnership enquiry" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const sendContactMessage = (input: {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}): Promise<ApiResult<{ ticket: string }>> => sendContactMessageAction(input);
