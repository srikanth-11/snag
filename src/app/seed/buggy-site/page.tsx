"use client";

import { useState } from "react";

// A deliberately buggy target for developing and demoing the agent.
// Planted bugs: (1) Apply throws an uncaught TypeError, (2) Load cart hits a
// 500, (3) a dead link 404s, (4) the coupon field accepts anything silently.
export default function BuggyCheckout() {
  const [coupon, setCoupon] = useState("");

  function applyCoupon() {
    const cart: { total?: number } | null = null;
    // @ts-expect-error — planted bug: reading through null throws at runtime.
    alert(`New total: ${cart.total.toFixed(2)}`);
  }

  async function loadCart() {
    await fetch("/seed/api/boom");
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "system-ui", color: "#111" }}>
      <h1>Demo Checkout</h1>
      <p>Apply a coupon and load your cart.</p>

      <label htmlFor="coupon">Coupon</label>
      <br />
      <input
        id="coupon"
        value={coupon}
        onChange={(e) => setCoupon(e.target.value)}
        placeholder="Coupon code"
        style={{ padding: 8, width: "100%", margin: "8px 0" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={applyCoupon} style={{ padding: "8px 16px" }}>
          Apply
        </button>
        <button onClick={loadCart} style={{ padding: "8px 16px" }}>
          Load cart
        </button>
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/seed/nowhere">View order history</a>
      </p>
    </main>
  );
}
