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
  themeColor: '#000000',
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
    <html lang='en'>
      <body className={`${manrope.variable} ${fraunces.variable} min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          <LibraryStoreHydrator />
          <SplashScreen />
          <div className="relative min-h-screen pb-40 sm:pb-28">
            <Sidebar />
            <div className="relative min-h-screen pl-0 sm:pl-[5.5rem] md:pl-[20.75rem]">
              <div className="pointer-events-none absolute inset-0 ambient-grid opacity-45" />
              <div className="relative z-10 flex min-h-screen flex-col">
                <TopNav />
                <main className="relative z-10 flex-1 pb-20">
                  {children}
                </main>
                <footer className="relative z-10 px-3 pb-28 pt-2 md:px-5">
                  <div className="shell-panel-soft flex items-center justify-between rounded-[26px] px-4 py-3 text-[11px] text-white/26">
                    <p className="uppercase tracking-[0.24em] text-white/18">
                      Made by Priyanshu
                    </p>
                    <p className="uppercase tracking-[0.24em] text-white/18">
                      Powered by YouTube Music
                    </p>
                  </div>
                </footer>
              </div>
            </div>
          </div>
          <YoutubePlayer />
          <ServiceWorkerRegistration />
        </AuthProvider>
      </body>
    </html>
  );
}
