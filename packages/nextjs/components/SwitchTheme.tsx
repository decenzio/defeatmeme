"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon } from "@heroicons/react/24/outline";

export const SwitchTheme = ({ className }: { className?: string }) => {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force dark mode
    setTheme("dark");
  }, [setTheme]);

  if (!mounted) return null;

  return (
    <div className={`flex space-x-2 h-8 items-center justify-center text-sm ${className}`}>
      <MoonIcon className="h-5 w-5 text-cyan-400" />
      <span className="text-cyan-400 text-xs">Dark Mode</span>
    </div>
  );
};
