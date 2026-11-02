import { useState, useEffect } from 'react';
import logoFna from '@/recursos/logo-fna.png';
import ThemeToggle from '@/compartido/ui/ThemeToggle';
import Button from '@/compartido/ui/Button';

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
}

const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Instructores', href: '#instructores' },
  { label: 'Sedes', href: '#sedes' },
  { label: 'Planes', href: '#planes' },
  { label: 'Alquila un aula', href: '#alquiler' },
];

export default function Navbar({ isDark, onToggleTheme, onLoginClick, onRegisterClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const register = () => (onRegisterClick ? onRegisterClick() : scrollTo('#alquiler'));

  // Sobre la imagen del hero el texto es siempre claro; al hacer scroll usa los tokens del tema
  const tone = scrolled || menuOpen ? 'text-text-soft' : 'text-purple-50';

  return (
    <>
      <nav
        className={[
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled && !menuOpen ? 'bg-page/85 backdrop-blur-md border-b border-border' : 'bg-transparent',
        ].join(' ')}
      >
        <div className="max-w-[88rem] mx-auto px-6 h-20 grid grid-cols-[auto_1fr_auto] items-center gap-8">
          <button onClick={() => scrollTo('#inicio')} className="flex items-center cursor-pointer" aria-label="Ir al inicio">
            <img src={logoFna} alt="F&A Dance Company" className="h-10 w-auto object-contain" />
          </button>

          <div className={`hidden lg:flex items-center justify-center gap-9 ${tone}`}>
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="group relative font-condensed font-semibold text-sm uppercase tracking-[0.18em] hover:text-accent transition-colors cursor-pointer"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className={`flex items-center justify-end gap-4 ${tone}`}>
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            <button
              onClick={onLoginClick}
              className="hidden lg:block font-condensed font-semibold text-sm uppercase tracking-[0.18em] hover:text-accent transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
            <span className="hidden lg:block">
              <Button size="sm" onClick={register}>Regístrate</Button>
            </span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="lg:hidden font-condensed font-bold text-base uppercase tracking-[0.18em] cursor-pointer"
            >
              {menuOpen ? 'Cerrar' : 'Menú'}
            </button>
          </div>
        </div>
      </nav>

      {/* Menú móvil a pantalla completa */}
      <div
        className={[
          'fixed inset-0 z-40 lg:hidden bg-page grid-lines transition-all duration-500',
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <div className="h-full flex flex-col justify-between px-6 pt-28 pb-10">
          <ul className="flex flex-col">
            {navLinks.map((link, i) => (
              <li key={link.href} className="border-b border-border">
                <button
                  onClick={() => scrollTo(link.href)}
                  className="w-full flex items-baseline gap-4 py-4 text-left cursor-pointer"
                >
                  <span className="font-condensed text-sm text-text-muted">({String(i + 1).padStart(2, '0')})</span>
                  <span className="display text-4xl text-text">{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => { setMenuOpen(false); onLoginClick(); }}
              className="flex-1 rounded-full border border-accent text-accent py-3 font-condensed font-semibold text-sm uppercase tracking-widest cursor-pointer"
            >
              Iniciar sesión
            </button>
            <Button size="md" className="flex-1" onClick={() => { setMenuOpen(false); register(); }}>
              Regístrate
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}