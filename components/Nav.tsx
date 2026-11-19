'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();
  const toggle = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  };
  const item = (href: string, label: string) => (
    <Link href={href} className={`px-2 py-1 ${path === href ? 'text-fg' : 'text-mute hover:text-fg'}`}>{label}</Link>
  );
  return (
    <header className="border-b border-line">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-1 text-sm">
        <Link href="/" className="font-mono font-medium mr-4 tracking-tight">mathmaster<span className="text-acc">_</span></Link>
        {item('/', 'Train')}
        {item('/stats', 'Stats')}
        <button onClick={toggle} className="ml-auto font-mono text-[11px] text-mute hover:text-fg">theme</button>
      </nav>
    </header>
  );
}
