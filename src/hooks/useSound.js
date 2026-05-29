import { useRef, useCallback } from "react";

export function useSound(src, { volume = 1, loop = false } = {}) {
  const audioRef = useRef(null);

  function getAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.volume = volume;
      audioRef.current.loop = loop;
    }
    return audioRef.current;
  }

  const play = useCallback(() => {
    try {
      const a = getAudio();
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  const stop = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
  }, []);

  return { play, stop };
}
