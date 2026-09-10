/**
 * Next.js config.
 *
 * Deliberately does NOT set `typescript.ignoreBuildErrors`. The Phase 0 spike
 * needed that flag because React 19 transitive types leaked in through
 * @solana/wallet-adapter-*; Phase B instead pins React 18 and pins
 * @types/react via pnpm.overrides in package.json, which fixes the cause
 * rather than hiding the symptom. If a wallet-adapter type error ever appears
 * here, fix the override — do not re-add ignoreBuildErrors.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // wallet-adapter-react-ui ships untranspiled CSS-importing ESM.
  transpilePackages: ['@solana/wallet-adapter-react-ui'],
}

module.exports = nextConfig
