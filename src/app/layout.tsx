import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopNav } from '@/components/shared/TopNav';
import { SplashScreen } from '@/components/shared/SplashScreen';
import YoutubePlayer from '@/components/player/YoutubePlayer';
import { ServiceWorkerRegistration } from '@/components/shared/ServiceWorkerRegistration';
import { LibraryStoreHydrator } from '@/components/shared/LibraryStoreHydrator';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'SongDB - Music Streaming',
  description: 'A complete music streaming platform. Made by Priyanshu with Antigravity.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SongDB',
  },
  icons: {
    icon: '/icons/icon-512.png',
    apple: '/icons/icon-192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} min-h-screen bg-background text-foreground antialiased overflow-x-hidden`}>
        <AuthProvider>
          <LibraryStoreHydrator />
          <SplashScreen />
          
          <div className="flex min-h-screen flex-col">
            <Sidebar />
            
            <div className="relative z-10 flex flex-1 flex-col pl-0 sm:pl-[5.5rem] lg:pl-[19.25rem]">
              <TopNav />
              <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 md:px-8 pb-32 sm:pb-8">
                {children}
              </main>
              <footer className="px-3 pb-36 sm:pb-32 lg:pb-6 pt-2 lg:px-5">
                <div className="shell-panel-soft flex items-center justify-center rounded-[26px] px-4 py-3 text-[11px] text-white/26">
                  <p className="uppercase tracking-[0.24em] text-white/18 text-center w-full">
                    Powered by YouTube Music
                  </p>
                </div>
              </footer>
            </div>
          </div>

          <YoutubePlayer />
          <ServiceWorkerRegistration />
        </AuthProvider>
      </body>
    </html>
  );
}

