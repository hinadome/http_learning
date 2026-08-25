import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@currentspace/http3", "mqtt", "ws"],
};

export default nextConfig;
