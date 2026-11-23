import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  DEFAULT_SKELETON_DURATION_MS,
  resolveSkeletonDurationMs,
} from '../utils/skeletons';

/**
 * Triggers a brief, smooth minimalist skeleton placeholder phase whenever
 * `transitionKey` changes (or on initial route mount) so product grids and
 * detail views reveal cleanly without abrupt visual pops.
 */
export function useTransitionSkeleton(
  transitionKey: string,
  baseDurationMs = DEFAULT_SKELETON_DURATION_MS,
): boolean {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const durationMs = resolveSkeletonDurationMs(prefersReducedMotion, baseDurationMs);
  const [isLoading, setIsLoading] = useState<boolean>(durationMs > 0);

  useEffect(() => {
    if (durationMs <= 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [transitionKey, durationMs]);

  return isLoading;
}
