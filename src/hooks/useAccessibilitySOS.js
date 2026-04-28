import { useEffect, useRef, useCallback } from 'react';

/**
 * Accessibility SOS Hook
 * Detects shake gestures and rapid tap patterns for people who
 * cannot navigate the UI during a crisis (elderly, disabled, panicked).
 *
 * - 3 rapid shakes → triggers SOS callback
 * - 5 rapid taps anywhere on screen → triggers SOS callback
 *
 * This is critical for the most vulnerable people in any disaster
 * who may not be able to find and press a specific button.
 */
export default function useAccessibilitySOS(onSOS, enabled = true) {
  const shakeCountRef = useRef(0);
  const lastShakeRef = useRef(0);
  const tapTimesRef = useRef([]);
  const triggeredRef = useRef(false);
  const cooldownRef = useRef(false);

  const triggerSOS = useCallback(() => {
    if (triggeredRef.current || cooldownRef.current) return;
    triggeredRef.current = true;
    cooldownRef.current = true;

    onSOS?.();

    // Reset after 30 seconds cooldown
    setTimeout(() => {
      triggeredRef.current = false;
      cooldownRef.current = false;
      shakeCountRef.current = 0;
      tapTimesRef.current = [];
    }, 30000);
  }, [onSOS]);

  useEffect(() => {
    if (!enabled) return;

    // ─── Shake Detection (Mobile Accelerometer) ───────────────
    const SHAKE_THRESHOLD = 15;
    const SHAKE_TIMEOUT = 1000;
    const SHAKE_COUNT_NEEDED = 3;
    let lastX = 0, lastY = 0, lastZ = 0;

    function handleMotion(event) {
      const { x, y, z } = event.accelerationIncludingGravity || {};
      if (x == null) return;

      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      if (deltaX + deltaY + deltaZ > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current < SHAKE_TIMEOUT) {
          shakeCountRef.current += 1;
          if (shakeCountRef.current >= SHAKE_COUNT_NEEDED) {
            triggerSOS();
          }
        } else {
          shakeCountRef.current = 1;
        }
        lastShakeRef.current = now;
      }

      lastX = x; lastY = y; lastZ = z;
    }

    // ─── Rapid Tap Detection ──────────────────────────────────
    const TAP_WINDOW = 2000;
    const TAP_COUNT_NEEDED = 5;

    function handleTap() {
      const now = Date.now();
      tapTimesRef.current.push(now);

      // Keep only taps within the window
      tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < TAP_WINDOW);

      if (tapTimesRef.current.length >= TAP_COUNT_NEEDED) {
        triggerSOS();
      }
    }

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }
    document.addEventListener('click', handleTap);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      document.removeEventListener('click', handleTap);
    };
  }, [enabled, triggerSOS]);
}
