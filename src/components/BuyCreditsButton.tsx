"use client";

import { useState } from "react";

type BuyCreditsButtonProps = {
  className?: string;
  label?: string;
  onRedirecting?: () => void;
};

export function BuyCreditsButton({
  className,
  label = "Buy 5 credits ($1)",
  onRedirecting,
}: BuyCreditsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) {
        onRedirecting?.();
        window.location.href = data.url;
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      }
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}

