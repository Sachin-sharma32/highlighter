import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Check, Zap, Loader2, Crown } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

const FREE_FEATURES = [
  "Up to 500 highlights",
  "5 highlight colors",
  "Chrome extension",
  "Basic search",
  "Tags & collections",
];

const PREMIUM_FEATURES = [
  "Unlimited highlights",
  "Custom highlight colors",
  "Chrome extension",
  "Advanced search",
  "Tags & collections",
  "Priority support",
  "Export to Markdown",
  "AI summaries (coming soon)",
];

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function PricingModal() {
  const { pricingModalOpen, setPricingModalOpen } = useAppStore();
  const usage = useQuery(api.billing.getUsage);
  const createOrder = useAction(api.billing.createOrder);
  const verifyPayment = useAction(api.billing.verifyPayment);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      await loadRazorpayScript();
      const order = await createOrder();

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Marginalia",
        description: "Premium Plan — Monthly",
        order_id: order.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success("Welcome to Premium! 🎉");
            setPricingModalOpen(false);
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: { color: "#7c3aed" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start payment"
      );
      setLoading(false);
    }
  }

  const price = usage?.pricePaise
    ? `₹${(usage.pricePaise / 100).toFixed(0)}`
    : "₹199";

  return (
    <Dialog open={pricingModalOpen} onOpenChange={setPricingModalOpen}>
      <DialogContent className="max-w-[640px] overflow-hidden rounded-2xl p-0">
        {/* Header */}
        <div className="bg-gradient-to-b from-violet-50 to-transparent px-8 pb-4 pt-8 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
            <Crown size={12} />
            Choose your plan
          </div>
          <h2 className="m-0 font-display text-[28px] font-semibold tracking-tight text-ink">
            Unlock your full reading potential
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-sm text-ink-3">
            Save unlimited highlights, customize your colors, and get access to
            upcoming AI features.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 gap-4 px-8 pb-8 pt-2">
          {/* Free */}
          <div className="flex flex-col rounded-xl border border-rule bg-paper p-5">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">
              Free
            </div>
            <div className="mb-4 flex items-baseline gap-1 font-display">
              <span className="text-4xl font-semibold text-ink">₹0</span>
              <span className="text-[13px] text-ink-4">/ forever</span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-ink-3">
                  <Check size={13} className="mt-0.5 shrink-0 text-ink-4" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="mt-5 flex h-9 items-center justify-center rounded-lg border border-rule bg-paper-2 text-xs font-medium text-ink-4"
              disabled
            >
              Current plan
            </button>
          </div>

          {/* Premium */}
          <div className="relative flex flex-col overflow-hidden rounded-xl border-2 border-violet-500 bg-paper p-5 shadow-lg">
            {/* Badge */}
            <div className="absolute right-3 top-3 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 px-2 py-0.5 text-[10px] font-medium text-white">
              Recommended
            </div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-violet-600">
              Premium
            </div>
            <div className="mb-4 flex items-baseline gap-1 font-display">
              <span className="text-4xl font-semibold text-ink">{price}</span>
              <span className="text-[13px] text-ink-4">/ month</span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-ink-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-violet-600" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => void handleUpgrade()}
              disabled={loading}
              className="mt-5 flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-medium text-white shadow-md transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              {loading ? "Processing…" : "Upgrade now"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
