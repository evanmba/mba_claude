import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin workspace root to this folder so it doesn't infer the parent CMS repo.
    root: path.join(__dirname),
  },
};

export default nextConfig;
