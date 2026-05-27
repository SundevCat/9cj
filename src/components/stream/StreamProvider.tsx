"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type StreamEvent =
  | { type: "tick"; time: number }
  | { type: "price"; value: number; delta: number; source: string }
  | { type: "memory"; entry: { id: string; agent: string; tag: string; message: string; createdAt: string } }
  | { type: "alert"; severity: "HIGH" | "MEDIUM" | "LOW"; title: string; message: string; module: string }
  | { type: "metrics"; servicesHealthy: number; servicesTotal: number; approvalsPending: number; pricePerf: number };

type Memory = Extract<StreamEvent, { type: "memory" }>["entry"];
type Toast = { id: number; severity: "HIGH" | "MEDIUM" | "LOW"; title: string; message: string; module: string; ts: number };

type Ctx = {
  connected: boolean;
  price: { value: number; delta: number; source: string } | null;
  metrics: { servicesHealthy: number; servicesTotal: number; approvalsPending: number; pricePerf: number } | null;
  feed: Memory[];
  toasts: Toast[];
  dismissToast: (id: number) => void;
};

const StreamCtx = createContext<Ctx | null>(null);

export function useStream() {
  const ctx = useContext(StreamCtx);
  if (!ctx) throw new Error("useStream must be used inside <StreamProvider>");
  return ctx;
}

export function StreamProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [price, setPrice] = useState<Ctx["price"]>(null);
  const [metrics, setMetrics] = useState<Ctx["metrics"]>(null);
  const [feed, setFeed] = useState<Memory[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(1);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as StreamEvent;
        switch (data.type) {
          case "price":
            setPrice({ value: data.value, delta: data.delta, source: data.source });
            break;
          case "metrics":
            setMetrics({
              servicesHealthy: data.servicesHealthy,
              servicesTotal: data.servicesTotal,
              approvalsPending: data.approvalsPending,
              pricePerf: data.pricePerf,
            });
            break;
          case "memory":
            setFeed((prev) => {
              if (prev.some((m) => m.id === data.entry.id)) return prev;
              return [data.entry, ...prev].slice(0, 50);
            });
            break;
          case "alert": {
            const id = toastIdRef.current++;
            setToasts((prev) => [
              ...prev.slice(-4),
              { id, severity: data.severity, title: data.title, message: data.message, module: data.module, ts: Date.now() },
            ]);
            // Auto-dismiss after 8s
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 8000);
            break;
          }
          case "tick":
          default:
            break;
        }
      } catch {
        /* ignore malformed event */
      }
    };
    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <StreamCtx.Provider value={{ connected, price, metrics, feed, toasts, dismissToast }}>
      {children}
    </StreamCtx.Provider>
  );
}
