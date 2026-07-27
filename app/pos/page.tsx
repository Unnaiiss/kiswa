import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/getSession";
import { BillingScreen } from "@/components/pos/billing-screen";

export const metadata: Metadata = {
  title: "POS — KISWA",
};

export default async function PosPage() {
  const session = await getSession();
  if (!session || (session.role !== "staff" && session.role !== "admin")) {
    redirect("/login?redirect=/pos");
  }

  return <BillingScreen staffName={session.name || session.email || "Staff"} />;
}
