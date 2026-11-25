import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

/** Prefixed id, e.g. `usr_k3j9x0q2m1ab`. */
export const newId = (prefix: string) => `${prefix}_${nano()}`;

const refAlphabet = customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

/** Human-friendly reference, e.g. `RAR-7K2M41QX`. */
export const newReference = (prefix: string) => `${prefix}-${refAlphabet()}`;
