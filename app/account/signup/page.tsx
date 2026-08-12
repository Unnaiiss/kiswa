import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { sanitizeRedirect } from "@/lib/auth/safeRedirect";
import { AccountSignupForm } from "@/components/account/account-signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

interface AccountSignupPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function AccountSignupPage({ searchParams }: AccountSignupPageProps) {
  const session = await getCustomerSession();
  const { redirect: redirectParam } = await searchParams;
  if (session) redirect(sanitizeRedirect(redirectParam, "/"));

  return <AccountSignupForm redirectParam={redirectParam} />;
}
