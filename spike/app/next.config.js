/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The wallet adapter ships some browser shims that benefit from on-demand transpilation.
  transpilePackages: ["@solana/wallet-adapter-react-ui"],
  // Spike-only: skip type errors from the wallet adapter's transitive React 19 deps.
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
