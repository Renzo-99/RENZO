"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { GroupData } from "@/types";
import { SearchCommand } from "./SearchCommand";

interface SearchContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchContext = createContext<SearchContextType>({
  open: false,
  setOpen: () => {},
});

export function useSearch() {
  return useContext(SearchContext);
}

interface SearchProviderProps {
  groups: GroupData[];
  children: React.ReactNode;
}

export function SearchProvider({ groups, children }: SearchProviderProps) {
  const [open, setOpen] = useState(false);

  // Cmd+K / Ctrl+K 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      {open && <SearchCommand groups={groups} onClose={() => setOpen(false)} />}
    </SearchContext.Provider>
  );
}
