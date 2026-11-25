"use client";
import { useEffect, useState } from "react";
import { API_URL, getInfo } from "./api";
import type { ServerInfo } from "./types";

export type ServerState = "checking" | "waking" | "ready" | "error";

export function useServer() {
  const [state, setState] = useState<ServerState>(API_URL ? "checking" : "error");
  const [info, setInfo] = useState<ServerInfo | null>(null);

  useEffect(() => {
    if (!API_URL) {
      setState("error");
      return;
    }
    let stop = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 8000);
      try {
        const i = await getInfo(ac.signal);
        if (stop) return;
        setInfo(i);
        if (i.error) {
          setState("error");
          return;
        }
        if (i.ready) {
          setState("ready");
          return;
        }
        setState("waking");
      } catch {
        if (!stop) setState(tries >= 2 ? "waking" : "checking");
      } finally {
        clearTimeout(to);
      }
      tries += 1;
      if (!stop && tries < 60) timer = setTimeout(tick, 4000);
      else if (!stop) setState("error");
    };

    tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { state, info };
}
