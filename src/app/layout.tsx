import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/shared/Sidebar';
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
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          <SplashScreen />
          <Sidebar />
          <div className="ml-16 md:ml-60 min-h-screen flex flex-col">
            <TopNav />
            <main className="flex-1 pb-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
