import { apiGet } from "@/lib/http";

export type Bank = { code: string; name: string };

/** Nigerian banks from Paystack (cached on the server for a day). */
export async function listBanks(): Promise<Bank[]> {
  return (await apiGet<{ banks: Bank[] }>("/api/banks")).banks;
}
