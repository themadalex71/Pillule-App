import "./globals.css";
import type { Metadata } from "next";
import AppBootstrap from "@/components/AppBootstrap";

export const metadata: Metadata = {
  title: "HarmoHome",
  description: "L'app mobile du foyer pour vos routines, films, recettes et jeux.",
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
