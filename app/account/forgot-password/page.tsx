import type { Metadata } from "next";
import { AccountForgotPasswordForm } from "@/components/account/account-forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function AccountForgotPasswordPage() {
  return <AccountForgotPasswordForm />;
}
