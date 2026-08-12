import { z } from "zod";

// Firebase's own default minimum is 6 characters — deliberately stronger
// here per the "enforce a minimum password policy" requirement. Enforced
// both client-side (immediate feedback) and server-side (defense in depth,
// since a client check alone can always be bypassed by calling the API
// directly).
export const PASSWORD_MIN_LENGTH = 8;
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[a-zA-Z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

const nameSchema = z.string().trim().min(1, "Name is required").max(100);

// Loose on purpose (international-friendly) — just enough to catch obvious
// typos, not a strict E.164/country-specific validator.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number")
  .nullable()
  .optional();

// Signup creates the Firebase Auth user SERVER-SIDE (via adminAuth.createUser
// in app/api/account/signup) rather than trusting the client's own
// createUserWithEmailAndPassword call — that's the only way this password
// policy is actually enforced, not just suggested: a raw password never
// reaches this schema if the client creates the Auth user itself, since only
// an idToken would cross the wire afterward, and idTokens carry no password.
export const signupBodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  marketingOptIn: z.boolean().default(false),
});

export const sessionBodySchema = z.object({
  idToken: z.string().min(1),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const profileUpdateBodySchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema,
  marketingOptIn: z.boolean().optional(),
});

/** Client-side password check mirroring passwordSchema, for inline form
 * validation without importing the whole zod schema into a "use client"
 * bundle path that also touches server-only code. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter";
  if (!/[0-9]/.test(password)) return "Password must include at least one number";
  return null;
}
