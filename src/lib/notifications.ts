/**
 * AutoSpa VZLA - Native Web Push & Service Worker Notifications Manager
 */

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Register Service Worker for PWA and background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Request permission from the user to display native OS lock-screen notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Show a native operating system notification (displays on lock screen / sleep mode banner with vibration)
 */
export async function showSystemNotification(
  title: string,
  options: {
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
  }
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions: any = {
    body: options.body,
    icon: options.icon || '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: options.url || '/',
    },
    tag: options.tag || 'autospa-alert',
    renotify: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
    // Fallback if service worker ready hasn't resolved
    new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('Could not display system notification:', err);
  }
}
