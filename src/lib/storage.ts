import { adminClient } from "@/lib/supabase/admin";

// Upload a base64 JPEG screenshot to the public `shots` bucket, return its URL.
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
    const admin = adminClient();
    const { error } = await admin.storage
      .from("shots")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) return "";
    return admin.storage.from("shots").getPublicUrl(path).data.publicUrl;
  } catch {
    return "";
  }
}
