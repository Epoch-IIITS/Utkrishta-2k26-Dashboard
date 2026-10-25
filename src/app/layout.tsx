import type { Metadata } from "next";
import "./globals.css";
import { TopNavServer } from "@/components/nav/top-nav-server";
import { InteractiveBackground } from "@/components/effects/interactive-background";


export const metadata: Metadata = {
  title:       "Neural Forge · Utkrishta 2026",
  description: "Neural Forge, the AI/ML hackathon by EPOCH at IIIT Sri City.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/*
         * InteractiveBackground: fixed, -z-10, pointer-events-none —
         * sits behind every page. "use client" because it uses GSAP,
         * window event listeners, and matchMedia (all browser-only).
         */}
        <InteractiveBackground />
        {/*
         * TopNavServer is a Server Component that reads auth + role and
         * renders the sticky top navigation bar on every page.
         */}
        <TopNavServer />
        {children}
      </body>
    </html>
  );
}
