import Image from "next/image";
import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "DefeatMeme - Planet Defense Game",
  description:
    "The ultimate blockchain-based planet defense game. Mint your Planet NFT and defend against meme attacks!",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning data-theme="dark">
      <body>
        <ThemeProvider defaultTheme="dark" forcedTheme="dark">
          <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0">
              <Image src="/planet/planet2.png" alt="Background Planet" fill className="object-cover" priority />
              <div className="absolute inset-0 bg-black/40" />
            </div>
            <div className="relative z-10">
              <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
