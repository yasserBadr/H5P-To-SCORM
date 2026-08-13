import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["yauzl", "busboy"]
};

export default nextConfig;
