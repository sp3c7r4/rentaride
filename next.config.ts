import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Default bottom-left overlaps the dashboard sidebar's account menu.
  devIndicators: { position: "bottom-right" },
  images: {
    // Only public vehicle photos go through the optimizer. Private files
    // (licences, evidence) are served directly with an access check.
    localPatterns: [
      { pathname: "/files/vehicle_photo/**" },
      { pathname: "/images/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
