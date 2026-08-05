import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "./lib/i18n";
import { LabProvider } from "./lib/lab-tenancy";
import { RolePreviewProvider } from "./lib/role-preview";
import RolePreviewToolbar from "./components/role-preview-toolbar";
import GlobalHeaderControls from "./components/global-header-controls";
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
          <LabProvider>
            <RolePreviewProvider>
              <RolePreviewToolbar />
              <div className="relative min-h-screen pt-24 [&>*:first-child]:-mt-24 [&>*:first-child]:pt-24">
                {children}
                <GlobalHeaderControls />
              </div>
            </RolePreviewProvider>
          </LabProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
