import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/chaebol-map",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
