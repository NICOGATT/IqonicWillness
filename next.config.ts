import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Identifica cada deploy de Railway: si el navegador tiene abierta una versión
  // vieja de la página, Next recarga en vez de llamar a Server Actions que ya
  // no existen ("Server Action ... was not found on the server").
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || undefined,
  cacheComponents: true,
  partialPrefetching: true,
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
