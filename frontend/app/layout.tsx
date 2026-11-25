import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";


export const metadata: Metadata = {
  title: "GrainScan – rice quality and variety analysis",
  description: "Upload a photo of rice grains and get the broken percentage and variety split in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#166534",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container">{children}</main>
        <footer className="container footer">
          Prototype. Scores are raw model outputs, not calibrated probabilities, and results are only validated for the capture
          setup the models were trained on. Grades use demo thresholds, not an official grading standard.
        </footer>
      </body>
    </html>
  );
}
