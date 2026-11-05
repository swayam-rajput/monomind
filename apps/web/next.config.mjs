/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace packages ship raw TypeScript (no build step), so Next
  // needs to transpile them itself instead of treating them as pre-built.
  transpilePackages: ["@monomind/ai", "@monomind/db", "@monomind/types"],
  // @lancedb/lancedb ships a native .node binary (via its platform
  // package, e.g. @lancedb/lancedb-win32-x64-msvc). Webpack can't parse
  // that binary as a module, so it must stay external and be loaded with
  // plain require() at runtime on the server instead of being bundled.
  // Next 14.2's stable name for this is still under `experimental`.
  experimental: {
    serverComponentsExternalPackages: ["@lancedb/lancedb"],
  },
};

export default nextConfig;
