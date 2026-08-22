import { Checkbox } from '@ark-ui/solid/checkbox';
import { listen } from '@tauri-apps/api/event';
import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { Translations } from '~i18n';
import * as recipes from '~styles/recipes';

import * as styles from './DiagnosticsPanel.styles';
import { Button } from './ui';

interface BackendLogEntry {
  level: number;
  message: string;
}

interface DiagnosticsPanelProps {
  t?: Translations;
  compact?: boolean;
}

const MAX_DIAGNOSTICS = 500;

const LOG_LEVEL: Record<number, string> = {
  1: 'TRACE',
  2: 'DEBUG',
  3: 'INFO ',
  4: 'WARN ',
  5: 'ERROR',
};

const SENSITIVE_QUERY_PARAM =
  /([?&](?:api_key|access_token|token|password|auth|authorization)=)[^&\s]+/gi;
const BEARER_TOKEN = /(bearer\s+)[^\s]+/gi;

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(date);
}

function sanitize(message: string) {
  return message
    .replace(SENSITIVE_QUERY_PARAM, '$1[REDACTED]')
    .replace(BEARER_TOKEN, '$1[REDACTED]');
}

export default function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  const s = () => props.t?.settings;
  const [lines, setLines] = createSignal<string[]>([]);
  const [autoScroll, setAutoScroll] = createSignal(true);
  const [copyStatus, setCopyStatus] = createSignal<'idle' | 'copied' | 'failed'>('idle');
  let boxRef: HTMLTextAreaElement | undefined;

  onMount(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    listen<BackendLogEntry>('log://log', (event) => {
      const payload = event.payload;
      const level = LOG_LEVEL[payload.level] ?? '     ';
      const time = formatTime(new Date());
      const msg = sanitize(payload.message);
      setLines((prev) => [...prev, `${time}  ${level}  ${msg}`].slice(-MAX_DIAGNOSTICS));
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      cleanup = unlisten;
    });

    onCleanup(() => {
      disposed = true;
      cleanup?.();
    });
  });

  createEffect(() => {
    if (autoScroll() && boxRef) {
      lines();
      boxRef.scrollTop = boxRef.scrollHeight;
    }
  });

  const clearDiagnostics = () => {
    setLines([]);
    setCopyStatus('idle');
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(lines().join('\n'));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const logText = () => lines().join('\n');

  return (
    <div class={styles.root}>
      <div class={styles.header}>
        <p class={styles.count}>
          {lines().length === 0
            ? (s()?.sanitizedRuntimeEventsNone ?? '暂无已清理的运行时事件')
            : `${lines().length} ${s()?.sanitizedRuntimeEvents ?? 'sanitized runtime events'}`}
        </p>
        <Show when={!props.compact}>
          <Checkbox.Root
            checked={autoScroll()}
            onCheckedChange={(details) => setAutoScroll(details.checked === true)}
            class={styles.checkboxRoot}
          >
            <Checkbox.Control class={recipes.checkboxBox}>
              <Checkbox.Indicator class={recipes.checkboxIndicator}>✓</Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Label class={styles.checkboxLabel}>
              {s()?.autoScroll ?? 'Auto-scroll'}
            </Checkbox.Label>
            <Checkbox.HiddenInput />
          </Checkbox.Root>
        </Show>
      </div>

      <textarea
        ref={boxRef}
        class={styles.logBox({ size: props.compact ? 'compact' : 'expanded' })}
        value={logText()}
        readOnly
        aria-label={s()?.diagnosticLogOutput ?? 'Diagnostic log output'}
      />

      <div class={styles.actions}>
        <Show when={copyStatus() !== 'idle'}>
          <span
            role="status"
            aria-live="polite"
            class={styles.status({ tone: copyStatus() === 'copied' ? 'copied' : 'failed' })}
          >
            {copyStatus() === 'copied'
              ? (s()?.copied ?? 'Copied')
              : (s()?.copyFailed ?? 'Copy failed')}
          </span>
        </Show>
        <Button
          type="button"
          onClick={copyDiagnostics}
          disabled={lines().length === 0}
          variant="secondary"
          class={styles.actionButton}
        >
          {s()?.copyDiagnostics ?? 'Copy diagnostics'}
        </Button>
        <Button
          type="button"
          onClick={clearDiagnostics}
          variant="danger"
          class={styles.actionButton}
        >
          {s()?.clearDiagnostics ?? 'Clear'}
        </Button>
      </div>
    </div>
  );
}
