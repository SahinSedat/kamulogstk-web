import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/stkuyesi',
        destination: '/stk/anasayfa',
      },
      {
        source: '/stkuyesi/:path*',
        destination: '/stk/:path*',
      },
      {
        source: '/uyegirisi',
        destination: '/vatandas',
      },
      {
        source: '/uyegirisi/:path*',
        destination: '/vatandas/:path*',
      },
      {
        source: '/sistemyoneticisi',
        destination: '/admin/dashboard',
      },
    ];
  },
};

export default nextConfig;
