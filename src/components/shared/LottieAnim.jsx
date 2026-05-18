import { Player } from "@lottiefiles/react-lottie-player";

/**
 * Wrapper de Lottie para animaciones.
 * Acepta src (URL de lottiefiles) o animationData (JSON local).
 *
 * Uso:
 * <LottieAnim src="https://assets.lottiefiles.com/xxx.json" width={200} />
 * <LottieAnim animationData={myJson} loop={false} />
 */
export default function LottieAnim({
  src,
  animationData,
  width = 200,
  height,
  loop = true,
  autoplay = true,
  style = {},
  onComplete,
}) {
  return (
    <Player
      src={src}
      animationData={animationData}
      autoplay={autoplay}
      loop={loop}
      style={{ width, height: height ?? width, ...style }}
      onEvent={event => {
        if (event === "complete" && onComplete) onComplete();
      }}
    />
  );
}
