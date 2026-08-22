import { Dialog } from '@ark-ui/solid/dialog';
import { createForm } from '@tanstack/solid-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/solid-query';
import { Exit, Option } from 'effect';
import {
  Activity,
  Bookmark,
  Globe,
  Keyboard,
  Monitor,
  MonitorPlay,
  Network,
  SkipForward,
  X,
} from 'lucide-solid';
import { For, Show, createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import * as recipes from '~styles/recipes';

import type { AppConfig, IntroSkipperMode, SavedServiceProfileSummary } from '../bindings';
import { commandFailure, commandFailureMessage } from '../effects/commands';
import { detectMpv, fetchConfig, saveConfig } from '../effects/config';
import { disconnectJellyfin, fetchConnectionState } from '../effects/connection';
import {
  activateSavedServiceProfile,
  fetchSavedServiceProfiles,
  removeSavedServiceProfile,
} from '../effects/profiles';
import { queryKeys, runExit } from '../effects/query';
import { useI18n, type SupportedLocale } from '../i18n';
import { restoreSavedSession } from '../sessionAccess';
import LoginPage from './LoginPage';
import * as styles from './OperationsConsole.styles';
import ConnectionCard from './OperationsConsole/ConnectionCard';
import DiagnosticsCard from './OperationsConsole/DiagnosticsCard';
import IntroSkipCard from './OperationsConsole/IntroSkipCard';
import LanguageCard from './OperationsConsole/LanguageCard';
import PlayerBridgeSettingsCard from './OperationsConsole/PlayerBridgeSettingsCard';
import SavedServicesCard from './OperationsConsole/SavedServicesCard';
import ShortcutKeysCard from './OperationsConsole/ShortcutKeysCard';
import { createOperationsConsoleStore } from './OperationsConsole/store';
import {
  normalizePreferredSubtitleLanguages,
  parseSubtitleLanguageInput,
} from './OperationsConsole/subtitleLanguages';
import SystemCard from './OperationsConsole/SystemCard';
import { useToast } from './ToastProvider';
import { Button, PageFooter } from './ui';
import type { JellyPilotSelectItem } from './ui';

type ServiceDialogState =
  | { kind: 'add' }
  | { kind: 'reauthenticate'; profile: SavedServiceProfileSummary };

type SettingsSection =
  | 'language'
  | 'system'
  | 'saved-services'
  | 'connection'
  | 'player'
  | 'intro-skip'
  | 'shortcuts'
  | 'diagnostics';

export default function OperationsConsole() {
  const { showToast } = useToast();
  const { t, supportedLocale, setLocale } = useI18n();
  const { state: ui, actions, Provider } = createOperationsConsoleStore();
  const [serviceDialog, setServiceDialog] = createSignal<ServiceDialogState | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = createSignal(false);
  const [activeSection, setActiveSection] = createSignal<SettingsSection>('language');

  const languageOptions: { value: SupportedLocale; label: string }[] = [
    { value: 'auto', label: 'Auto / 自动' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '简体中文' },
  ];

  const openServiceDialog = (dialog: ServiceDialogState) => {
    setServiceDialog(dialog);
    setServiceDialogOpen(true);
  };
  const closeServiceDialog = () => setServiceDialogOpen(false);
  const [addServicePortalMount, setAddServicePortalMount] = createSignal<HTMLDivElement>();
  const [activatingProfileKey, setActivatingProfileKey] = createSignal<string | null>(null);
  const [removingProfileKey, setRemovingProfileKey] = createSignal<string | null>(null);
  let contentRef: HTMLDivElement | undefined;

  const scrollToSection = (section: SettingsSection) => {
    setActiveSection(section);
    const el = contentRef?.querySelector(`[data-section="${section}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  onMount(() => {
    const root = contentRef;
    if (!root) return;
    let frame = 0;
    const compute = () => {
      const sections = [...root.querySelectorAll<HTMLElement>('[data-section]')];
      if (sections.length === 0) return;
      const rootRect = root.getBoundingClientRect();
      const triggerLine = rootRect.top + 80;
      let current: SettingsSection | null = null;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= triggerLine) {
          current = (section.dataset.section as SettingsSection) ?? null;
        } else {
          break;
        }
      }
      if (!current) current = (sections[0]?.dataset.section as SettingsSection) ?? null;
      if (current) setActiveSection(current);
    };
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(compute);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    compute();
    onCleanup(() => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onScroll);
    });
  });

  interface NavItem {
    id: SettingsSection;
    label: () => string;
    Icon: typeof Network;
  }

  const mediaNavItems: NavItem[] = [
    { id: 'language', label: () => t().settings.language, Icon: Globe },
    { id: 'system', label: () => t().settings.system, Icon: Monitor },
    { id: 'saved-services', label: () => t().settings.savedServices, Icon: Bookmark },
    { id: 'connection', label: () => t().settings.connection, Icon: Network },
  ];

  const playbackNavItems: NavItem[] = [
    { id: 'player', label: () => t().settings.playerBridgeSettings, Icon: MonitorPlay },
    { id: 'intro-skip', label: () => t().settings.introSkip, Icon: SkipForward },
    { id: 'shortcuts', label: () => t().settings.shortcutKeys, Icon: Keyboard },
    { id: 'diagnostics', label: () => t().settings.diagnostics, Icon: Activity },
  ];

  const visiblePlaybackNavItems = () =>
    playbackNavItems.filter(
      (item) => item.id !== 'intro-skip' || (capabilities()?.introSkipper ?? true),
    );

  let configHydrated = false;
  interface PendingSave {
    config: AppConfig;
    onSuccess?: () => void;
    onError?: (message: string) => void;
  }
  let lastSavedConfig: AppConfig | null = null;
  let saveInFlight = false;
  let pendingSave: PendingSave | null = null;
  let latestConfigSnapshot: AppConfig | null = null;
  let clearPlayerBridgeStatusTimer: ReturnType<typeof setTimeout> | null = null;

  const subtitleLanguageSelectItems: JellyPilotSelectItem[] = [
    { label: 'eng — English', value: 'eng' },
    { label: 'jpn — Japanese', value: 'jpn' },
    { label: 'spa — Spanish', value: 'spa' },
    { label: 'fre — French', value: 'fre' },
    { label: 'ger — German', value: 'ger' },
    { label: 'ita — Italian', value: 'ita' },
    { label: 'por — Portuguese', value: 'por' },
    { label: 'chi — Chinese', value: 'chi' },
    { label: 'kor — Korean', value: 'kor' },
  ];

  const queryClient = useQueryClient();
  const connectionQuery = createQuery(() => ({
    queryKey: queryKeys.connectionState,
    queryFn: () => runExit(fetchConnectionState),
  }));
  const profilesQuery = createQuery(() => ({
    queryKey: queryKeys.savedServiceProfiles,
    queryFn: () => runExit(fetchSavedServiceProfiles),
  }));
  const configQuery = createQuery(() => ({
    queryKey: queryKeys.appConfig,
    queryFn: () => runExit(fetchConfig),
  }));
  const saveConfigMutation = createMutation(() => ({
    mutationFn: (config: AppConfig) => runExit(saveConfig(config)),
  }));
  const disconnectMutation = createMutation(() => ({
    mutationFn: () => runExit(disconnectJellyfin),
  }));
  const detectMpvMutation = createMutation(() => ({
    mutationFn: () => runExit(detectMpv),
  }));
  const reconnectMutation = createMutation(() => ({
    mutationFn: restoreSavedSession,
  }));
  const activateProfileMutation = createMutation(() => ({
    mutationFn: (key: string) => runExit(activateSavedServiceProfile(key)),
  }));
  const removeProfileMutation = createMutation(() => ({
    mutationFn: (key: string) => runExit(removeSavedServiceProfile(key)),
  }));
  const clearLibraryQueries = () => {
    queryClient.removeQueries({ queryKey: queryKeys.libraryRoot });
  };
  let loggedConfigFailure: string | null = null;
  createEffect(() => {
    const result = configQuery.data;
    if (!result || Exit.isSuccess(result)) return;
    const message = commandFailureMessage(result.cause, 'Could not load configuration');
    if (message === loggedConfigFailure) return;
    loggedConfigFailure = message;
    console.error('Failed to load config:', message);
  });

  const form = createForm(() => ({
    defaultValues: {
      deviceName: 'PureJellyfinShim',
      introSkipperMode: 'automatic' as IntroSkipperMode,
      keybindIntroSkip: 'g',
      keybindNext: 'Shift+>',
      keybindPrev: 'Shift+<',
      mpvPath: '',
    },
  }));

  createEffect(() => {
    const cfg = config();
    if (cfg && !configHydrated) {
      lastSavedConfig = cfg;
      form.setFieldValue('deviceName', cfg.deviceName ?? 'PureJellyfinShim');
      form.setFieldValue('mpvPath', cfg.mpvPath ?? '');
      form.setFieldValue('keybindNext', cfg.keybindNext ?? 'Shift+>');
      form.setFieldValue('keybindPrev', cfg.keybindPrev ?? 'Shift+<');
      form.setFieldValue('keybindIntroSkip', cfg.keybindIntroSkip ?? 'g');
      actions.hydrateFromConfig({
        introSkipperMode: cfg.introSkipperMode ?? 'automatic',
        preferredSubtitleLanguages: normalizePreferredSubtitleLanguages(
          cfg.preferredSubtitleLanguages,
        ),
      });
      form.setFieldValue('introSkipperMode', cfg.introSkipperMode ?? 'automatic');
      configHydrated = true;
    }
  });

  const state = () =>
    connectionQuery.data && Exit.isSuccess(connectionQuery.data)
      ? connectionQuery.data.value
      : undefined;
  const profiles = () =>
    profilesQuery.data && Exit.isSuccess(profilesQuery.data) ? profilesQuery.data.value : null;
  const capabilities = () => state()?.capabilities;
  const config = () =>
    configQuery.data && Exit.isSuccess(configQuery.data) ? configQuery.data.value : null;
  const introSkipperMode = () => ui.introSkipperDraft ?? config()?.introSkipperMode ?? 'automatic';

  const showPlayerBridgeStatus = (type: 'saving' | 'saved' | 'error', text: string) => {
    if (clearPlayerBridgeStatusTimer) {
      clearTimeout(clearPlayerBridgeStatusTimer);
      clearPlayerBridgeStatusTimer = null;
    }
    actions.showPlayerBridgeStatus({ text, type });
    if (type === 'saved') {
      clearPlayerBridgeStatusTimer = setTimeout(() => actions.clearPlayerBridgeStatus(), 3000);
    }
  };

  // parseMpvArgs was removed alongside the advanced-options UI; users now
  // set MPV flags in mpv.conf.

  const buildConfigSnapshot = (overrides: Partial<AppConfig>) => {
    const saved = pendingSave?.config ?? latestConfigSnapshot ?? lastSavedConfig ?? config();
    if (!saved) {
      return null;
    }

    return {
      ...saved,
      ...overrides,
    };
  };

  const processConfigSaveQueue = async () => {
    if (saveInFlight) {
      return;
    }
    saveInFlight = true;

    try {
      while (pendingSave) {
        const nextSave = pendingSave;
        pendingSave = null;
        showPlayerBridgeStatus('saving', 'Saving…');

        const exit = await saveConfigMutation.mutateAsync(nextSave.config);
        if (Exit.isSuccess(exit)) {
          lastSavedConfig = nextSave.config;
          queryClient.setQueryData(queryKeys.appConfig, Exit.succeed(nextSave.config));
          nextSave.onSuccess?.();
          showPlayerBridgeStatus('saved', 'Saved');
        } else {
          const message = commandFailureMessage(exit.cause, 'Could not save configuration');
          nextSave.onError?.(message);
          showPlayerBridgeStatus('error', message);
          showToast('error', message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showPlayerBridgeStatus('error', message);
      showToast('error', message);
    } finally {
      saveInFlight = false;
      if (pendingSave) {
        void processConfigSaveQueue();
      }
    }
  };

  const queueConfigSave = (
    snapshot: AppConfig | null,
    callbacks: Omit<PendingSave, 'config'> = {},
  ) => {
    if (!snapshot) {
      return;
    }
    latestConfigSnapshot = snapshot;
    pendingSave = { config: snapshot, ...callbacks };
    void processConfigSaveQueue();
  };

  const saveTextSetting = (
    field: 'deviceName' | 'mpvPath' | 'keybindNext' | 'keybindPrev' | 'keybindIntroSkip',
    value: string,
  ) => {
    const saved = lastSavedConfig ?? config();
    const desired = latestConfigSnapshot ?? saved;
    if (!saved || !desired) {
      return;
    }

    if (field === 'deviceName' && value.trim().length === 0) {
      return;
    }
    if (field === 'keybindNext' && value.trim().length === 0) {
      return;
    }
    if (field === 'keybindPrev' && value.trim().length === 0) {
      return;
    }
    if (field === 'keybindIntroSkip' && value.trim().length === 0) {
      return;
    }

    const override =
      field === 'mpvPath'
        ? { mpvPath: value.trim().length > 0 ? value : null }
        : { [field]: value };

    if (field === 'mpvPath') {
      if (override.mpvPath === desired.mpvPath) {
        return;
      }
    } else if (value === desired[field]) {
      return;
    }

    queueConfigSave(buildConfigSnapshot(override));
  };

  const savePreferredSubtitleLanguages = (languages: string[]) => {
    const desired = latestConfigSnapshot ?? lastSavedConfig ?? config();
    if (
      desired &&
      languages.length === (desired.preferredSubtitleLanguages?.length ?? 0) &&
      languages.every((language, index) => language === desired.preferredSubtitleLanguages?.[index])
    ) {
      return;
    }

    queueConfigSave(buildConfigSnapshot({ preferredSubtitleLanguages: languages }));
  };

  const saveIntroSkipperSetting = (mode: IntroSkipperMode) => {
    const previous = introSkipperMode();
    const desired = latestConfigSnapshot ?? lastSavedConfig ?? config();
    if (desired?.introSkipperMode === mode) {
      return;
    }

    actions.beginIntroSkipperSave(mode);
    queueConfigSave(buildConfigSnapshot({ introSkipperMode: mode }), {
      onError: (message) => {
        actions.failIntroSkipperSave(previous, message);
        form.setFieldValue('introSkipperMode', previous);
      },
      onSuccess: () => {
        actions.finishIntroSkipperSave();
      },
    });
  };

  const saveStartMinimizedSetting = (value: boolean) => {
    const desired = latestConfigSnapshot ?? lastSavedConfig ?? config();
    if (!desired) return;
    if (value === desired.startMinimized) return;
    queueConfigSave(buildConfigSnapshot({ startMinimized: value }));
  };

  const addPreferredSubtitleLanguageCodes = (languages: string[]) => {
    if (languages.length === 0) {
      return;
    }

    const current = ui.selectedSubtitleLanguages;
    const seen = new Set(current);
    const next = [...current];

    for (const language of languages) {
      const [code] = parseSubtitleLanguageInput(language);
      if (!code || seen.has(code)) {
        continue;
      }
      seen.add(code);
      next.push(code);
    }

    actions.setPreferredSubtitleLanguages(next);
    savePreferredSubtitleLanguages(next);
    actions.setSubtitleLanguageInput('');
  };

  const addPreferredSubtitleLanguages = () => {
    addPreferredSubtitleLanguageCodes(parseSubtitleLanguageInput(ui.subtitleLanguageInput));
  };
  const removePreferredSubtitleLanguage = (language: string) => {
    const next = ui.selectedSubtitleLanguages.filter((selected) => selected !== language);
    actions.setPreferredSubtitleLanguages(next);
    savePreferredSubtitleLanguages(next);
  };

  const clearPreferredSubtitleLanguages = () => {
    actions.setPreferredSubtitleLanguages([]);
    savePreferredSubtitleLanguages([]);
  };

  const movePreferredSubtitleLanguage = (index: number, direction: -1 | 1) => {
    const current = ui.selectedSubtitleLanguages;
    const target = index + direction;
    if (target < 0 || target >= current.length) {
      return;
    }

    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    actions.setPreferredSubtitleLanguages(next);
    savePreferredSubtitleLanguages(next);
  };

  const handleRefresh = () => {
    void connectionQuery.refetch();
  };

  const handleReconnect = async () => {
    if (!profiles()?.activeProfileKey) {
      showToast('error', t().settings.toastNoActiveSavedService);
      return;
    }

    actions.beginReconnect();
    try {
      if (await reconnectMutation.mutateAsync()) {
        clearLibraryQueries();
        showToast('success', t().settings.toastReconnectedToSavedService);
        void connectionQuery.refetch();
        void profilesQuery.refetch();
      } else {
        showToast('error', t().settings.toastReconnectFailed);
        void profilesQuery.refetch();
      }
    } finally {
      actions.finishReconnect();
    }
  };

  const handleResetShortcuts = () => {
    form.setFieldValue('keybindNext', 'Shift+>');
    form.setFieldValue('keybindPrev', 'Shift+<');
    if (capabilities()?.introSkipper ?? true) {
      form.setFieldValue('keybindIntroSkip', 'g');
    }
    saveTextSetting('keybindNext', 'Shift+>');
    saveTextSetting('keybindPrev', 'Shift+<');
    if (capabilities()?.introSkipper ?? true) {
      saveTextSetting('keybindIntroSkip', 'g');
    }
    showToast('success', t().settings.shortcutResetSuccess);
  };

  const handleDisconnect = async () => {
    actions.beginDisconnect();
    const exit = await disconnectMutation.mutateAsync();
    if (Exit.isSuccess(exit)) {
      clearLibraryQueries();
      showToast('success', t().settings.toastDisconnected);
      void connectionQuery.refetch();
    } else {
      showToast('error', commandFailureMessage(exit.cause, t().settings.toastDisconnectFailed));
    }
    actions.finishDisconnect();
  };

  const handleActivateProfile = async (key: string) => {
    setActivatingProfileKey(key);
    try {
      const exit = await activateProfileMutation.mutateAsync(key);
      if (Exit.isSuccess(exit)) {
        clearLibraryQueries();
        showToast('success', t().settings.toastServiceSwitched);
        void connectionQuery.refetch();
        void profilesQuery.refetch();
        return;
      }

      const failure = commandFailure(exit.cause);
      if (Option.isSome(failure) && failure.value.code === 'authFailed') {
        await profilesQuery.refetch();
        const profile = profiles()?.profiles.find((candidate) => candidate.key === key);
        if (profile) {
          openServiceDialog({ kind: 'reauthenticate', profile });
        } else {
          showToast('error', t().settings.toastServiceUnavailable);
        }
        return;
      }

      showToast('error', commandFailureMessage(exit.cause, t().settings.toastSwitchFailed));
      void profilesQuery.refetch();
    } finally {
      setActivatingProfileKey(null);
    }
  };

  const handleReauthenticateProfile = async (key: string) => {
    let profile = profiles()?.profiles.find((candidate) => candidate.key === key);
    if (!profile) {
      await profilesQuery.refetch();
      profile = profiles()?.profiles.find((candidate) => candidate.key === key);
    }
    if (profile) {
      openServiceDialog({ kind: 'reauthenticate', profile });
    } else {
      showToast('error', t().settings.toastServiceUnavailable);
    }
  };

  const handleRemoveProfile = async (key: string) => {
    setRemovingProfileKey(key);
    try {
      const exit = await removeProfileMutation.mutateAsync(key);
      if (Exit.isSuccess(exit)) {
        if (profiles()?.activeProfileKey === key) {
          clearLibraryQueries();
        }
        void connectionQuery.refetch();
        void profilesQuery.refetch();
        showToast('success', t().settings.toastServiceRemoved);
      } else {
        showToast('error', commandFailureMessage(exit.cause, t().settings.toastRemoveFailed));
      }
    } finally {
      setRemovingProfileKey(null);
    }
  };

  const handleAddServiceConnected = () => {
    clearLibraryQueries();
    closeServiceDialog();
    showToast('success', t().settings.toastServiceAdded);
    void connectionQuery.refetch();
    void profilesQuery.refetch();
  };

  const handleReauthenticated = () => {
    clearLibraryQueries();
    closeServiceDialog();
    showToast('success', t().settings.toastSignedIn);
    void connectionQuery.refetch();
    void profilesQuery.refetch();
  };

  const handleDetectMpv = async () => {
    actions.beginMpvDetection();
    const exit = await detectMpvMutation.mutateAsync();
    if (Exit.isSuccess(exit)) {
      Option.match(exit.value, {
        onNone: () => showToast('warning', t().settings.toastMpvNotFound),
        onSome: (path) => {
          form.setFieldValue('mpvPath', path);
          queueConfigSave(buildConfigSnapshot({ mpvPath: path }));
          showToast('success', t().settings.toastMpvDetected);
        },
      });
    } else {
      console.error(
        'Failed to detect MPV:',
        commandFailureMessage(exit.cause, t().settings.toastMpvDetectFailed),
      );
      showToast('error', t().settings.toastMpvDetectFailed);
    }
    actions.finishMpvDetection();
  };

  const handleIntroSkipperModeChange = (mode: IntroSkipperMode) => {
    form.setFieldValue('introSkipperMode', mode);
    saveIntroSkipperSetting(mode);
  };

  return (
    <Provider>
      <div class={styles.settingsLayout}>
        <nav class={styles.settingsNav}>
          <For each={mediaNavItems}>
            {(item) => (
              <button
                type="button"
                class={styles.settingsNavItem}
                classList={{ [styles.settingsNavItemActive]: activeSection() === item.id }}
                onClick={() => scrollToSection(item.id)}
              >
                <item.Icon size={16} style={{ 'flex-shrink': '0' }} />
                <span
                  style={{
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  }}
                >
                  {item.label()}
                </span>
              </button>
            )}
          </For>
          <For each={visiblePlaybackNavItems()}>
            {(item) => (
              <button
                type="button"
                class={styles.settingsNavItem}
                classList={{ [styles.settingsNavItemActive]: activeSection() === item.id }}
                onClick={() => scrollToSection(item.id)}
              >
                <item.Icon size={16} style={{ 'flex-shrink': '0' }} />
                <span
                  style={{
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  }}
                >
                  {item.label()}
                </span>
              </button>
            )}
          </For>
        </nav>

        <div class={styles.settingsContent} ref={contentRef}>
          <div class={styles.settingsSection} data-section="language">
            <LanguageCard
              t={t()}
              current={supportedLocale()}
              options={languageOptions}
              onSelect={setLocale}
            />
          </div>

          <div class={styles.settingsSection} data-section="system">
            <SystemCard
              t={t()}
              startMinimized={config()?.startMinimized ?? false}
              onStartMinimizedChange={saveStartMinimizedSetting}
            />
          </div>

          <div class={styles.settingsSection} data-section="saved-services">
            <SavedServicesCard
              t={t()}
              profiles={profiles()}
              activatingProfileKey={activatingProfileKey()}
              removingProfileKey={removingProfileKey()}
              onAddService={() => openServiceDialog({ kind: 'add' })}
              onActivateProfile={handleActivateProfile}
              onReauthenticateProfile={handleReauthenticateProfile}
              onRemoveProfile={handleRemoveProfile}
            />
          </div>

          <div class={styles.settingsSection} data-section="connection">
            <ConnectionCard
              t={t()}
              state={state()}
              canReconnect={Boolean(profiles()?.activeProfileKey)}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              onRefresh={handleRefresh}
            />
          </div>

          <div class={styles.settingsSection} data-section="player">
            <form
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <PlayerBridgeSettingsCard
                t={t()}
                form={form}
                subtitleLanguageSelectItems={subtitleLanguageSelectItems}
                onSaveTextSetting={(field, value) => {
                  if (field === 'deviceName' || field === 'mpvPath') {
                    saveTextSetting(field, value);
                  }
                }}
                onDetectMpv={handleDetectMpv}
                onAddSubtitleLanguageCodes={addPreferredSubtitleLanguageCodes}
                onAddSubtitleLanguages={addPreferredSubtitleLanguages}
                onRemoveSubtitleLanguage={removePreferredSubtitleLanguage}
                onClearSubtitleLanguages={clearPreferredSubtitleLanguages}
                onMoveSubtitleLanguage={movePreferredSubtitleLanguage}
              />
            </form>
          </div>

          <Show when={capabilities()?.introSkipper ?? true}>
            <div class={styles.settingsSection} data-section="intro-skip">
              <IntroSkipCard
                t={t()}
                currentMode={introSkipperMode()}
                onModeChange={handleIntroSkipperModeChange}
              />
            </div>
          </Show>

          <div class={styles.settingsSection} data-section="shortcuts">
            <ShortcutKeysCard
              t={t()}
              form={form}
              showIntroSkipKey={capabilities()?.introSkipper ?? true}
              onSaveTextSetting={saveTextSetting}
              onResetDefaults={handleResetShortcuts}
            />
          </div>

          <div class={styles.settingsSection} data-section="diagnostics">
            <DiagnosticsCard t={t()} />
          </div>

          <PageFooter />
        </div>
      </div>
      <div ref={setAddServicePortalMount} />
      <Dialog.Root
        open={serviceDialogOpen()}
        onOpenChange={(details) => setServiceDialogOpen(details.open)}
        lazyMount
        unmountOnExit
      >
        <Portal mount={addServicePortalMount()}>
          <Dialog.Backdrop class={recipes.scrim({ tone: 'dark', z: '60' })} />
          <Dialog.Positioner class={styles.positioner}>
            <Dialog.Content class={styles.content}>
              <Show when={serviceDialog()} keyed>
                {(dialog) => (
                  <>
                    {dialog.kind === 'reauthenticate' ? (
                      <>
                        <Dialog.Title class={recipes.srOnly}>Sign in again</Dialog.Title>
                        <Dialog.Description class={recipes.srOnly}>
                          Sign in again to switch to this saved service.
                        </Dialog.Description>
                      </>
                    ) : (
                      <>
                        <Dialog.Title class={recipes.srOnly}>Add saved service</Dialog.Title>
                        <Dialog.Description class={recipes.srOnly}>
                          Log in to a Jellyfin or Emby service and save it for switching.
                        </Dialog.Description>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="icon"
                      class={styles.closeButton}
                      aria-label={
                        dialog.kind === 'reauthenticate'
                          ? 'Close sign in again'
                          : 'Close add service'
                      }
                      title={
                        dialog.kind === 'reauthenticate'
                          ? 'Close sign in again'
                          : 'Close add service'
                      }
                      onClick={closeServiceDialog}
                    >
                      <X class={styles.icon4_5} />
                    </Button>
                    {dialog.kind === 'reauthenticate' ? (
                      <LoginPage
                        embedded
                        reauthenticateProfile={dialog.profile}
                        onConnected={handleReauthenticated}
                      />
                    ) : (
                      <LoginPage embedded onConnected={handleAddServiceConnected} />
                    )}
                  </>
                )}
              </Show>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Provider>
  );
}
