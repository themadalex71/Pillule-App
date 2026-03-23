import "./globals.css";
import type { Metadata } from "next";
import AppBootstrap from "@/components/AppBootstrap";

export const metadata: Metadata = {
  title: "Les Gogoles",
  description: "Hub des mini-apps du foyer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AppBootstrap />
        {children}
      </body>
    </html>
  );
}