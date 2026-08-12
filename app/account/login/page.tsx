import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { sanitizeRedirect } from "@/lib/auth/safeRedirect";
import { AccountLoginForm } from "@/components/account/account-login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

interface AccountLoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function AccountLoginPage({ searchParams }: AccountLoginPageProps) {
  const session = await getCustomerSession();
  const { redirect: redirectParam } = await searchParams;
  if (session) redirect(sanitizeRedirect(redirectParam, "/"));

  return <AccountLoginForm redirectParam={redirectParam} />;
}
