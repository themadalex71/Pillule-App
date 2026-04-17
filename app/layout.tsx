import "./globals.css";
import type { Metadata } from "next";
import AppBootstrap from "@/components/AppBootstrap";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

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
        <ThemeProvider>
          <I18nProvider>
            <AppBootstrap />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
