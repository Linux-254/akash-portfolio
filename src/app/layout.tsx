import type { Metadata } from "next";
import {
  Instrument_Serif,
  Familjen_Grotesk,
  JetBrains_Mono,
  Fraunces,
  Inter_Tight,
  Bricolage_Grotesque,
  Newsreader,
} from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import { CanvasHost } from "@/components/CanvasHost";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Nav } from "@/components/Nav";
import { Intro } from "@/components/Intro";
import { PaintTransition } from "@/components/PaintTransition";
import { CursorDot } from "@/components/CursorDot";
import { SwerveField } from "@/components/SwerveField";
import { EcgLine } from "@/components/EcgLine";
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});
const familjenGrotesk = Familjen_Grotesk({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-familjen-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const fraunces = Fraunces({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});
const interTight = Inter_Tight({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-inter-tight",
});
const bricolage = Bricolage_Grotesque({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
});
const newsreader = Newsreader({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const siteUrl = process.env.APP_URL?.startsWith("http")
  ? process.env.APP_URL
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Akash Portfolio — Abdikhaliq Abdi (SG_AKASH)",
  description:
    "Abdikhaliq Abdi (SG_AKASH) — University of Nairobi Medical Student, UNSA Council Head of Public Service, former AMSUN Secretary General, and Northern Kenya CBO founder.",
  openGraph: {
    title: "Akash Portfolio — Abdikhaliq Abdi (SG_AKASH)",
    description:
      "Medicine, student advocacy, and Northern Kenya community empowerment.",
    type: "website",
    images: [
      {
        url: "/assets/aistudio/og-image_86e9ddb8.jpg",
        width: 1200,
        height: 630,
        alt: "Abdikhaliq Abdi — student leader and community builder",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontClasses = [
    instrumentSerif.variable,
    familjenGrotesk.variable,
    jetbrainsMono.variable,
    fraunces.variable,
    interTight.variable,
    bricolage.variable,
    newsreader.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontClasses}>
      <body>
        <AppProvider>
          <SwerveField />
          <EcgLine />
          <CanvasHost />
          <SmoothScroll />
          <Nav />
          <Intro />
          <PaintTransition />
          <CursorDot />
          <div className="grain-overlay" aria-hidden="true" />
          <main id="main-content" className="page-shell">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
