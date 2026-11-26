import HeroClaro from './HeroClaro';
import HeroOscuro from './HeroOscuro';

/** Portada: el modo oscuro conserva su diseño original; el modo claro tiene su propio diseño. */
export default function Hero() {
  return (
    <section id="inicio" className="relative">
      <div className="dark:hidden">
        <HeroClaro />
      </div>
      <div className="hidden dark:block">
        <HeroOscuro />
      </div>
    </section>
  );
}
