"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AntiCheatEvent {
  type: "tab_switch" | "fullscreen_exit" | "focus_lost" | "copy_attempt" | "right_click";
  timestamp: string;
  details?: Record<string, unknown>;
}

interface UseAntiCheatOptions {
  participantId: string;
  sessionId: string;
  submissionId: string;
  enabled?: boolean;
  onSuspiciousActivity?: (event: AntiCheatEvent) => void;
}

export function useAntiCheat({
  participantId,
  sessionId,
  submissionId,
  enabled = true,
  onSuspiciousActivity,
}: UseAntiCheatOptions) {
  const supabase = createClient();
  const violationCount = useRef(0);

  const logEvent = useCallback(
    async (eventType: string, details?: Record<string, unknown>) => {
      if (!enabled) return;
      violationCount.current++;

      const event: AntiCheatEvent = {
        type: eventType as AntiCheatEvent["type"],
        timestamp: new Date().toISOString(),
        details,
      };

      // Call UI callback
      if (onSuspiciousActivity) onSuspiciousActivity(event);

      // Log to Supabase
      try {
        await supabase.from("activity_logs").insert({
          participant_id: participantId,
          session_id: sessionId,
          event_type: eventType,
          severity: violationCount.current >= 3 ? "critical" : "warning",
          details: { ...details, violation_count: violationCount.current },
        });

        // Update suspicious_count on submission
        await supabase
          .from("exam_submissions")
          .update({ suspicious_count: violationCount.current })
          .eq("id", submissionId);
      } catch {
        // Silent fail — don't disrupt the exam
      }
    },
    [enabled, participantId, sessionId, submissionId, supabase, onSuspiciousActivity]
  );

  // Tab visibility change
  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_switch", { document_title: document.title });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, logEvent]);

  // Window blur (focus lost)
  useEffect(() => {
    if (!enabled) return;
    let blurTimer: ReturnType<typeof setTimeout>;
    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        logEvent("focus_lost", { timestamp: new Date().toISOString() });
      }, 2000); // Only log if focus is lost for >2 seconds
    };
    const handleFocus = () => clearTimeout(blurTimer);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(blurTimer);
    };
  }, [enabled, logEvent]);

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    if (!enabled) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen denied — log it
      logEvent("fullscreen_denied", {});
    }
  }, [enabled, logEvent]);

  const exitFullscreenListener = useCallback(() => {
    if (!document.fullscreenElement && enabled) {
      logEvent("fullscreen_exit", { timestamp: new Date().toISOString() });
    }
  }, [enabled, logEvent]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("fullscreenchange", exitFullscreenListener);
    return () => document.removeEventListener("fullscreenchange", exitFullscreenListener);
  }, [enabled, exitFullscreenListener]);

  // Disable right-click
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      logEvent("right_click", {});
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [enabled, logEvent]);

  // Disable copy
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("copy_attempt", {});
    };
    document.addEventListener("copy", handler);
    return () => document.removeEventListener("copy", handler);
  }, [enabled, logEvent]);

  return {
    violationCount: violationCount.current,
    enterFullscreen,
    logEvent,
  };
}
