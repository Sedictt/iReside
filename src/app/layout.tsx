import type { Metadata } from "next";
import "./globals.css";
import { Rethink_Sans } from "next/font/google";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "iReside",
  description: "Modern Landlord & Tenant Management Prototype",
};

const rethinkSans = Rethink_Sans({
  subsets: ["latin"],
  variable: "--font-rethink",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rethinkSans.variable} ${rethinkSans.className} ${GeistSans.variable}`} suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
