import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LanguageProvider } from './lib/i18n';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lablog · Our lab, today',
  description: 'A private daily photo journal for lab members.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='ko' className={geistSans.variable + ' ' + geistMono.variable + ' h-full antialiased'}>
      <body className='min-h-full flex flex-col'><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
