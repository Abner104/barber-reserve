import { useEffect, useRef } from "react";

const SRC = "/sound/freesound_community-shaver-39110.mp3";

/**
 * Reproduce el sonido de máquina de afeitar en loop mientras `active` es true.
 * Pensado para engancharse al estado de loading de un botón (isPending, loading, etc.):
 *
 *   const mut = useMutation({ ... });
 *   useLoadingSound(mut.isPending);
 *
 * Respeta el bloqueo de autoplay del navegador — si no hubo interacción previa,
 * el sonido puede no sonar la primera vez, pero como esto se dispara por un click
 * del propio usuario (el que activa el loading), casi siempre hay interacción ya.
 */
export function useLoadingSound(active, { volume = 0.5 } = {}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const a = new Audio(SRC);
    a.loop = true;
    a.volume = volume;
    audioRef.current = a;
    a.play().catch(() => {});

    return () => {
      a.pause();
      a.currentTime = 0;
      if (audioRef.current === a) audioRef.current = null;
    };
  }, [active, volume]);
}
