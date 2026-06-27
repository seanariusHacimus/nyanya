import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // next-intl Link uses locale-relative hrefs; typed routes would reject them.
  typedRoutes: false,
  // PGlite ships WASM that must not be bundled by Turbopack — load it externally.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // Local dev serves generated media from /public; production will add R2 / UZ-resident hosts here.
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
