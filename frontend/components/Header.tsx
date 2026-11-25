"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useServer } from "@/lib/useServer";

const LABEL = {
  checking: "Connecting…",
  waking: "ZeroGPU waking up…",
  ready: "HF Space configured",
  error: "HF Space not configured",
} as const;

export default function Header() {
  const path = usePathname();
  const { state } = useServer();
  return (
    <header className="header">
      <div className="container header-in">
        <Link href="/" className="brand" aria-label="GrainScan home">
          <span className="brand-mark" aria-hidden>🌾</span>
          <span>GrainScan</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/" className={path === "/" ? "active" : ""}>Scan</Link>
          <Link href="/history" className={path === "/history" ? "active" : ""}>History</Link>
        </nav>
        <span className="pill" title="Configuration indicator only. Space availability is checked when you start a scan." role="status">
          <span className={`dot ${state}`} />
          <span>{LABEL[state]}</span>
        </span>
      </div>
    </header>
  );
}
