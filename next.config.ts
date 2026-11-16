import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App 100% autenticada y dinámica (cookies de Supabase): usamos el modelo de caché clásico.
  cacheComponents: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
