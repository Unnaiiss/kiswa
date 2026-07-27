import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/getSession";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — KISWA",
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");
  if (session?.role === "staff") redirect("/pos");

  const { redirect: redirectParam } = await searchParams;

  return <LoginForm redirectParam={redirectParam} />;
}
