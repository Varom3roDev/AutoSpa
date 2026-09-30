'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { 
  isNotificationSupported, 
  getNotificationPermissionStatus, 
  requestNotificationPermission, 
  showSystemNotification,
  registerServiceWorker 
} from '@/lib/notifications';

interface NotificationPermissionPromptProps {
  role?: 'client' | 'technician' | 'admin';
}

export function NotificationPermissionPrompt({ role = 'client' }: NotificationPermissionPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running on an insecure non-localhost context (e.g., http://192.168.x.x)
    const insecure = !window.isSecureContext && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (insecure) {
      setIsInsecureOrigin(true);
      const dismissed = sessionStorage.getItem('autospa_push_insecure_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 1500);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Register Service Worker in background if secure
    registerServiceWorker();

    if (!isNotificationSupported()) return;

    const status = getNotificationPermissionStatus();
    if (status === 'granted') {
      setIsGranted(true);
      return;
    }

    // Check if dismissed previously in session
    const dismissed = sessionStorage.getItem('autospa_push_prompt_dismissed');
    if (status === 'default' && !dismissed) {
      // Show prompt after a short 2-second delay so it's not intrusive
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    const granted = await requestNotificationPermission();
    setIsRequesting(false);
    if (granted) {
      setIsGranted(true);
      setShowPrompt(false);
      // Send a test native notification so user confirms it works with vibration
      showSystemNotification('AutoSpa VZLA', {
        body: '¡Listo! Recibirás alertas del servicio incluso con la pantalla bloqueada.',
        url: window.location.pathname,
      });
    } else {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isInsecureOrigin) {
      sessionStorage.setItem('autospa_push_insecure_dismissed', 'true');
    } else {
      sessionStorage.setItem('autospa_push_prompt_dismissed', 'true');
    }
  };

  if (!showPrompt || isGranted) return null;

  if (isInsecureOrigin) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
        <div className="p-4 rounded-2xl bg-[#181A20] border-2 border-amber-500/50 text-foreground shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground leading-tight">
                  Avisos en Pantalla Bloqueada
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                  Los navegadores móviles exigen conexión segura (<strong className="text-amber-400">HTTPS</strong>) para enviar avisos con la pantalla apagada. 
                  Por dirección IP HTTP, las alertas en tiempo real y sonidos funcionarán mientras la pestaña permanezca abierta.
                </p>
              </div>
            </div>
            <button 
              onClick={handleDismiss} 
              className="text-muted-foreground hover:text-foreground text-sm p-1 cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8"
              onClick={handleDismiss}
            >
              Entendido
            </Button>
            <Button 
              size="sm" 
              className="text-xs h-8 font-bold gap-1.5 bg-amber-500 text-black hover:bg-amber-400 cursor-pointer"
              onClick={() => {
                window.location.href = `https://${window.location.hostname}:3000${window.location.pathname}`;
              }}
            >
              Probar vía HTTPS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const roleText = {
    client: 'cuando el técnico vaya en camino o llegue a tu dirección.',
    technician: 'cuando el administrador te asigne un nuevo servicio.',
    admin: 'cuando un cliente reserve o un técnico termine un servicio.',
  }[role];

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-2xl bg-[#181A20] border-2 border-primary/50 text-foreground shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0 mt-0.5 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground leading-tight">
                ¿Activar avisos en pantalla bloqueada?
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Recibe sonido y vibración en tu dispositivo {roleText}
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-muted-foreground hover:text-foreground text-sm p-1 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Ahora no
          </Button>
          <Button 
            size="sm" 
            className="text-xs h-8 font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            disabled={isRequesting}
            onClick={handleEnable}
          >
            <Bell className="w-3.5 h-3.5" />
            {isRequesting ? 'Activando...' : 'Activar Alertas'}
          </Button>
        </div>
      </div>
    </div>
  );
}
