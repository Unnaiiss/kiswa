import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/getSession";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login?redirect=/admin");
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
