import { useSyncExternalStore } from "react";

let webglSupport: boolean | undefined;

/**
 * r3f reports a failed WebGL context asynchronously, which an error boundary
 * cannot catch — so probe once up front instead of letting a scene mount.
 */
function detectWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglSupport = gl !== null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const subscribeNever = () => () => {};

/** `null` on the server and during hydration, so the first client render matches the HTML. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, () => null);
}
