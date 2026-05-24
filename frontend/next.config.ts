import path from "path";
import type { NextConfig } from "next";
import { getLocalNetworkDevOrigins } from "./src/lib/dev-network-origins";

const nextConfig: NextConfig = {
  // Allow HMR when opening dev server via hotspot/LAN IP (e.g. http://192.168.x.x:3000)
  allowedDevOrigins: getLocalNetworkDevOrigins(),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
