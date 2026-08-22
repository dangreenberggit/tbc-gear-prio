/**
 * The one animated re-sort at completion (PLAN.md §12).
 *
 * FLIP: record where each row sat before the layout changed, let React commit
 * the new order, then transform each row back to its old position and release
 * it. The browser animates the release, so rows slide from their run-order
 * positions into their ranked ones and rowless skeletons vanish inside the
 * same motion.
 *
 * Fires exactly once per mount, on the transition into `done`. A later view
 * control re-renders with no animation: §12 objects to lists reshuffling while
 * you read them, and treats a re-sort you just asked for as a third case that
 * needs no "done" signal.
 */
import { useLayoutEffect, useRef, type RefObject } from "react";

const DURATION_MS = 300;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Row identity across the re-sort, so a row is matched to its own old box. */
function keyOf(el: HTMLElement): string | undefined {
  return el.dataset["itemId"];
}

export function useFlipOnce(
  container: RefObject<HTMLElement | null>,
  done: boolean
): void {
  const before = useRef<Map<string, number> | undefined>(undefined);
  const played = useRef(false);

  // Runs on every commit while the run is live, so the frame *before*
  // completion is the one measured. A useEffect would read positions after
  // the browser had already painted the new order.
  useLayoutEffect(() => {
    const el = container.current;
    if (el === null || played.current) return;

    if (!done) {
      const positions = new Map<string, number>();
      for (const child of el.children) {
        const key = keyOf(child as HTMLElement);
        if (key !== undefined) {
          positions.set(
            key,
            (child as HTMLElement).getBoundingClientRect().top
          );
        }
      }
      before.current = positions;
      return;
    }

    played.current = true;
    const previous = before.current;
    if (previous === undefined || prefersReducedMotion()) return;

    for (const child of el.children) {
      const node = child as HTMLElement;
      const key = keyOf(node);
      if (key === undefined) continue;
      const wasTop = previous.get(key);
      if (wasTop === undefined) continue;

      const delta = wasTop - node.getBoundingClientRect().top;
      if (delta === 0) continue;

      node.style.transform = `translateY(${String(delta)}px)`;
      node.style.transition = "none";
    }

    // One frame with the old positions applied, then release them all
    // together so the browser interpolates a single co-ordinated motion.
    requestAnimationFrame(() => {
      for (const child of el.children) {
        const node = child as HTMLElement;
        if (node.style.transform === "") continue;
        node.style.transition = `transform ${String(DURATION_MS)}ms ease`;
        node.style.transform = "";
      }
    });
  }, [container, done]);
}
