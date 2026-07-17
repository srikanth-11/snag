import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these as runtime requires, not bundled: axe-core's `.source` string
  // gets mangled by the bundler, and playwright ships native binaries.
  serverExternalPackages: ["axe-core", "playwright"],
};

export default nextConfig;
