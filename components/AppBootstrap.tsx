"use client";

import { useEffect } from "react";

export default function AppBootstrap() {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await fetch("/api/app", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "bootstrap",
          }),
        });
      } catch (error) {
        console.error("Erreur bootstrap app :", error);
      }
    };

    bootstrap();
  }, []);

  return null;
}