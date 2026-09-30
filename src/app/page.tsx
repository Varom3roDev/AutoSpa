import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, CalendarCheck, Truck, Check, MapPin, Clock, Phone, Mail, MessageCircle } from 'lucide-react';
import { SERVICES, SERVICE_ZONES } from '@/lib/data/mock-data';
import type { Service, ServiceZone } from '@/lib/types';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0B0E11] text-[#EAECEF]">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0B0E11]/90 backdrop-blur-md border-b border-[#2B313A] px-4 md:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-12 md:h-14 w-auto object-contain drop-shadow-[0_4px_14px_rgba(213,174,51,0.35)] transition-transform hover:scale-105" 
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm text-[#848E9C] hover:text-white hover:bg-[#1E2329]">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/client/booking">
              <Button size="sm" className="bg-[#d5ae33] text-[#0B0E11] hover:bg-[#b89325] font-bold shadow-md gold-glow">
                Reservar Cita
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 md:px-6 lg:px-8 overflow-hidden border-b border-[#2B313A]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d5ae33]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#d5ae33]/30 text-xs font-semibold text-[#d5ae33] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#d5ae33] animate-pulse"></span>
            Servicio Premium a Domicilio en Caracas
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            <span className="gold-gradient-text">Tu auto impecable,</span> donde tú estés
          </h1>
          <p className="text-base md:text-xl text-[#848E9C] max-w-2xl mx-auto mb-10">
            Lavado profesional de vehículos a domicilio. Reserva en minutos, paga en línea o al finalizar y disfruta tu tiempo libre.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/client/booking">
              <Button size="lg" className="w-full sm:w-auto text-base font-extrabold px-8 h-13 rounded-full bg-[#d5ae33] text-[#0B0E11] hover:bg-[#b89325] shadow-lg gold-glow">
                Reservar Lavado Ahora
              </Button>
            </Link>
            <Link href="#servicios">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-semibold px-8 h-13 rounded-full border-[#2B313A] bg-[#181A20] text-white hover:bg-[#1E2329] hover:border-[#d5ae33]/40">
                Ver Catálogo de Servicios
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section id="como-funciona" className="py-16 md:py-24 px-4 md:px-6 lg:px-8 border-b border-[#2B313A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">¿Cómo funciona?</h2>
            <p className="text-[#848E9C] max-w-xl mx-auto text-sm md:text-base">Un proceso simple para tener tu auto como nuevo sin moverte de casa ni hacer filas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#181A20] border-[#2B313A] shadow-md hover:border-[#d5ae33]/40 transition-colors">
              <CardHeader className="text-center pb-2">
                <div className="w-14 h-14 bg-[#d5ae33]/15 text-[#d5ae33] border border-[#d5ae33]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} />
                </div>
                <CardTitle className="text-lg text-white">1. Elige tu servicio</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-[#848E9C] text-sm">
                Selecciona el tipo de lavado y los servicios adicionales que requieras
              </CardContent>
            </Card>

            <Card className="bg-[#181A20] border-[#2B313A] shadow-md hover:border-[#d5ae33]/40 transition-colors">
              <CardHeader className="text-center pb-2">
                <div className="w-14 h-14 bg-[#d5ae33]/15 text-[#d5ae33] border border-[#d5ae33]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarCheck size={28} />
                </div>
                <CardTitle className="text-lg text-white">2. Agenda tu cita</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-[#848E9C] text-sm">
                Escoge la fecha, bloque de horario y la dirección de tu casa u oficina
              </CardContent>
            </Card>

            <Card className="bg-[#181A20] border-[#2B313A] shadow-md hover:border-[#d5ae33]/40 transition-colors">
              <CardHeader className="text-center pb-2">
                <div className="w-14 h-14 bg-[#d5ae33]/15 text-[#d5ae33] border border-[#d5ae33]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Truck size={28} />
                </div>
                <CardTitle className="text-lg text-white">3. Nosotros vamos</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-[#848E9C] text-sm">
                Nuestro equipo capacitado llega a tu ubicación con equipos autónomos
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services section */}
      <section id="servicios" className="py-16 md:py-24 px-4 md:px-6 lg:px-8 border-b border-[#2B313A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Nuestros Servicios</h2>
            <p className="text-[#848E9C] max-w-xl mx-auto text-sm md:text-base">Soluciones de detailing y lavado a medida para cada necesidad.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service: Service) => (
              <Card key={service.id} className="flex flex-col h-full bg-[#181A20] border-[#2B313A] hover:border-[#d5ae33]/60 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="text-lg text-white">{service.name}</CardTitle>
                  <CardDescription className="text-xs text-[#848E9C] mt-1">{service.short_description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-extrabold text-[#d5ae33]">Desde ${service.base_price_usd}</span>
                    <Badge variant="secondary" className="flex items-center gap-1 bg-[#1E2329] text-[#EAECEF] border border-[#2B313A] text-xs">
                      <Clock size={13} className="text-[#d5ae33]" /> {service.base_duration_minutes} min
                    </Badge>
                  </div>
                  <ul className="space-y-2.5">
                    {service.includes?.slice(0, 3).map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="text-[#0ECB81] mt-0.5 shrink-0" size={16} />
                        <span className="text-[#EAECEF] text-xs">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={`/client/booking?service=${service.id}`} className="w-full">
                    <Button className="w-full bg-[#d5ae33] text-[#0B0E11] hover:bg-[#b89325] font-bold">
                      Seleccionar Servicio
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage section */}
      <section id="cobertura" className="py-16 md:py-24 px-4 md:px-6 lg:px-8 border-b border-[#2B313A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Zonas de Cobertura</h2>
          <p className="text-[#848E9C] mb-10 text-sm md:text-base">Llegamos a donde estés. Consulta nuestra disponibilidad en Caracas.</p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {SERVICE_ZONES.map((zone: ServiceZone) => (
              <div key={zone.id} className="bg-[#181A20] border border-[#2B313A] hover:border-[#d5ae33]/30 rounded-xl px-4 py-2.5 flex flex-col items-center shadow-xs transition-colors">
                <span className="font-semibold text-white text-sm flex items-center gap-2">
                  <MapPin size={15} className="text-[#d5ae33]" />
                  {zone.name}
                </span>
                <span className="text-[11px] text-[#848E9C] mt-0.5">
                  {zone.surcharge_usd === 0 ? 'Sin recargo' : `+$${zone.surcharge_usd}`} • ~{zone.avg_travel_minutes} min
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#848E9C] italic">Selecciona tu dirección exacta al momento de agendar para calcular traslados.</p>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-[#181A20] to-[#0B0E11] text-center border-b border-[#2B313A]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">¿Listo para un auto impecable?</h2>
          <p className="text-[#848E9C] text-sm md:text-base mb-8 max-w-xl mx-auto">
            Reserva tu lavado a domicilio en pocos minutos y disfruta de más tiempo libre mientras nosotros nos encargamos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/client/booking">
              <Button size="lg" className="w-full sm:w-auto text-base font-extrabold px-8 h-13 rounded-full bg-[#d5ae33] text-[#0B0E11] hover:bg-[#b89325] shadow-lg gold-glow">
                Reservar Ahora
              </Button>
            </Link>
            <Link href="https://wa.me/584121234567" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold px-8 h-13 rounded-full border-[#2B313A] bg-[#1E2329] text-white hover:bg-[#2B313A]">
                <MessageCircle className="mr-2 h-5 w-5 text-[#0ECB81]" />
                WhatsApp Directo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#07090C] text-[#848E9C] py-12 px-4 md:px-6 lg:px-8 text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img 
                src="/logo.png" 
                alt="AutoSpa VZLA" 
                className="h-10 w-auto object-contain drop-shadow-[0_2px_8px_rgba(213,174,51,0.3)]" 
              />
            </div>
            <p className="text-[#848E9C] max-w-sm leading-relaxed">
              Lavado profesional de vehículos a domicilio. Tu auto impecable, donde tú estés.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li><Link href="#servicios" className="hover:text-[#d5ae33] transition-colors">Servicios</Link></li>
              <li><Link href="#cobertura" className="hover:text-[#d5ae33] transition-colors">Cobertura</Link></li>
              <li><Link href="/client/booking" className="hover:text-[#d5ae33] transition-colors">Reservar</Link></li>
              <li><Link href="/login" className="hover:text-[#d5ae33] transition-colors">Iniciar Sesión</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Contacto</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-[#d5ae33]" />
                <span>+58 412 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-[#d5ae33]" />
                <span>contacto@autospa.com.ve</span>
              </li>
            </ul>
          </div>
        </div>
        <Separator className="bg-[#2B313A] my-6" />
        <div className="max-w-6xl mx-auto text-center text-[#848E9C]">
          <p>© 2026 AutoSpa VZLA. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

