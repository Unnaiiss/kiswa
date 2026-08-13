"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { PackageCheck } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { saleConverter } from "@/lib/firestore/converters";
import type { Sale } from "@/lib/firestore/types";
import { normalizeOrderStatus } from "@/lib/orderFulfillment";

/** Live count of online orders not yet packed — "paid" is included in the
 * query alongside "pending"/"confirmed" since it's the legacy name for
 * 'confirmed' and real sale docs can still hold that literal string (see
 * normalizeOrderStatus); Firestore can only filter on the raw stored value,
 * so the query has to know about the old name too. No date bound —
 * unlike the rest of the dashboard, a stuck order from weeks ago is
 * exactly what this card exists to surface. */
export function OrdersNeedingActionPanel() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const q = query(
      collection(db, "sales").withConverter(saleConverter),
      where("channel", "==", "online"),
      where("orderStatus", "in", ["pending", "confirmed", "paid"]),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSales(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  const pendingCount = sales.filter((s) => normalizeOrderStatus(s.orderStatus) === "pending").length;
  const confirmedCount = sales.filter((s) => normalizeOrderStatus(s.orderStatus) === "confirmed").length;

  if (loading) return null;
  if (sales.length === 0) return null;

  return (
    <Link
      href="/admin/sales"
      className="block rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 transition-colors hover:border-amber-400/50"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-300">
        <PackageCheck size={16} />
        Orders needing action ({sales.length})
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        {pendingCount} pending confirmation, {confirmedCount} confirmed and ready to pack.
      </p>
    </Link>
  );
}
