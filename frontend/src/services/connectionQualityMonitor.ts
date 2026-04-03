// src/services/connectionQualityMonitor.ts
// Connection Quality Monitor - measures latency, bandwidth, and packet loss

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface ConnectionMetrics {
  quality: ConnectionQuality;
  latency: number;
  bandwidth: number;
  packetLoss: number;
  effectiveType?: string;
  timestamp: number;
}

export interface UploadRecommendation {
  shouldWarn: boolean;
  warning: string;
  estimatedTime: number;
}

// Quality classification thresholds
const THRESHOLDS = {
  excellent: { latency: 100, bandwidth: 5, packetLoss: 5 },
  good: { latency: 300, bandwidth: 1, packetLoss: 10 },
  poor: { latency: 1000, bandwidth: 0.1, packetLoss: 20 },
};

// Default/initial metrics
const DEFAULT_METRICS: ConnectionMetrics = {
  quality: 'excellent',
  latency: 0,
  bandwidth: 0,
  packetLoss: 0,
  effectiveType: undefined,
  timestamp: Date.now(),
};

// Module state
let currentMetrics: ConnectionMetrics = { ...DEFAULT_METRICS };
let callbacks: Array<(metrics: ConnectionMetrics) => void> = [];
let pingIntervalId: ReturnType<typeof setInterval> | null = null;
let bandwidthIntervalId: ReturnType<typeof setInterval> | null = null;
let packetLossIntervalId: ReturnType<typeof setInterval> | null = null;
let isMonitoring = false;
let monitoringRefCount = 0;

// Intervals (in milliseconds)
const PING_INTERVAL = 10000; // 10s
const BANDWIDTH_INTERVAL = 60000; // 60s
const PACKET_LOSS_INTERVAL = 30000; // 30s
const REQUEST_TIMEOUT = 8000; // 8s timeout

/**
 * Measure latency using ping endpoint
 */
const measureLatency = async (): Promise<number> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const start = Date.now();
    await fetch('/api/ping', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return Date.now() - start;
  } catch {
    clearTimeout(timeoutId);
    return REQUEST_TIMEOUT; // Return timeout value on failure
  }
};

/**
 * Measure bandwidth using speed-test endpoint (100 KB payload)
 */
const measureBandwidth = async (): Promise<number> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT * 2);

  try {
    const start = Date.now();
    const response = await fetch('/api/speed-test?size=100', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    await response.arrayBuffer(); // Read full response body
    clearTimeout(timeoutId);

    const duration = (Date.now() - start) / 1000; // seconds
    const bytes = 100 * 1024; // 100 KB
    const bitsPerSecond = (bytes * 8) / duration;
    return bitsPerSecond / (1024 * 1024); // Convert to Mbps
  } catch {
    clearTimeout(timeoutId);
    return 0;
  }
};

/**
 * Measure packet loss using 5 pings
 */
const measurePacketLoss = async (): Promise<number> => {
  const pings = 5;
  let failures = 0;

  const pingAttempts = Array.from({ length: pings }, async (_, i) => {
    // Stagger pings slightly to avoid burst
    await new Promise(resolve => setTimeout(resolve, i * 200));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      await fetch('/api/ping', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      clearTimeout(timeoutId);
      failures++;
    }
  });

  await Promise.all(pingAttempts);
  return (failures / pings) * 100;
};

/**
 * Get effective type from Navigator.connection API (optional enhancement)
 */
const getEffectiveType = (): string | undefined => {
  const connection =
    (navigator as Navigator).connection ||
    (navigator as Navigator).mozConnection ||
    (navigator as Navigator).webkitConnection;
  return connection?.effectiveType;
};

/**
 * Classify connection quality based on metrics
 */
const classifyQuality = (
  latency: number,
  bandwidth: number,
  packetLoss: number
): ConnectionQuality => {
  if (!navigator.onLine || latency >= REQUEST_TIMEOUT) {
    return 'offline';
  }

  if (
    latency < THRESHOLDS.excellent.latency &&
    bandwidth > THRESHOLDS.excellent.bandwidth &&
    packetLoss < THRESHOLDS.excellent.packetLoss
  ) {
    return 'excellent';
  }

  if (
    latency < THRESHOLDS.good.latency &&
    bandwidth > THRESHOLDS.good.bandwidth &&
    packetLoss < THRESHOLDS.good.packetLoss
  ) {
    return 'good';
  }

  if (
    latency < THRESHOLDS.poor.latency &&
    bandwidth > THRESHOLDS.poor.bandwidth &&
    packetLoss < THRESHOLDS.poor.packetLoss
  ) {
    return 'poor';
  }

  return 'offline';
};

/**
 * Update metrics and notify subscribers
 */
const updateMetrics = (partial: Partial<ConnectionMetrics>) => {
  const newMetrics: ConnectionMetrics = {
    ...currentMetrics,
    ...partial,
    timestamp: Date.now(),
  };

  // Recalculate quality whenever metrics change
  newMetrics.quality = classifyQuality(
    newMetrics.latency,
    newMetrics.bandwidth,
    newMetrics.packetLoss
  );

  const qualityChanged = newMetrics.quality !== currentMetrics.quality;
  currentMetrics = newMetrics;

  // Always notify on quality change, throttle otherwise
  if (qualityChanged) {
    window.dispatchEvent(
      new CustomEvent('connectionQualityChanged', { detail: currentMetrics })
    );
    callbacks.forEach(cb => cb(currentMetrics));
  }
};

