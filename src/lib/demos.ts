// Genuine public web apps for the guest demo — not behind Cloudflare, no login,
// automation-friendly. Guests can hunt one of these once without signing up.
export const DEMO_TARGETS = [
  { label: "QA Playground", url: "https://the-internet.herokuapp.com/" },
  { label: "Bookstore", url: "https://books.toscrape.com/" },
  { label: "Todo App", url: "https://todomvc.com/examples/react/dist/" },
];

const NORMALIZED = new Set(
  DEMO_TARGETS.map((d) => {
    try {
      return new URL(d.url).toString();
    } catch {
      return d.url;
    }
  }),
);

export function isDemoUrl(url: string): boolean {
  try {
    return NORMALIZED.has(new URL(url).toString());
  } catch {
    return false;
  }
}

// A completed hunt replayed on /demo so visitors see the product working
// instantly (no wait, no LLM cost). Override per-deployment via env.
export const DEMO_JOB_ID =
  process.env.NEXT_PUBLIC_DEMO_JOB_ID ?? "881772eb-1d58-4d7c-ac70-7f4ebe0a4e19";
