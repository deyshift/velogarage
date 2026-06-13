import { createContext, useContext, useState, type ReactNode } from "react";
import { type Units, loadUnits, saveUnits, toDistance } from "./lib/units";

interface UnitsContextValue {
  units: Units;
  setUnits: (u: Units) => void;
  /** Format meters to the current unit (number string, no suffix). */
  dist: (meters?: number) => string;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>(loadUnits);
  const setUnits = (u: Units) => {
    saveUnits(u);
    setUnitsState(u);
  };
  const dist = (meters?: number) => toDistance(meters, units);
  return (
    <UnitsContext.Provider value={{ units, setUnits, dist }}>{children}</UnitsContext.Provider>
  );
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within a UnitsProvider");
  return ctx;
}
