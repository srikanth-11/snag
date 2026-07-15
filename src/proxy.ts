import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 Proxy (formerly Middleware). Refreshes Supabase auth on each request.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets and image optimization; run on everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
