import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Component,
  type Garage,
  type LogEntry,
  emptyGarage,
  getGarage,
  putGarage,
} from "./lib/garage";

interface GarageContextValue {
  garage: Garage;
  loading: boolean;
  error: string | null;
  addComponent: (c: Omit<Component, "id">) => Promise<void>;
  serviceComponent: (componentId: string, bikeMeters: number, label: string) => Promise<void>;
  removeComponent: (componentId: string) => Promise<void>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function GarageProvider({ children }: { children: ReactNode }) {
  const [garage, setGarage] = useState<Garage>(emptyGarage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Keep a live ref so mutators don't need `garage` in their dep array.
  const ref = useRef(garage);
  ref.current = garage;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGarage()
      .then((g) => active && setGarage(g))
      .catch((e) => active && setError(e instanceof Error ? e.message : "load_failed"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Optimistically apply `next`, persist, and roll back on failure.
  const persist = useCallback(async (next: Garage) => {
    const prev = ref.current;
    setGarage(next);
    try {
      await putGarage(next);
      setError(null);
    } catch (e) {
      setGarage(prev);
      throw e;
    }
  }, []);

  const addComponent = useCallback(
    (c: Omit<Component, "id">) => {
      const g = ref.current;
      return persist({ ...g, components: [...g.components, { ...c, id: uid() }] });
    },
    [persist],
  );

  const serviceComponent = useCallback(
    (componentId: string, bikeMeters: number, label: string) => {
      const g = ref.current;
      const comp = g.components.find((c) => c.id === componentId);
      const components = g.components.map((c) =>
        c.id === componentId ? { ...c, installMeters: bikeMeters } : c,
      );
      const entry: LogEntry = {
        id: uid(),
        bikeId: comp?.bikeId ?? "",
        componentId,
        label,
        atMeters: bikeMeters,
        date: new Date().toISOString(),
      };
      return persist({ components, log: [entry, ...g.log] });
    },
    [persist],
  );

  const removeComponent = useCallback(
    (componentId: string) => {
      const g = ref.current;
      return persist({ ...g, components: g.components.filter((c) => c.id !== componentId) });
    },
    [persist],
  );

  return (
    <GarageContext.Provider
      value={{ garage, loading, error, addComponent, serviceComponent, removeComponent }}
    >
      {children}
    </GarageContext.Provider>
  );
}

export function useGarage(): GarageContextValue {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error("useGarage must be used within a GarageProvider");
  return ctx;
}
