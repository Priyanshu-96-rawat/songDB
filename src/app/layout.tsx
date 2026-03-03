import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { TopNav } from '@/components/shared/TopNav';
import { SplashScreen } from '@/components/shared/SplashScreen';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SongDB - Discover Music',
  description: 'The definitive database for songs, artists, and music discovery.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${inter.className} min-h-screen pb-24 bg-background text-foreground`}>
        <AuthProvider>
          <SplashScreen />
          <TopNav />
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
