import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <main className="flex flex-1 flex-col">
      <CheckoutForm />
    </main>
  );
}
