"use client";

import { useEffect, useState } from "react";
import { collection, limit as fsLimit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { stockMovementConverter } from "@/lib/firestore/converters";
import type { StockMovement } from "@/lib/firestore/types";
import type { MovementsBySaleId } from "./salesAggregation";

/**
 * Sale-driven stock movements (reason online_sale/offline_sale) in
 * [from, to], grouped by the sale they belong to (referenceId). This is
 * only a fallback data source for sales recorded before the oilMlUsed/
 * totalOilMlUsed snapshot existed on the sale doc itself — see
 * effectiveOilLines in salesAggregation.ts.
 */
export function useSaleMovementsInRange(from: Date, to: Date, limit = 5000) {
  const [movementsBySaleId, setMovementsBySaleId] = useState<MovementsBySaleId>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  const fromTime = from.getTime();
  const toTime = to.getTime();

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    const q = query(
      collection(db, "stockMovements").withConverter(stockMovementConverter),
      where("reason", "in", ["online_sale", "offline_sale"]),
      where("createdAt", ">=", new Date(fromTime)),
      where("createdAt", "<=", new Date(toTime)),
      orderBy("createdAt", "desc"),
      fsLimit(limit),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const map: MovementsBySaleId = new Map();
        for (const doc of snap.docs) {
          const movement: StockMovement = { id: doc.id, ...doc.data() };
          if (!movement.referenceId) continue;
          const list = map.get(movement.referenceId) ?? [];
          list.push(movement);
          map.set(movement.referenceId, list);
        }
        setMovementsBySaleId(map);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady, fromTime, toTime, limit]);

  return { movementsBySaleId, loading };
}
