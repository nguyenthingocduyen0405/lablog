import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "./lib/i18n";
import { LabProvider } from "./lib/lab-tenancy";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lablog · Our lab, today",
  description: "A private daily photo journal for lab members.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={
        geistSans.variable + " " + geistMono.variable + " h-full antialiased"
      }
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <LabProvider>{children}</LabProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
