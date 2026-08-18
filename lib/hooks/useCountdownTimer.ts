"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseCountdownTimerOptions {
  durationSeconds: number;
  onExpire?: () => void;
  onWarning?: (secondsLeft: number) => void;
  warningThresholds?: number[]; // seconds at which to fire warnings
}

interface CountdownState {
  secondsLeft: number;
  isExpired: boolean;
  isWarning: boolean;  // < 10 minutes
  isCritical: boolean; // < 5 minutes
  display: string;     // HH:MM:SS
  percentLeft: number;
}

export function useCountdownTimer({
  durationSeconds,
  onExpire,
  onWarning,
  warningThresholds = [600, 300, 60], // 10 min, 5 min, 1 min
}: UseCountdownTimerOptions): CountdownState & { pause: () => void; resume: () => void } {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedWarnings = useRef<Set<number>>(new Set());
  const hasExpired = useRef(false);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      const next = prev - 1;

      // Fire warning callbacks
      if (onWarning) {
        warningThresholds.forEach((threshold) => {
          if (next <= threshold && !firedWarnings.current.has(threshold)) {
            firedWarnings.current.add(threshold);
            onWarning(next);
          }
        });
      }

      // Fire expire callback
      if (next <= 0 && !hasExpired.current) {
        hasExpired.current = true;
        if (onExpire) setTimeout(onExpire, 0);
        return 0;
      }

      return Math.max(0, next);
    });
  }, [onExpire, onWarning, warningThresholds]);

  useEffect(() => {
    if (!isPaused && secondsLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, secondsLeft, tick]);

  const formatDisplay = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0,
    isWarning: secondsLeft <= 600 && secondsLeft > 300, // 10–5 min
    isCritical: secondsLeft <= 300, // < 5 min
    display: formatDisplay(secondsLeft),
    percentLeft: durationSeconds > 0 ? (secondsLeft / durationSeconds) * 100 : 0,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
  };
}
