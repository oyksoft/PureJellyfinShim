import type { ConnectionState, MediaServerProvider } from '@bindings';
import { Effect, Exit } from 'effect';

export function runExit<A, E>(effect: Effect.Effect<A, E>): Promise<Exit.Exit<A, E>> {
  return Effect.runPromiseExit(effect);
}

export type LibrarySessionKey = Readonly<{
  provider: MediaServerProvider | 'disconnected';
  serverUrl: string | null;
  userId: string | null;
}>;

const disconnectedLibrarySessionKey: LibrarySessionKey = {
  provider: 'disconnected',
  serverUrl: null,
  userId: null,
};

export function librarySessionKey(connectionState: ConnectionState | null | undefined) {
  if (!connectionState?.connected || !connectionState.serverUrl || !connectionState.userId) {
    return disconnectedLibrarySessionKey;
  }

  return {
    provider: connectionState.provider,
    serverUrl: connectionState.serverUrl,
    userId: connectionState.userId,
  } satisfies LibrarySessionKey;
}

export function librarySessionKeyFromConnectionExit(
  connectionState: Exit.Exit<ConnectionState, unknown> | undefined,
) {
  return connectionState && Exit.isSuccess(connectionState)
    ? librarySessionKey(connectionState.value)
    : disconnectedLibrarySessionKey;
}

export function isLibrarySessionKeyConnected(sessionKey: LibrarySessionKey) {
  return (
    sessionKey.provider !== 'disconnected' &&
    sessionKey.serverUrl !== null &&
    sessionKey.userId !== null
  );
}

export function librarySessionSignature(sessionKey: LibrarySessionKey) {
  return isLibrarySessionKeyConnected(sessionKey)
    ? `${sessionKey.provider}\u0000${sessionKey.serverUrl}\u0000${sessionKey.userId}`
    : null;
}

export const queryKeys = {
  appVersion: ['app', 'version'] as const,
  appConfig: ['config', 'app'] as const,
  connectionState: ['connection', 'state'] as const,
  savedServiceProfiles: ['connection', 'profiles'] as const,
  nowPlayingState: ['nowPlaying', 'state'] as const,
  mpvTracks: (connected: boolean) => ['mpv', 'tracks', connected] as const,
  libraryRoot: ['library'] as const,
};
