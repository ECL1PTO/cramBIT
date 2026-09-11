import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Backdrop } from "@/components/backdrop";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crambit.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "cramBIT — predicted mid-sem papers for BIT Noida",
    template: "%s · cramBIT",
  },
  description:
    "cramBIT reads your course's real past mid-sem papers and syllabus, then generates the most probable 25-mark question papers. BIT Mesra, Noida campus.",
  applicationName: "cramBIT",
  openGraph: {
    title: "cramBIT — predicted mid-sem papers for BIT Noida",
    description:
      "Real past-paper patterns + your syllabus → the most probable mid-sem question papers.",
    url: SITE_URL,
    siteName: "cramBIT",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable} ${newsreader.variable}`}
    >
      <body>
        <ThemeProvider>
          <Backdrop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
