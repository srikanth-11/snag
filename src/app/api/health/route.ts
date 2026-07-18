// Lightweight health/keep-warm endpoint for uptime pings.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
