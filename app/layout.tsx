import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { PaperGrain } from "@/components/PaperGrain";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-cormorant",
});
const inter = Inter({
  subsets: ["latin"], weight: ["300", "400"], variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cottage View",
  description: "A calm family dashboard for Ludlow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <PaperGrain />
        {children}
      </body>
    </html>
  );
}
