import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i\.postimg\.cc",
      },
    ],
    minimumCacheTTL: 2592000,
  },
  // Las fotos del catálogo llevan una huella en el nombre (NOMBRE\.1a2b3c4d\.webp): si la foto cambia, cambia el nombre\.
  // Por eso el navegador puede guardarlas un año sin volver a preguntar (antes revalidaba cada una en cada visita)\.
  async headers() {
    const larga = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/products/:file([^/]+\\.[0-9a-f]{8}\\.webp)", headers: larga },
      { source: "/products/t/:file([^/]+\\.[0-9a-f]{8}\\.webp)", headers: larga },
    ];
  },
};

export default nextConfig;
