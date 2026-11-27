import { useState, useEffect } from 'react';
import logoFna from '@/recursos/logo-fna.png';
import ThemeToggle from '@/compartido/ui/ThemeToggle';
import Button from '@/compartido/ui/Button';
import SelectorIdioma from '@/compartido/ui/SelectorIdioma';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
}

const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Estilos', href: '#estilos' },
  { label: 'Instructores', href: '#instructores' },
  { label: 'Sedes', href: '#sedes' },
  { label: 'Planes', href: '#planes' },
  { label: 'Preinscripción', href: '#preinscripcion' },
  { label: 'Alquila un aula', href: '#alquiler' },
];

export default function Navbar({ isDark, onToggleTheme, onLoginClick, onRegisterClick }: NavbarProps) {
  const { t } = useIdioma();
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

  // No hay autorregistro: la inscripción se hace en persona, en la sede
  const register = () => (onRegisterClick ? onRegisterClick() : scrollTo('#preinscripcion'));

  // Sobre el hero: texto oscuro en modo claro (hero blanco) y claro en modo oscuro (hero con foto)
  const tone = scrolled || menuOpen ? 'text-text-soft' : 'text-[#2e2240] dark:text-purple-50';

  return (
    <>
      <nav
        className={[
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled && !menuOpen ? 'bg-page/85 backdrop-blur-md border-b border-border' : 'bg-transparent',
        ].join(' ')}
      >
        <div className="max-w-[88rem] mx-auto px-6 h-20 grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <button onClick={() => scrollTo('#inicio')} className="flex shrink-0 items-center cursor-pointer" aria-label={t('Ir al inicio')}>
            <img src={logoFna} alt="F&A Dance Company" className="h-10 w-auto object-contain brightness-0 opacity-85 dark:brightness-100 dark:opacity-100" />
          </button>

          <div className={`hidden lg:flex items-center justify-center gap-4 2xl:gap-9 ${tone}`}>
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="group relative whitespace-nowrap font-condensed font-semibold text-sm uppercase tracking-[0.1em] 2xl:tracking-[0.18em] hover:text-accent transition-colors cursor-pointer"
              >
                {t(link.label)}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className={`flex items-center justify-end gap-4 ${tone}`}>
            <SelectorIdioma />
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            <button
              onClick={onLoginClick}
              className="hidden lg:block whitespace-nowrap font-condensed font-semibold text-sm uppercase tracking-[0.1em] 2xl:tracking-[0.18em] hover:text-accent transition-colors cursor-pointer"
            >
              {t('Iniciar sesión')}
            </button>
            <span className="hidden lg:block">
              <Button size="sm" onClick={register}>{t('Inscríbete')}</Button>
            </span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="lg:hidden font-condensed font-bold text-base uppercase tracking-[0.18em] cursor-pointer"
            >
              {menuOpen ? t('Cerrar') : t('Menú')}
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
                  <span className="display text-4xl text-text">{t(link.label)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => { setMenuOpen(false); onLoginClick(); }}
              className="flex-1 rounded-full border border-accent text-accent py-3 font-condensed font-semibold text-sm uppercase tracking-widest cursor-pointer"
            >
              {t('Iniciar sesión')}
            </button>
            <Button size="md" className="flex-1" onClick={() => { setMenuOpen(false); register(); }}>
              {t('Inscríbete')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}