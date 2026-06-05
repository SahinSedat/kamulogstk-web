import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ağır server-only paketleri bundle'dan çıkar (build hızını artırır)
  serverExternalPackages: ['sharp', 'jimp', '@react-pdf/renderer'],

  // Production'da source map oluşturmayı devre dışı bırak
  productionBrowserSourceMaps: false,

  // X-Powered-By header'ını kaldır
  poweredByHeader: false, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true },

  // Uploads dizini için CORS ve cache headers (mobil erişim için)
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=2592000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
