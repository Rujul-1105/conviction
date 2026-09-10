# Vercel Deploy — Phase 6

The frontend lives in `app/`. Vercel serves it from the MagicBlock devnet
RPC + MagicBlock router endpoints configured as build-time env vars.

## Manual deploy steps

These need to run interactively once. The CLI is installed via `npx`.

### 1. Login

```bash
cd app
npx vercel login
```

Opens a browser; complete the email link.

### 2. Link the project (first time only)

```bash
npx vercel link
```

Creates `.vercel/project.json` mapping this directory to a new Vercel
project. Accept defaults: scope = your account, project name = `conviction`,
root = `./`.

### 3. Set env vars

In the Vercel dashboard (Project → Settings → Environment Variables) add
these for **Production**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://rpc.magicblock.app/devnet` |
| `NEXT_PUBLIC_ROUTER_ENDPOINT` | `https://devnet-router.magicblock.app/` |
| `NEXT_PUBLIC_NETWORK` | `devnet` |
| `NEXT_PUBLIC_BIRDEYE_API_KEY` | (your Birdeye public-tier key) |

Phase C (Supabase + Helius) is out of scope per the ship plan — leave
those unset.

### 4. Deploy

```bash
npx vercel deploy --prod
```

Builds + pushes to production. Records a preview URL on success.

### 5. Update CLAUDE.md

Edit the "Vercel preview" pointer to the new URL:

```markdown
- Vercel preview: https://conviction-<hash>.vercel.app
```

## Smoke test (after deploy)

1. Open the URL in a fresh browser (no local cache).
2. The `/` page renders without 500/404.
3. The `/lobby` page renders — either shows devnet matches or empty state.
4. Wallet connect: Phantom + Solflare both appear in the modal.
5. With the Birdeye key set, navigate to a live round and watch the chart
   header pill flip from "Mock walk" to "Birdeye live" within 10s.

## CI alternative (post-MVP)

A `.github/workflows/deploy.yml` could automate steps 1–4 once a
`VERCEL_TOKEN` secret is provisioned. Out of scope for the 15-20h sprint.