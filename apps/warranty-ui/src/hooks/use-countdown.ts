import { useEffect, useState } from 'react';

/** Seconds left until `until` (a ms timestamp), ticking once a second. 0 when done. */
export function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // refresh straight away when `until` changes
    const timer = until > Date.now() ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}
