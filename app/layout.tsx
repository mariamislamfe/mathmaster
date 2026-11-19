import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';


export const metadata: Metadata = { title: 'mathmaster', description: 'Mental math, business math and quant reasoning trainer.' };

const theme = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: theme }} /></head>
      <body className="min-h-dvh flex flex-col bg-bg text-fg font-sans antialiased">
        <Nav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between font-mono text-[11px] text-mute">
            <span>© {new Date().getFullYear()} mathmaster</span>
            <span dir="ltr">Made by <a href="https://www.instagram.com/websity.eg/" target="_blank" rel="noopener noreferrer" className="hover:text-fg hover:underline underline-offset-2">Websity</a></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
