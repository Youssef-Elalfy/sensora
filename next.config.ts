import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
};
export default config;
