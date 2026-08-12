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

// Same 10-digit Indian mobile / 6-digit PIN shape as
// components/store/checkout-form.tsx's PHONE_RE/PINCODE_RE — a delivery
// address needs a deliverable Indian number/PIN, unlike the account
// profile's own phone field above (kept loose/international there).
const ADDRESS_PHONE_RE = /^[6-9][0-9]{9}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

export const addressBodySchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(40),
  fullName: nameSchema,
  phone: z.string().trim().regex(ADDRESS_PHONE_RE, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().trim().min(1, "Address line 1 is required").max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1, "City is required").max(100),
  district: z.string().trim().min(1, "District is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
  landmark: z.string().trim().max(200).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const addressUpdateBodySchema = addressBodySchema.partial();

// Client-side mirror of addressBodySchema's phone/pincode checks, for the
// same "immediate feedback without importing the server schema" reason as
// passwordPolicyError above.
export function addressFieldErrors(form: {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}): Partial<Record<keyof typeof form, string>> {
  const errors: Partial<Record<keyof typeof form, string>> = {};
  if (!form.label.trim()) errors.label = "Label is required";
  if (!form.fullName.trim()) errors.fullName = "Name is required";
  if (!ADDRESS_PHONE_RE.test(form.phone.trim())) errors.phone = "Enter a valid 10-digit Indian mobile number";
  if (!form.line1.trim()) errors.line1 = "Address line 1 is required";
  if (!form.city.trim()) errors.city = "City is required";
  if (!form.district.trim()) errors.district = "District is required";
  if (!form.state.trim()) errors.state = "State is required";
  if (!PINCODE_RE.test(form.pincode.trim())) errors.pincode = "Enter a valid 6-digit PIN code";
  return errors;
}

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
