// Planted 500 for the demo target.
export function GET() {
  return new Response(JSON.stringify({ error: "cart service unavailable" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}
