import { Checkbox } from '@ark-ui/solid/checkbox';
import { Field as ArkField } from '@ark-ui/solid/field';
import { Tabs } from '@ark-ui/solid/tabs';
import { cx } from '@styled-system/css';
import { createForm } from '@tanstack/solid-form';
import { Effect, Exit, Fiber, Match } from 'effect';
import { Check, CircleAlert, LoaderCircle, Play, RadioTower, Settings, X } from 'lucide-solid';
import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import * as recipes from '~styles/recipes';

import type { Credentials, MediaServerProvider, SavedServiceProfileSummary } from '../bindings';
import { commandFailureMessage } from '../effects/commands';
import { connectJellyfin } from '../effects/connection';
import { CommandError } from '../effects/errors';
import { reauthenticateSavedServiceProfileWithPassword } from '../effects/profiles';
import {
  runQuickConnectWorkflow,
  runSavedProfileQuickConnectWorkflow,
} from '../effects/quickConnect';
import { clearSavedCredentials, loadSavedCredentials, saveCredentials } from '../effects/session';
import { useI18n } from '../i18n';
import { capabilitiesForProvider } from '../providerCapabilities';
import {
  buildServerUrlEffect,
  defaultSchemeForHost,
  explicitSchemeFromInput,
  parseServerUrl,
  stripServerScheme,
} from '../serverUrl';
import type { ServerScheme, ServerUrlResult } from '../serverUrl';
import { saveCurrentSession } from '../sessionAccess';
import * as styles from './LoginPage.styles';
import { Button, ConsoleShell, FieldControl, PageFooter } from './ui';

interface LoginPageProps {
  onConnected: () => void;
  embedded?: boolean;
  reauthenticateProfile?: SavedServiceProfileSummary;
}
type LoginMethod = 'quickConnect' | 'password';
type QuickConnectState = 'idle' | 'waiting' | 'failed';

interface LoginValues {
  provider: MediaServerProvider;
  scheme: ServerScheme;
  host: string;
  username: string;
  password: string;
  rememberMe: boolean;
}

type ServerUrlValidation =
  | { status: 'ok'; result: ServerUrlResult }
  | { status: 'error'; message: string };

