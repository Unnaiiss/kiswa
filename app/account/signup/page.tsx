import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { sanitizeRedirect } from "@/lib/auth/safeRedirect";
import { AccountSignupForm } from "@/components/account/account-signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

interface AccountSignupPageProps {
  // email: prefills the form from checkout-success's "Create an account to
  // track all your orders" CTA — see lib/server/guestOrderLinking.ts for
  // how a matching future login/verification actually pulls their guest
  // orders into the new account (this param is purely a form convenience,
  // not itself part of the linking mechanism).
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

export default async function AccountSignupPage({ searchParams }: AccountSignupPageProps) {
  const session = await getCustomerSession();
  const { redirect: redirectParam, email } = await searchParams;
  if (session) redirect(sanitizeRedirect(redirectParam, "/"));

  return <AccountSignupForm redirectParam={redirectParam} emailParam={email} />;
}
