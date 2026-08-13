import { notFound } from "next/navigation";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { PackingSlip } from "@/components/admin/sales/packing-slip";

interface PackingSlipPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPackingSlipPage({ params }: PackingSlipPageProps) {
  const { id } = await params;
  const snap = await salesCollection().doc(id).get();
  const sale = snap.data();
  if (!snap.exists || !sale) notFound();

  return <PackingSlip sale={{ id: snap.id, ...sale }} />;
}
