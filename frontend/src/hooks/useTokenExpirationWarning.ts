// src/hooks/useTokenExpirationWarning.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';
import { jwtDecode } from 'jwt-decode';
import { isApiRateLimited, getCorrectedTime, getServerTimeOffset } from '../services/api';

interface TokenExpirationHook {
  showWarning: boolean;
  secondsRemaining: number;
  refreshToken: () => Promise<void>;
  dismissWarning: () => void;
  isRefreshing: boolean;
  refreshError: string | null;
}

const WARNING_THRESHOLD = 40; // 40 sekund przed wygaśnięciem
const CHECK_INTERVAL = 1000; // Sprawdzaj co sekundę
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY = 5000; // 5 sekund między próbami
const MAX_RATE_LIMIT_WAIT = 60000; // Max 60s waiting when rate limited

export const useTokenExpirationWarning = (): TokenExpirationHook => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const refreshRetryCountRef = useRef(0);
  const lastRefreshAttemptRef = useRef(0);
  const rateLimitWaitStartRef = useRef<number | null>(null);
  
  const { logout } = useAuthStore();

  // Funkcja generująca dźwięk "tik" zegara
  const playTick = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext nie jest dostępny:', error);
        return;
      }
    }

    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, []);

  // Odtwarzaj tik co sekundę gdy pokazane ostrzeżenie
  useEffect(() => {
    if (showWarning && !isRefreshing) {
      void playTick();
      tickIntervalRef.current = window.setInterval(() => {
        void playTick();
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
  }, [showWarning, isRefreshing, playTick]);

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
        const expirationTime = decoded.exp * 1000;
        
        // ZMIANA: Użyj skorygowanego czasu zamiast Date.now()
        const currentTime = getCorrectedTime();
        const timeRemaining = expirationTime - currentTime;
        const secondsLeft = Math.floor(timeRemaining / 1000);

        // Debug log for significant clock skew
        const offset = getServerTimeOffset();
        if (Math.abs(offset) > 30000) {
          console.log(`🕐 Clock skew: ${Math.round(offset / 1000)}s, Token expires in: ${secondsLeft}s`);
        }

        setSecondsRemaining(secondsLeft);

        // Pokaż ostrzeżenie jeśli zostało mniej niż WARNING_THRESHOLD sekund
        if (secondsLeft <= WARNING_THRESHOLD && secondsLeft > 0) {
          if (!showWarning) {
            setShowWarning(true);
            setRefreshError(null);
            refreshRetryCountRef.current = 0;
            rateLimitWaitStartRef.current = null;
          }
        } else if (secondsLeft <= 0) {
          // Token wygasł
          setShowWarning(false);
          
          // Jeśli rate limited - nie wylogowuj od razu, spróbuj poczekać
          if (isApiRateLimited()) {
            // Track how long we've been waiting
            if (!rateLimitWaitStartRef.current) {
              rateLimitWaitStartRef.current = Date.now();
            }
            
            const waitTime = Date.now() - rateLimitWaitStartRef.current;
            
            if (waitTime > MAX_RATE_LIMIT_WAIT) {
              // Waited too long - force logout
              console.warn('⏰ Rate limit wait timeout - logging out');
              rateLimitWaitStartRef.current = null;
              logout();
            } else {
              const remainingWait = Math.ceil((MAX_RATE_LIMIT_WAIT - waitTime) / 1000);
              console.warn(`⚠️ Token expired but rate limited - waiting... ${remainingWait}s`);
              setRefreshError(`Sesja wygasła. Serwer przeciążony, wylogowanie za ${remainingWait}s...`);
            }
            return;
          }
          
          rateLimitWaitStartRef.current = null;
          logout();
        } else {
          if (showWarning) {
            setShowWarning(false);
            setRefreshError(null);
          }
          rateLimitWaitStartRef.current = null;
        }
      } catch (error) {
        console.error('Błąd dekodowania tokenu:', error);
        // Token jest uszkodzony - wyloguj
        logout();
      }
    };

    checkIntervalRef.current = window.setInterval(checkTokenExpiration, CHECK_INTERVAL);
    checkTokenExpiration();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [logout, showWarning]);

  // Funkcja odświeżania tokenu z obsługą błędów
  const refreshToken = useCallback(async () => {
    // Zapobiegaj wielokrotnym równoczesnym próbom
    const now = Date.now();
    if (isRefreshing || (now - lastRefreshAttemptRef.current < 2000)) {
      console.log('⏳ Refresh already in progress or too soon');
      return;
    }
    
    // Sprawdź rate limit
    if (isApiRateLimited()) {
      setRefreshError('Serwer jest przeciążony. Proszę poczekać chwilę...');
      return;
    }
    
    setIsRefreshing(true);
    setRefreshError(null);
    lastRefreshAttemptRef.current = now;
    
    try {
      const refreshTokenValue = authService.getRefreshToken();
      if (!refreshTokenValue) {
        throw new Error('Brak refresh token');
      }

      const response = await authService.refresh(refreshTokenValue);
      authService.saveTokens(response.data.accessToken, response.data.refreshToken);
      
      setShowWarning(false);
      setRefreshError(null);
      refreshRetryCountRef.current = 0;
      console.log('✅ Token odświeżony pomyślnie');
      
    } catch (error: any) {
      console.error('❌ Błąd odświeżania tokenu:', error);
      
      // Obsługa rate limit
      if (error.response?.status === 429) {
        refreshRetryCountRef.current++;
        
        if (refreshRetryCountRef.current < MAX_REFRESH_RETRIES) {
          setRefreshError(`Serwer przeciążony. Ponowna próba za ${REFRESH_RETRY_DELAY / 1000}s... (${refreshRetryCountRef.current}/${MAX_REFRESH_RETRIES})`);
          
          // Automatyczna ponowna próba
          setTimeout(() => {
            setIsRefreshing(false);
            void refreshToken();
          }, REFRESH_RETRY_DELAY);
          return;
        } else {
          setRefreshError('Nie udało się odświeżyć sesji. Proszę wylogować się i zalogować ponownie.');
        }
      } else {
        // Inne błędy - wyloguj
        setRefreshError('Błąd odświeżania sesji');
        setTimeout(() => logout(), 2000);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [logout, isRefreshing]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  // Cleanup AudioContext przy unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  // Nasłuchuj na event rate limit
  useEffect(() => {
    const handleRateLimit = (event: CustomEvent) => {
      setRefreshError(`Serwer przeciążony. Spróbuj za ${Math.ceil(event.detail.retryAfter / 1000)}s`);
    };
    
    window.addEventListener('rateLimitExceeded', handleRateLimit as EventListener);
    return () => {
      window.removeEventListener('rateLimitExceeded', handleRateLimit as EventListener);
    };
  }, []);

  return {
    showWarning,
    secondsRemaining,
    refreshToken,
    dismissWarning,
    isRefreshing,
    refreshError,
  };
};
