// src/hooks/useConnectionQuality.ts
import { useEffect, useState } from 'react';
import {
  startMonitoring,
  stopMonitoring,
  onQualityChange,
  getCurrentMetrics,
  getUploadRecommendation,
  type ConnectionMetrics,
  type ConnectionQuality,
} from '../services/connectionQualityMonitor';

export function useConnectionQuality() {
  const [metrics, setMetrics] = useState<ConnectionMetrics>(getCurrentMetrics());

  useEffect(() => {
    startMonitoring();

    const unsubscribe = onQualityChange((newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => {
      unsubscribe();
      stopMonitoring();
    };
  }, []);

  return {
    quality: metrics.quality as ConnectionQuality,
    latency: metrics.latency,
    bandwidth: metrics.bandwidth,
    packetLoss: metrics.packetLoss,
    effectiveType: metrics.effectiveType,
    metrics,
    getUploadRecommendation,
  };
}
