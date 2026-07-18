import { adminClient } from "@/lib/supabase/admin";

// Upload a base64 JPEG screenshot to the private `shots` bucket, return its
// bucket path (NOT a URL — screenshots can capture authenticated hunts, so they
// are served only via short-lived signed URLs generated at render time).
// Best-effort: a storage hiccup must not kill the hunt, so callers get "".
export async function uploadShot(
  jobId: string,
  name: string | number,
  imageB64: string,
): Promise<string> {
  if (!imageB64) return "";
  try {
    const bytes = Buffer.from(imageB64, "base64");
    const path = `${jobId}/${name}.jpg`;
    const { error } = await adminClient()
      .storage.from("shots")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    return error ? "" : path;
  } catch {
    return "";
  }
}

// Extract a bucket path from a stored reference: either a bare path (new rows)
// or a legacy public URL (…/shots/<path>). Returns null if it isn't a shot ref.
function shotPath(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const m = ref.match(/\/shots\/(.+)$/);
  if (m) return m[1].split("?")[0];
  if (/^https?:\/\//i.test(ref)) return null;
  return ref;
}

// Turn a stored shot reference into a short-lived signed URL for display.
// Returns "" if it can't be signed.
export async function signShot(ref: string | null | undefined): Promise<string> {
  const path = shotPath(ref);
  if (!path) return "";
  try {
    const { data } = await adminClient().storage.from("shots").createSignedUrl(path, 3600);
    return data?.signedUrl ?? "";
  } catch {
    return "";
  }
}
