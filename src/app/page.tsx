import Link from "next/link";
import { ArrowRight, ChefHat, LayoutDashboard, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ChefHat size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Seencel<span className="text-primary">Resto</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Características</Link>
            <Link href="#" className="hover:text-primary transition-colors">Nosotros</Link>
            <Link href="#" className="hover:text-primary transition-colors">Precios</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-white/10 hover:border-primary/50"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)] transition-transform hover:scale-105 hover:shadow-[0_0_30px_-5px_var(--primary)]"
            >
              Comenzar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center pt-20">
        <div className="container mx-auto px-6 relative">

          {/* Background Blobs */}
          <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="h-[400px] w-[600px] rounded-full bg-primary/20 blur-[120px] opacity-30 animate-pulse" />
          </div>

          <div className="flex flex-col items-center text-center">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v2.0 ya está disponible
            </div>

            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl md:leading-[1.1]">
              El Futuro de la Gestión de <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                Restaurantes
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Potencia tu restaurante con Seencel Resto. Desde planos de mesa hasta sistemas de cocina, gestiona todo en una plataforma innovadora y a medida.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="group flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105"
              >
                Ir al Panel
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#"
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-background/50 px-8 py-4 text-base font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Ver Demo
              </Link>
            </div>

            {/* Feature Teaser */}
            <div className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                { icon: LayoutDashboard, title: "Panel del Dueño", desc: "Métricas en tiempo real y ventas de un vistazo." },
                { icon: Smartphone, title: "App del Mozo", desc: "Experiencia móvil para tomar pedidos rápidamente." },
                { icon: ChefHat, title: "Pantalla de Cocina", desc: "Tickets digitales para agilizar el flujo de tu cocina." }
              ].map((feature, i) => (
                <div key={i} className="glass group rounded-2xl p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/30">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Seencel Resto. Construido para la funcionalidad.</p>
      </footer>

    </div>
  );
}
