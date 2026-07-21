import * as React from "react";

type Theme = "light";

interface ThemeState {
  theme: Theme;
  resolved: "light";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within <ThemeProvider>");
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const value = React.useMemo(
    () => ({ theme: "light" as Theme, resolved: "light" as const, setTheme: () => {} }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  return null;
}
