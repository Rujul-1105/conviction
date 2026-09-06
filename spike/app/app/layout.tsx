import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Stonk Battles — Phase 0 spike",
  description: "ER/PER verification — counter on delegated PDA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#eee" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
