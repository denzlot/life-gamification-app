import { useEffect, useRef, useState } from "react";

export function useTimedActivation(durationMs: number) {
  const [activationKey, setActivationKey] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<number | undefined>();

  function trigger() {
    window.clearTimeout(timeoutRef.current);
    setActivationKey((value) => value + 1);
    setIsActive(true);
    timeoutRef.current = window.setTimeout(() => setIsActive(false), durationMs);
  }

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  return { activationKey, isActive, trigger };
}
