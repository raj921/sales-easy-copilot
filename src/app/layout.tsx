import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesEasy | Field report assessment",
  description:
    "An evidence-first sales copilot assessment demo using fictional inventory data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
