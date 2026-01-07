// src/hooks/useTokenExpirationWarning.ts
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';
import { jwtDecode } from 'jwt-decode';

interface TokenExpirationHook {
  showWarning: boolean;
  secondsRemaining: number;
  refreshToken: () => Promise<void>;
  dismissWarning: () => void;
}

const WARNING_THRESHOLD = 40; // 40 sekund przed wygaśnięciem
const CHECK_INTERVAL = 1000; // Sprawdzaj co sekundę

export const useTokenExpirationWarning = (): TokenExpirationHook => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const { logout } = useAuthStore();

  // Funkcja generująca dźwięk "tik" zegara
  const playTick = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Częstotliwość "tik"
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Inicjalizacja AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Odtwarzaj tik co sekundę gdy pokazane ostrzeżenie
  useEffect(() => {
    if (showWarning) {
      playTick(); // Pierwszy tik natychmiast
      tickIntervalRef.current = setInterval(() => {
        playTick();
      }, 1000);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [showWarning]);

  // Sprawdzanie czasu wygaśnięcia tokenu
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = authService.getAccessToken();
      
      if (!token) {
        setShowWarning(false);
        return;
      }

      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const expirationTime = decoded.exp * 1000; // Konwersja na milisekundy
        const currentTime = Date.now();
        const timeRemaining = expirationTime - currentTime;
        const secondsLeft = Math.floor(timeRemaining / 1000);

        setSecondsRemaining(secondsLeft);

        // Pokaż ostrzeżenie jeśli zostało mniej niż WARNING_THRESHOLD sekund
        if (secondsLeft <= WARNING_THRESHOLD && secondsLeft > 0) {
          if (!showWarning) {
            setShowWarning(true);
          }
        } else if (secondsLeft <= 0) {
          // Token wygasł - wyloguj
          setShowWarning(false);
          logout();
        } else {
          if (showWarning) {
            setShowWarning(false);
          }
        }
      } catch (error) {
        console.error('Błąd dekodowania tokenu:', error);
      }
    };

    // Sprawdzaj co sekundę
    checkIntervalRef.current = setInterval(checkTokenExpiration, CHECK_INTERVAL);
    checkTokenExpiration(); // Sprawdź natychmiast

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [logout, showWarning]);

  // Funkcja odświeżania tokenu
  const refreshToken = async () => {
    try {
      const refreshTokenValue = authService.getRefreshToken();
      if (!refreshTokenValue) {
        throw new Error('Brak refresh token');
      }

      const response = await authService.refresh(refreshTokenValue);
      authService.saveTokens(response.data.accessToken, response.data.refreshToken);
      
      setShowWarning(false);
      console.log('✅ Token odświeżony pomyślnie');
    } catch (error) {
      console.error('❌ Błąd odświeżania tokenu:', error);
      logout();
    }
  };

  const dismissWarning = () => {
    setShowWarning(false);
  };

  return {
    showWarning,
    secondsRemaining,
    refreshToken,
    dismissWarning,
  };
};
