// src/hooks/usePushNotifications.ts
// Hook for managing Web Push notification subscriptions

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/push/status');
      setIsSubscribed(data.data?.subscribed ?? false);
    } catch {
      // Ignore errors when checking status
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Web Push nie jest obsługiwany przez tę przeglądarkę');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const { data: keyData } = await api.get('/push/vapid-public-key');
      const vapidKey = keyData.data?.vapidPublicKey;

      if (!vapidKey) {
        setError('Serwer nie obsługuje Web Push (brak klucza VAPID)');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Brak zgody na powiadomienia');
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      const subJSON = subscription.toJSON();

      // Send subscription to server
      await api.post('/push/subscribe', {
        endpoint: subJSON.endpoint,
        expirationTime: subJSON.expirationTime ?? null,
        keys: {
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth
        }
      });

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Błąd subskrypcji push';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await api.post('/push/unsubscribe', { endpoint });
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Błąd wyrejestrowania push';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
