import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query';
import { createFileRoute, useNavigate } from '@tanstack/solid-router';
import {
  CheckCircle2,
  Circle,
  LoaderCircle,
  Play,
  RefreshCw,
  Settings,
  XCircle,
} from 'lucide-solid';
import { createMemo, Match, Show, Switch } from 'solid-js';
import { fetchConnectionState } from '~effects/connection';
import { fetchSavedServiceProfiles } from '~effects/profiles';
import { queryKeys, runExit } from '~effects/query';

import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n';
import { restoreSavedSession } from '../../sessionAccess';
import * as styles from './home.styles';

export const Route = createFileRoute('/_authenticated/home')({
  component: HomePage,
});

function getInitials(name: string): string {
  return name
    .split(/[\s-]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function HomePage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const clearLibraryQueries = () => {
    queryClient.removeQueries({ queryKey: queryKeys.libraryRoot });
  };

  const refreshMutation = createMutation(() => ({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.connectionState });
      await queryClient.invalidateQueries({ queryKey: queryKeys.savedServiceProfiles });
    },
  }));

  const reconnectMutation = createMutation(() => ({
    mutationFn: restoreSavedSession,
  }));

  const connectionQuery = createQuery(() => ({
    queryKey: queryKeys.connectionState,
    queryFn: () => runExit(fetchConnectionState),
  }));
  const profilesQuery = createQuery(() => ({
    queryKey: queryKeys.savedServiceProfiles,
    queryFn: () => runExit(fetchSavedServiceProfiles),
  }));

  const connectionStatus = createMemo(() => {
    const result = connectionQuery.data;
    if (!result) return 'loading';
    if (result._tag === 'Failure') return 'error';
    return result.value.connected ? 'connected' : 'disconnected';
  });

  const profiles = createMemo(() => {
    const result = profilesQuery.data;
    if (result?._tag !== 'Success') return [];
    return result.value.profiles;
  });

  const activeProfileKey = createMemo(() => {
    const result = profilesQuery.data;
    if (result?._tag !== 'Success') return null;
    return result.value.activeProfileKey;
  });

  const handleRefresh = () => {
    if (refreshMutation.isPending) return;
    void refreshMutation.mutateAsync();
  };

  const handleReconnect = async () => {
    if (reconnectMutation.isPending) return;
    const success = await reconnectMutation.mutateAsync();
    if (success) {
      clearLibraryQueries();
      showToast('success', 'Reconnected');
    } else {
      showToast('error', 'Reconnection failed');
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.connectionState });
    void queryClient.invalidateQueries({ queryKey: queryKeys.savedServiceProfiles });
  };

  return (
    <div class={styles.page}>
      <div class={styles.ambientBg} />
      <div class={styles.ambientBg2} />

      <header class={styles.header}>
        <div class={styles.logoArea}>
          <div class={styles.logo}>
            <Play class={styles.logoIcon} />
          </div>
          <div>
            <h1 class={styles.title}>{t().app.name}</h1>
            <p class={styles.subtitle}>{t().app.subtitle}</p>
          </div>
        </div>
        <div class={styles.headerActions}>
          <button
            type="button"
            class={styles.refreshButton}
            onClick={handleRefresh}
            aria-label="Refresh"
            disabled={refreshMutation.isPending}
          >
            <RefreshCw class={styles.refreshIcon({ spinning: refreshMutation.isPending })} />
          </button>
          <button
            type="button"
            class={styles.settingsButton}
            onClick={() => navigate({ to: '/ops' })}
            aria-label={t().home.openSettings}
          >
            <Settings class={styles.settingsIcon} />
          </button>
        </div>
      </header>

      <main class={styles.content}>
        <div class={styles.statusSection}>
          <div class={styles.statusRing}>
            <Show when={connectionStatus() === 'connected'}>
              <div class={styles.statusRingPulse} />
            </Show>
            <div class={styles.statusRingOuter} />
            <Switch>
              <Match when={connectionStatus() === 'loading'}>
                <LoaderCircle class={styles.statusIconLoading} />
              </Match>
              <Match when={connectionStatus() === 'connected'}>
                <CheckCircle2 class={styles.statusIcon} />
              </Match>
              <Match when={connectionStatus() === 'disconnected'}>
                <Circle class={styles.statusIcon} />
              </Match>
              <Match when={connectionStatus() === 'error'}>
                <XCircle class={styles.statusIconError} />
              </Match>
            </Switch>
          </div>

          <Switch>
            <Match when={connectionStatus() === 'loading'}>
              <h2 class={styles.statusTitle}>{t().status.connecting}</h2>
              <p class={styles.statusDesc}>{t().status.connectingDesc}</p>
            </Match>
            <Match when={connectionStatus() === 'connected'}>
              <h2 class={styles.statusTitle}>{t().status.ready}</h2>
              <p class={styles.statusDesc}>{t().status.readyDesc}</p>
            </Match>
            <Match when={connectionStatus() === 'disconnected'}>
              <h2 class={styles.statusTitle}>{t().status.standby}</h2>
              <p class={styles.statusDesc}>{t().status.standbyDesc}</p>
            </Match>
            <Match when={connectionStatus() === 'error'}>
              <h2 class={styles.statusTitle}>{t().status.error}</h2>
              <p class={styles.statusDesc}>{t().status.errorDesc}</p>
            </Match>
          </Switch>
        </div>

        <Show when={connectionStatus() === 'disconnected' && activeProfileKey()}>
          <button
            type="button"
            class={styles.reconnectButton}
            onClick={handleReconnect}
            disabled={reconnectMutation.isPending}
          >
            {reconnectMutation.isPending ? 'Reconnecting…' : 'Reconnect'}
          </button>
        </Show>

        <Show when={profiles().length > 0}>
          <div class={styles.servicesSection}>
            <div class={styles.sectionHeader}>
              <h3 class={styles.sectionTitle}>{t().services.title}</h3>
            </div>
            <ul class={styles.servicesList}>
              {profiles().map((profile) => (
                <li class={styles.serviceItem}>
                  <div class={styles.serviceAvatar}>{getInitials(profile.userName ?? 'U')}</div>
                  <div class={styles.serviceInfo}>
                    <div class={styles.serviceName}>{profile.serverName ?? profile.serverUrl}</div>
                    <div class={styles.serviceUser}>{profile.userName}</div>
                  </div>
                  <Show when={profile.key === activeProfileKey()}>
                    <span class={styles.activeBadge}>{t().services.active}</span>
                  </Show>
                </li>
              ))}
            </ul>
          </div>
        </Show>

        <p class={styles.hint}>{t().app.poweredBy}</p>
      </main>
    </div>
  );
}