/**
 * Run ping measurement and update latency
 */
const runPingTest = async () => {
  if (!navigator.onLine) {
    updateMetrics({ latency: REQUEST_TIMEOUT, quality: 'offline' });
    return;
  }

  const scheduleTask = (fn: () => void) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(fn, { timeout: 5000 });
    } else {
      setTimeout(fn, 0);
    }
  };

  scheduleTask(async () => {
    try {
      const latency = await measureLatency();
      updateMetrics({ latency, effectiveType: getEffectiveType() });
    } catch {
      // Ignore individual test failures
    }
  });
};

/**
 * Run bandwidth measurement
 */
const runBandwidthTest = async () => {
  if (!navigator.onLine) return;

  try {
    const bandwidth = await measureBandwidth();
    updateMetrics({ bandwidth });
  } catch {
    // Ignore individual test failures
  }
};

/**
 * Run packet loss measurement
 */
const runPacketLossTest = async () => {
  if (!navigator.onLine) return;

  try {
    const packetLoss = await measurePacketLoss();
    updateMetrics({ packetLoss });
  } catch {
    // Ignore individual test failures
  }
};

/**
 * Handle browser online event
 */
const handleOnline = () => {
  updateMetrics({ quality: 'poor' }); // Treat as poor until tests confirm quality
  runPingTest();
  runBandwidthTest();
};

/**
 * Handle browser offline event
 */
const handleOffline = () => {
  updateMetrics({
    quality: 'offline',
    latency: REQUEST_TIMEOUT,
  });
  callbacks.forEach(cb => cb(currentMetrics));
};

// ============================================================
// Public API
// ============================================================

/**
 * Start monitoring connection quality
 * Uses reference counting to support multiple consumers
 */
export const startMonitoring = (): void => {
  monitoringRefCount++;
  if (isMonitoring) return;
  isMonitoring = true;

  // Initial measurements
  runPingTest();
  runBandwidthTest();
  runPacketLossTest();

  // Schedule periodic measurements
  pingIntervalId = setInterval(runPingTest, PING_INTERVAL);
  bandwidthIntervalId = setInterval(runBandwidthTest, BANDWIDTH_INTERVAL);
  packetLossIntervalId = setInterval(runPacketLossTest, PACKET_LOSS_INTERVAL);

  // Browser online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
};

/**
 * Stop monitoring connection quality
 * Only actually stops when all consumers have called stopMonitoring
 */
export const stopMonitoring = (): void => {
  monitoringRefCount = Math.max(0, monitoringRefCount - 1);
  if (monitoringRefCount > 0) return;
  if (!isMonitoring) return;
  isMonitoring = false;

  if (pingIntervalId !== null) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  if (bandwidthIntervalId !== null) {
    clearInterval(bandwidthIntervalId);
    bandwidthIntervalId = null;
  }
  if (packetLossIntervalId !== null) {
    clearInterval(packetLossIntervalId);
    packetLossIntervalId = null;
  }

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};

/**
 * Subscribe to quality changes
 * @returns unsubscribe function
 */
export const onQualityChange = (callback: (metrics: ConnectionMetrics) => void): (() => void) => {
  callbacks.push(callback);
  return () => {
    callbacks = callbacks.filter(cb => cb !== callback);
  };
};

/**
 * Get current connection quality
 */
export const getCurrentQuality = (): ConnectionQuality => currentMetrics.quality;

/**
 * Get current connection metrics
 */
export const getCurrentMetrics = (): ConnectionMetrics => ({ ...currentMetrics });

/**
 * Get upload recommendation based on file size and current connection quality
 */
export const getUploadRecommendation = (fileSizeBytes: number): UploadRecommendation => {
  const { quality, bandwidth } = currentMetrics;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  if (quality === 'offline') {
    return {
      shouldWarn: true,
      warning: 'Brak połączenia z internetem. Upload zostanie wykonany automatycznie po przywróceniu połączenia.',
      estimatedTime: 0,
    };
  }

  if (quality === 'poor') {
    const estimatedTime = bandwidth > 0 ? (fileSizeMB * 8) / bandwidth : 0;
    return {
      shouldWarn: true,
      warning: `Słabe połączenie (${bandwidth.toFixed(2)} Mbps). Upload pliku ${fileSizeMB.toFixed(1)} MB może się nie powieść lub potrwać bardzo długo.`,
      estimatedTime: Math.round(estimatedTime),
    };
  }

  if (quality === 'good' && fileSizeMB > 10) {
    const estimatedTime = bandwidth > 0 ? (fileSizeMB * 8) / bandwidth : 0;
    return {
      shouldWarn: true,
      warning: `Duży plik (${fileSizeMB.toFixed(1)} MB) przy akceptowalnym połączeniu. Upload może potrwać chwilę.`,
      estimatedTime: Math.round(estimatedTime),
    };
  }

  return {
    shouldWarn: false,
    warning: '',
    estimatedTime: bandwidth > 0 ? Math.round((fileSizeMB * 8) / bandwidth) : 0,
  };
};
