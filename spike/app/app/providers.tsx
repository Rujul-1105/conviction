"use client";

import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK =
  (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) ||
  WalletAdapterNetwork.Devnet;

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    }
    // Default to mb-stack base port when running against the local validator;
    // fall back to MagicBlock devnet RPC otherwise.
    return process.env.NEXT_PUBLIC_USE_LOCAL === "1"
      ? "http://127.0.0.1:8899"
      : clusterApiUrl(NETWORK);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({ network: NETWORK }),
      new SolflareWalletAdapter({ network: NETWORK }),
    ],
    [],
  );

  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
