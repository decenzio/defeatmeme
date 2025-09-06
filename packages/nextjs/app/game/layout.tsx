"use client";

import { useEffect } from "react";

export default function GamePageLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Disable scrolling on the body when the game page is mounted
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Add a class to body to identify we're on game page
    document.body.classList.add("game-page");

    // Re-enable scrolling and remove class when the component unmounts
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.classList.remove("game-page");
    };
  }, []);

  return <>{children}</>;
}
