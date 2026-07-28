"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { stockMovementConverter } from "@/lib/firestore/converters";
import type { StockMovement } from "@/lib/firestore/types";

interface UseStockMovementsOptions {
  productId?: string;
  limit?: number;
}

/**
 * Live movement history, optionally narrowed to a product. Backed by the
 * (productId, createdAt) composite index in firestore.indexes.json.
 */
export function useStockMovements({
  productId,
  limit = 200,
}: UseStockMovementsOptions) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const constraints: QueryConstraint[] = [];
    if (productId) constraints.push(where("productId", "==", productId));
    constraints.push(orderBy("createdAt", "desc"), fsLimit(limit));

    const q = query(
      collection(db, "stockMovements").withConverter(stockMovementConverter),
      ...constraints,
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMovements(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [productId, limit]);

  return { movements, loading };
}
