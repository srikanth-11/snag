"use client";

import { useEffect, useState } from "react";

// Demo target #2 — a docs site. Planted bugs: console error on load, a search
// box that silently does nothing, and a dead link that 404s.
export default function DemoDocs() {
  const [q, setQ] = useState("");

  useEffect(() => {
    console.error("Analytics failed to initialize: token is undefined");
  }, []);

  return (
    <main style={{ maxWidth: 620, margin: "3rem auto", fontFamily: "system-ui", color: "#111" }}>
      <h1>Docs</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // planted bug: search is wired to nothing
        }}
        style={{ display: "flex", gap: 8, margin: "16px 0" }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the docs"
          style={{ flex: 1, padding: 8 }}
        />
        <button style={{ padding: "8px 16px" }}>Search</button>
      </form>
      <ul>
        <li>
          <a href="/seed/demo-docs">Getting started</a>
        </li>
        <li>
          <a href="/seed/docs/missing-page">API reference</a>
        </li>
      </ul>
    </main>
  );
}
