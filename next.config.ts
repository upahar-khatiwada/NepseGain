import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // z.coerce.number() in this Zod version infers `unknown` as the Zod input type,
  // which conflicts with react-hook-form's Resolver generic. App works correctly at
  // runtime — see "Known TypeScript issues" in CLAUDE.md.
  typescript: { ignoreBuildErrors: true },
  // Prevent Node-only packages (pg, prisma) from being bundled for the browser
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
