"use client";

import { useState } from "react";

// Demo target #3 — a settings dashboard. Planted bugs: a budget field that
// silently accepts invalid input (letters, negatives) with no validation, and
// an Export button that hits a 500.
export default function DemoDash() {
  const [budget, setBudget] = useState("");
  const [saved, setSaved] = useState(false);

  async function exportData() {
    await fetch("/seed/api/boom");
  }

  return (
    <main style={{ maxWidth: 480, margin: "3rem auto", fontFamily: "system-ui", color: "#111" }}>
      <h1>Team settings</h1>

      <label htmlFor="budget">Monthly budget (USD)</label>
      <br />
      <input
        id="budget"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        placeholder="e.g. 5000"
        style={{ padding: 8, width: "100%", margin: "8px 0" }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setSaved(true)}
          style={{ padding: "8px 16px" }}
        >
          Save
        </button>
        <button onClick={exportData} style={{ padding: "8px 16px" }}>
          Export
        </button>
      </div>

      {saved && <p style={{ color: "green" }}>Saved “{budget}”.</p>}
    </main>
  );
}
