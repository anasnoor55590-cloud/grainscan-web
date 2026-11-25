"use client";
import { HF_SPACE_ID } from "./api";

export type ServerState = "checking" | "waking" | "ready" | "error";

/** This reports configuration only. Actual Space availability is checked on the first scan. */
export function useServer() {
  return {
    state: (HF_SPACE_ID ? "ready" : "error") as ServerState,
    info: null,
  };
}
