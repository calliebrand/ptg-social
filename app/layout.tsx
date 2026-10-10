import type { Metadata } from "next";
import { Bodoni_Moda, Libre_Franklin, Space_Mono, Yellowtail } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["500", "700", "900"],
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-franklin",
});

const space = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "700"],
});

const yellowtail = Yellowtail({
  subsets: ["latin"],
  variable: "--font-yellowtail",
  weight: "400",
});

export const metadata: Metadata = {
  title: "PTG Social Desk",
  description: "Schedule, approve, and publish Preach the Gospel on Instagram.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodoni.variable} ${franklin.variable} ${space.variable} ${yellowtail.variable} antialiased`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
