import { Effect } from 'effect';
import type { Exit } from 'effect';

export function runExit<A, E>(effect: Effect.Effect<A, E>): Promise<Exit.Exit<A, E>> {
  return Effect.runPromiseExit(effect);
}

export const queryKeys = {
  appVersion: ['app', 'version'] as const,
  appConfig: ['config', 'app'] as const,
  connectionState: ['connection', 'state'] as const,
  savedServiceProfiles: ['connection', 'profiles'] as const,
  nowPlayingState: ['nowPlaying', 'state'] as const,
  mpvTracks: (connected: boolean) => ['mpv', 'tracks', connected] as const,
};
