import { notFound } from "next/navigation";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { GiftCardView } from "@/components/admin/sales/gift-card";

interface GiftCardPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminGiftCardPage({ params }: GiftCardPageProps) {
  const { id } = await params;
  const snap = await salesCollection().doc(id).get();
  const sale = snap.data();
  if (!snap.exists || !sale) notFound();

  const giftItems = sale.items.filter((item) => item.isGift);
  if (giftItems.length === 0) notFound();

  return <GiftCardView invoiceNo={sale.invoiceNo} giftItems={giftItems} />;
}
