import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import AnnouncementBar from '@/components/announcement-bar'
import Header from '@/components/header'
import Footer from '@/components/footer'

const montserrat = localFont({
  variable: '--font-montserrat',
  display: 'swap',
  src: [
    { path: '../fonts/montserrat-latin.woff2', weight: '100 900', style: 'normal' },
  ],
})

// Runs before first paint. sv-late is a safety net: if the JS bundle never
// confirms itself within 4s, nothing stays hidden behind the reveal styles.
// It also points the theme-color metas at the stored theme, which ThemeProvider
// keeps in sync after a toggle.
const PRE_PAINT = 'var h=document.documentElement;h.classList.add("js");var t=setTimeout(function(){h.classList.add("sv-late")},4000);window.__svReady=function(){clearTimeout(t)};try{if(localStorage.getItem("snapsvault-announce-dismissed")==="1")h.classList.add("sv-announce-hidden")}catch(e){}try{var s=localStorage.getItem("theme"),d=s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.querySelectorAll("meta[name=theme-color]").forEach(function(m){m.content=d?"#0C0C0D":"#ffffff"})}catch(e){}'

const title = 'SnapsVault | Open Snapshot Marketplace'
const description = 'A community-driven marketplace for sharing and discovering verified snapshots published by trusted contributors'

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL('https://snapsvault.xyz'),
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    url: 'https://snapsvault.xyz',
    siteName: 'SnapsVault',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'SnapsVault' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0C0D' },
  ],
}

// Shell copied from the marketplace app: announcement bar (36px), fixed header
// under it, main offset 112px (76px once the bar is dismissed), body 1390px.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${montserrat.variable} antialiased min-h-screen w-full max-w-[1390px] flex flex-col mx-auto relative`}>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
          <AnnouncementBar />
          <Header />
          <main className='flex-1 pt-[calc(var(--sv-announce-h)+var(--sv-header-h)+4px)] w-full px-4'>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
