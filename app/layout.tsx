import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-face",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  title: "PTG Social",
  description: "Schedule, approve, and publish Preach the Gospel on Instagram.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