export default function LoginPage(props: LoginPageProps) {
  const { t, setLocale, supportedLocale } = useI18n();
  const l = () => t().login;
  const [langPopupOpen, setLangPopupOpen] = createSignal(false);

  const languageOptions: { value: 'auto' | 'en' | 'zh'; label: string }[] = [
    { value: 'auto', label: 'Auto / 自动' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '简体中文' },
  ];
  const [loginMethod, setLoginMethod] = createSignal<LoginMethod>(
    props.reauthenticateProfile &&
      !capabilitiesForProvider(props.reauthenticateProfile.provider).quickConnect
      ? 'password'
      : 'quickConnect',
  );
  const [quickConnectState, setQuickConnectState] = createSignal<QuickConnectState>('idle');
  const [quickConnectCode, setQuickConnectCode] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  let quickConnectFiber: Fiber.Fiber<unknown, CommandError> | undefined;

  const reauthProfile = () => props.reauthenticateProfile;
  const isReauthMode = () => reauthProfile() !== undefined;

  const providerLabel = Match.type<MediaServerProvider>().pipe(
    Match.withReturnType<string>(),
    Match.when('jellyfin', () => 'Jellyfin'),
    Match.when('emby', () => 'Emby'),
    Match.exhaustive,
  );

  const form = createForm(() => ({
    defaultValues: {
      host: '',
      password: '',
      provider: 'jellyfin' as MediaServerProvider,
      rememberMe: false,
      scheme: 'https' as ServerScheme,
      username: '',
    },
    onSubmit: async ({ value }) => {
      if (isReauthMode()) {
        if (loginMethod() === 'quickConnect') {
          await startReauthQuickConnect();
        } else {
          await reauthenticateWithPassword(value);
        }
        return;
      }
      if (loginMethod() === 'quickConnect') {
        await startQuickConnect(value);
      } else {
        await connectWithPassword(value);
      }
    },
  }));
  const formValues = form.useStore((state) => state.values);

  const isQuickConnectWaiting = () => quickConnectState() === 'waiting';
  const selectedCapabilities = () =>
    capabilitiesForProvider(reauthProfile()?.provider ?? formValues().provider);
  const submitButtonLabel = () => {
    if (loginMethod() !== 'quickConnect') {
      return isReauthMode() ? l().signInAndSwitch : l().connect;
    }
    return quickConnectState() === 'failed' ? l().requestNewCode : l().requestCode;
  };
  const submittingButtonLabel = () =>
    loginMethod() === 'quickConnect'
      ? l().requesting
      : isReauthMode()
        ? l().signingIn
        : l().connecting;

  const validateServerUrl = (value: Pick<LoginValues, 'scheme' | 'host'>): ServerUrlValidation =>
    Effect.runSync(
      buildServerUrlEffect({
        host: value.host,
        scheme: value.scheme,
      }).pipe(
        Effect.match({
          onFailure: (err) => ({ message: err.message, status: 'error' }),
          onSuccess: (result) => ({ result, status: 'ok' }),
        }),
      ),
    );

  const serverUrlResult = () => {
    const validation = validateServerUrl({
      host: formValues().host,
      scheme: formValues().scheme,
    });
    return validation.status === 'ok' ? validation.result : null;
  };

  const serverUrl = () => serverUrlResult()?.url ?? '';

  const resetQuickConnect = () => {
    if (quickConnectFiber) {
      void Effect.runPromise(Fiber.interrupt(quickConnectFiber));
      quickConnectFiber = undefined;
    }
    setQuickConnectState('idle');
    setQuickConnectCode(null);
    setError(null);
    setSubmitting(false);
  };

  const finishConnected = async () => {
    await saveCurrentSession();
    props.onConnected();
  };

  const finishReauthenticated = () => {
    props.onConnected();
  };

  const startQuickConnect = async (value: LoginValues) => {
    setError(null);
    const validation = validateServerUrl(value);
    if (validation.status === 'error') {
      setError(validation.message);
      return;
    }
    setSubmitting(true);
    const serverUrlValue = validation.result.url;
    if (quickConnectFiber) {
      await Effect.runPromise(Fiber.interrupt(quickConnectFiber));
    }
    const fiber = Effect.runFork(
      runQuickConnectWorkflow(serverUrlValue, (code) => {
        setQuickConnectCode(code);
        setQuickConnectState('waiting');
        setSubmitting(false);
      }),
    );
    quickConnectFiber = fiber;
    const exit = await Effect.runPromiseExit(Fiber.join(fiber));
    if (quickConnectFiber !== fiber) return;
    quickConnectFiber = undefined;
    setSubmitting(false);
    if (Exit.isSuccess(exit)) {
      props.onConnected();
    } else {
      setQuickConnectState('failed');
      setError(commandFailureMessage(exit.cause, l().quickConnectFailed));
    }
  };

  const startReauthQuickConnect = async () => {
    const profile = reauthProfile();
    if (!profile) return;
    setError(null);
    setSubmitting(true);
    if (quickConnectFiber) {
      await Effect.runPromise(Fiber.interrupt(quickConnectFiber));
    }
    const fiber = Effect.runFork(
      runSavedProfileQuickConnectWorkflow(profile.key, (code) => {
        setQuickConnectCode(code);
        setQuickConnectState('waiting');
        setSubmitting(false);
      }),
    );
    quickConnectFiber = fiber;
    const exit = await Effect.runPromiseExit(Fiber.join(fiber));
    if (quickConnectFiber !== fiber) return;
    quickConnectFiber = undefined;
    setSubmitting(false);
    if (Exit.isSuccess(exit)) {
      finishReauthenticated();
    } else {
      setQuickConnectState('failed');
      setError(commandFailureMessage(exit.cause, l().quickConnectFailed));
    }
  };

  const connectWithPassword = async (value: LoginValues) => {
    setError(null);
    const validation = validateServerUrl(value);
    if (validation.status === 'error') {
      setError(validation.message);
      return;
    }
    if (!value.username.trim()) {
      setError(l().usernameRequired);
      return;
    }
    const finalServerUrl = validation.result.url;
    const credentials: Credentials = {
      password: value.password,
      provider: value.provider,
      serverUrl: finalServerUrl,
      username: value.username,
    };
    setSubmitting(true);
    const exit = await Effect.runPromiseExit(connectJellyfin(credentials));
    if (Exit.isSuccess(exit)) {
      const completion = await Effect.runPromiseExit(
        Effect.tryPromise({
          catch: (error) =>
            new CommandError({
              message: error instanceof Error ? error.message : 'Connection failed',
            }),
          try: async () => {
            if (value.rememberMe)
              Effect.runSync(saveCredentials(finalServerUrl, value.username, value.provider));
            else Effect.runSync(clearSavedCredentials);
            await finishConnected();
          },
        }),
      );
      if (Exit.isFailure(completion)) {
        setSubmitting(false);
        setError(commandFailureMessage(completion.cause, l().connectionFailed));
      }
      return;
    }
    setSubmitting(false);
    setError(commandFailureMessage(exit.cause, l().connectionFailed));
  };

  const reauthenticateWithPassword = async (value: LoginValues) => {
    const profile = reauthProfile();
    if (!profile) return;
    setError(null);
    setSubmitting(true);
    const exit = await Effect.runPromiseExit(
      reauthenticateSavedServiceProfileWithPassword(profile.key, value.password),
    );
    setSubmitting(false);
    if (Exit.isSuccess(exit)) {
      finishReauthenticated();
    } else {
      setError(commandFailureMessage(exit.cause, l().signInFailed));
    }
  };

  const submit = () => {
    void form.handleSubmit();
  };

  createEffect(() => {
    if (!selectedCapabilities().quickConnect && loginMethod() === 'quickConnect') {
      resetQuickConnect();
      setLoginMethod('password');
    }
  });

  onMount(() => {
    if (isReauthMode()) return;
    const exit = Effect.runSyncExit(loadSavedCredentials);
    if (!Exit.isSuccess(exit)) return;
    const saved = exit.value;
    const parsed = parseServerUrl(saved.serverUrl);
    form.reset({
      host: parsed.host,
      password: '',
      provider: saved.provider,
      rememberMe: saved.rememberMe,
      scheme: parsed.scheme,
      username: saved.username,
    });
  });

  onCleanup(() => {
    if (quickConnectFiber) {
      void Effect.runPromise(Fiber.interrupt(quickConnectFiber));
      quickConnectFiber = undefined;
    }
  });

  const loginForm = () => (
    <div class={styles.card({ embedded: props.embedded })}>
      <div class={props.embedded ? styles.cardHeaderEmbedded : styles.cardHeader}>
        <h2 class={styles.cardTitle}>
          {isReauthMode() ? l().signInAgainTitle : l().serverCoordinates}
        </h2>
      </div>
      <div class={props.embedded ? styles.cardBodyEmbedded : styles.cardBody}>
        <Show when={isReauthMode()}>
          <div class={styles.reauthRows}>
            <div class={styles.reauthRow}>
              <span class={styles.reauthDot} />
              <span class={styles.reauthKey}>{l().service}</span>
              <span class={styles.reauthValue}>{providerLabel(reauthProfile()!.provider)}</span>
            </div>
            <div class={styles.reauthRow}>
              <span class={styles.reauthDot} />
              <span class={styles.reauthKey}>{l().serverUrlPreview}</span>
              <span class={styles.reauthValue}>
                {reauthProfile()!.serverName ?? reauthProfile()!.serverUrl}
              </span>
            </div>
            <div class={styles.reauthRow}>
              <span class={styles.reauthDot} />
              <span class={styles.reauthKey}>{l().account}</span>
              <span class={styles.reauthValue}>{reauthProfile()!.userName}</span>
            </div>
          </div>
        </Show>

        <Show when={!isReauthMode()}>
          {/* Protocol toggle */}
          <form.Field name="scheme">
            {(field) => (
              <fieldset class={styles.segmented({ columns: 2 })} aria-label={l().serverProtocol}>
                <button
                  type="button"
                  aria-pressed={field().state.value === 'https'}
                  class={styles.segment({ selected: field().state.value === 'https' })}
                  disabled={isQuickConnectWaiting()}
                  onClick={() => field().handleChange('https')}
                >
                  HTTPS
                </button>
                <button
                  type="button"
                  aria-pressed={field().state.value === 'http'}
                  class={styles.segment({ selected: field().state.value === 'http' })}
                  disabled={isQuickConnectWaiting()}
                  onClick={() => field().handleChange('http')}
                >
                  HTTP
                </button>
              </fieldset>
            )}
          </form.Field>

          {/* Host input */}
          <form.Field name="host">
            {(field) => (
              <ArkField.Root class={styles.fieldBlock} disabled={isQuickConnectWaiting()}>
                <ArkField.Label class={styles.fieldLabel}>{l().serverUrlPreview}</ArkField.Label>
                <ArkField.Input
                  asChild={(fieldProps) => (
                    <FieldControl
                      {...fieldProps()}
                      variant="filled"
                      type="text"
                      value={field().state.value}
                      onInput={(event) => {
                        const { value } = event.currentTarget;
                        const explicitScheme = explicitSchemeFromInput(value);
                        const strippedHost = stripServerScheme(value);
                        field().handleChange(strippedHost);
                        form.setFieldValue('scheme', explicitScheme ?? defaultSchemeForHost(value));
                      }}
                      class={styles.fullWidth}
                      placeholder={l().hostPlaceholder}
                    />
                  )}
                />
              </ArkField.Root>
            )}
          </form.Field>

          {/* Server URL preview */}
          <div class={styles.preview}>
            <span class={styles.previewDot} />
            <Show
              when={serverUrl()}
              fallback={<span class={styles.previewEmpty}>{l().serverUrlPreviewPlaceholder}</span>}
            >
              <span class={styles.previewValue}>{serverUrl()}</span>
            </Show>
          </div>

          {/* Media server */}
          <div>
            <p class={styles.fieldLabel}>{l().mediaServer}</p>
            <div class={styles.providerGrid}>
              <button
                type="button"
                class={styles.providerBtn({ selected: formValues().provider === 'jellyfin' })}
                disabled={isQuickConnectWaiting()}
                onClick={() => form.setFieldValue('provider', 'jellyfin')}
              >
                Jellyfin
              </button>
              <button
                type="button"
                class={styles.providerBtn({ selected: formValues().provider === 'emby' })}
                disabled={isQuickConnectWaiting()}
                onClick={() => form.setFieldValue('provider', 'emby')}
              >
                Emby
              </button>
            </div>
          </div>
        </Show>

        {/* Tabs */}
        <Show when={selectedCapabilities().quickConnect || loginMethod() === 'password'}>
          <Tabs.Root
            value={loginMethod()}
            activationMode="manual"
            lazyMount
            unmountOnExit
            onValueChange={(details) => {
              const value = details.value as LoginMethod;
              if (value !== 'quickConnect' && value !== 'password') return;
              resetQuickConnect();
              setLoginMethod(value);
            }}
          >
            <Tabs.List class={styles.tabsList} aria-label="Login Method">
              <Show when={selectedCapabilities().quickConnect}>
                <Tabs.Trigger
                  value="quickConnect"
                  disabled={isQuickConnectWaiting()}
                  class={styles.tabTrigger({ selected: loginMethod() === 'quickConnect' })}
                >
                  {l().quickConnect}
                </Tabs.Trigger>
              </Show>
              <Tabs.Trigger
                value="password"
                disabled={isQuickConnectWaiting()}
                class={styles.tabTrigger({ selected: loginMethod() === 'password' })}
              >
                {l().password}
              </Tabs.Trigger>
            </Tabs.List>

            <Show when={selectedCapabilities().quickConnect}>
              <Tabs.Content value="quickConnect">
                <div class={styles.quickPanel}>
                  <div class={styles.radar}>
                    <RadioTower
                      class={styles.radarIcon}
                      classList={{ [styles.radarPulse]: isQuickConnectWaiting() }}
                    />
                  </div>
                  <p class={styles.quickText}>{l().quickConnectDesc}</p>
                  <p class={styles.quickHint}>{l().quickConnectHint}</p>
                  <Show when={quickConnectCode()}>
                    <div class={styles.codeBox}>
                      <span class={styles.codeLabel}>{l().verificationCode}</span>
                      <span class={styles.codeValue}>{quickConnectCode()}</span>
                    </div>
                  </Show>
                  <Show when={isQuickConnectWaiting()}>
                    <div class={styles.awaitingRow}>
                      <span class={styles.awaitingDot} />
                      {l().awaitingApproval}
                    </div>
                  </Show>
                </div>
              </Tabs.Content>
            </Show>

            <Tabs.Content value="password">
              <div class={styles.stack4}>
                <Show when={!isReauthMode()}>
                  <form.Field name="username">
                    {(field) => (
                      <ArkField.Root class={styles.fieldBlock}>
                        <ArkField.Label class={styles.fieldLabel}>{l().username}</ArkField.Label>
                        <ArkField.Input
                          asChild={(fieldProps) => (
                            <FieldControl
                              {...fieldProps()}
                              variant="filled"
                              autocomplete="username"
                              value={field().state.value}
                              onInput={(event) => field().handleChange(event.currentTarget.value)}
                              class={styles.fullWidth}
                              placeholder={l().usernamePlaceholder}
                            />
                          )}
                        />
                      </ArkField.Root>
                    )}
                  </form.Field>
                </Show>
                <form.Field name="password">
                  {(field) => (
                    <ArkField.Root class={styles.fieldBlock}>
                      <ArkField.Label class={styles.fieldLabel}>{l().passwordLabel}</ArkField.Label>
                      <ArkField.Input
                        asChild={(fieldProps) => (
                          <FieldControl
                            {...fieldProps()}
                            variant="filled"
                            type="password"
                            value={field().state.value}
                            onInput={(event) => field().handleChange(event.currentTarget.value)}
                            class={styles.fullWidth}
                            placeholder={l().passwordPlaceholder}
                          />
                        )}
                      />
                    </ArkField.Root>
                  )}
                </form.Field>
                <Show when={!isReauthMode()}>
                  <form.Field name="rememberMe">
                    {(field) => (
                      <Checkbox.Root
                        checked={field().state.value}
                        onCheckedChange={(details) =>
                          field().handleChange(details.checked === true)
                        }
                        class={styles.remember}
                      >
                        <Checkbox.Control class={recipes.checkboxBox}>
                          <Checkbox.Indicator class={recipes.checkboxIndicator}>
                            <Check class={styles.icon3_5} stroke-width={4} />
                          </Checkbox.Indicator>
                        </Checkbox.Control>
                        <Checkbox.Label class={styles.checkboxLabel}>
                          {l().rememberMe}
                        </Checkbox.Label>
                        <Checkbox.HiddenInput />
                      </Checkbox.Root>
                    )}
                  </form.Field>
                </Show>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Show>

        {/* Error alert */}
        <Show when={error()}>
          <div class={styles.alert} role="alert">
            <CircleAlert class={styles.alertIcon} />
            <div>
              <p class={styles.alertTitle}>{l().connectionAttention}</p>
              <p class={styles.alertMessage}>{error()}</p>
            </div>
          </div>
        </Show>

        {/* Submit */}
        <Show when={isQuickConnectWaiting()}>
          <Button
            type="button"
            variant="secondary"
            class={styles.fullWidth}
            onClick={resetQuickConnect}
          >
            {l().cancelRequest}
          </Button>
        </Show>
        <Show when={!isQuickConnectWaiting()}>
          <Button
            type="button"
            disabled={submitting()}
            variant="primary"
            class={styles.fullWidth}
            onClick={submit}
          >
            <Show when={submitting()}>
              <LoaderCircle class={cx(styles.icon5, styles.spinner)} />
            </Show>
            {submitting() ? submittingButtonLabel() : submitButtonLabel()}
          </Button>
        </Show>
      </div>
    </div>
  );

  if (props.embedded) {
    return loginForm();
  }

  return (
    <ConsoleShell class={styles.shell}>
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
        <button
          type="button"
          class={styles.settingsButton}
          aria-label={t().home.openSettings}
          onClick={() => setLangPopupOpen(true)}
        >
          <Settings class={styles.settingsIcon} />
        </button>
      </header>

      <main class={styles.content}>{loginForm()}</main>

      <PageFooter class={styles.footer} />

      <Show when={langPopupOpen()}>
        <Portal>
          <div
            class={styles.langBackdrop}
            role="presentation"
            onClick={() => setLangPopupOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setLangPopupOpen(false);
            }}
          />
          <div class={styles.langPopup}>
            <div class={styles.langPopupHeader}>
              <span class={styles.langPopupTitle}>{l().language ?? t().settings.language}</span>
              <button
                type="button"
                class={styles.langPopupClose}
                aria-label="Close"
                onClick={() => setLangPopupOpen(false)}
              >
                <X class={styles.langPopupCloseIcon} />
              </button>
            </div>
            <div class={styles.langPopupBody}>
              <div class={styles.langPopupOptions}>
                {languageOptions.map((opt) => (
                  <button
                    type="button"
                    class={styles.langPopupOption}
                    classList={{ [styles.langPopupOptionActive]: supportedLocale() === opt.value }}
                    onClick={() => {
                      setLocale(opt.value);
                      setLangPopupOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </ConsoleShell>
  );
}
