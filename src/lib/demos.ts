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
