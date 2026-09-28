import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolves its binary path from __dirname at require time —
  // bundling it (webpack/Turbopack) rewrites that path and breaks it, so it
  // must load via plain Node require instead. Playwright doesn't strictly
  // need this exclusion but is native-binary-heavy the same way, so keeping
  // it here too avoids the same class of bug if that ever changes.
  serverExternalPackages: ["ffmpeg-static", "playwright", "sharp"],
};

export default nextConfig;
