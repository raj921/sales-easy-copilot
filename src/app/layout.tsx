import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const uncut = localFont({
  src: "../../public/fonts/UncutSans-Variable.woff2",
  variable: "--font-uncut",
  display: "swap",
  weight: "300 700",
});

export const metadata: Metadata = {
  title: "SalesEasy | Field operations workspace",
  description:
    "Assess field reports against fictional inventory and explore separately labelled public product and price records.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={uncut.variable}>{children}</body>
    </html>
  );
}
