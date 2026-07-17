"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const nextTheme: Theme =
      window.localStorage.getItem("hmrdtm-theme") === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.role = pathname.startsWith("/guest/")
      ? "guest"
      : "admin";
  }, [pathname]);

  const toggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("hmrdtm-theme", nextTheme);
  };

  return (
    <button className="icon-button" type="button" onClick={toggle} aria-label="Skift tema">
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
