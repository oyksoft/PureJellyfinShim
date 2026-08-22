import { Field as ArkField } from '@ark-ui/solid/field';
import { Keyboard, X } from 'lucide-solid';
import { Show, createSignal, onCleanup } from 'solid-js';

import { useI18n } from '../../i18n';
import { Button } from '../ui';
import * as shared from './shared.styles';
import * as styles from './ShortcutKeyInput.styles';

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const;

type ModifierKey = (typeof MODIFIER_ORDER)[number];

interface ShortcutKeyInputProps {
  name: string;
  label: string;
  value: string;
  invalid?: boolean;
  onCommit: (value: string) => void;
  onCancel?: () => void;
}

function parseShortcut(combo: string): ModifierKey[] {
  const parts = combo
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const mods: ModifierKey[] = [];
  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') mods.push('ctrl');
    else if (part === 'alt') mods.push('alt');
    else if (part === 'shift') mods.push('shift');
    else if (part === 'meta' || part === 'cmd' || part === 'super') mods.push('meta');
  }
  return mods.filter((m, i) => MODIFIER_ORDER.indexOf(m) === i);
}

function extractMain(combo: string): string {
  const parts = combo
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const main = parts.find((p) => !/^(ctrl|control|alt|shift|meta|cmd|super)$/i.test(p));
  return main ?? '';
}

function formatKey(key: string): string {
  if (!key) return '';
  if (key === ' ') return 'Space';
  if (key.startsWith('Arrow')) return key.replace('Arrow', '');
  return key;
}

function eventToCombo(event: KeyboardEvent): string | null {
  const key = event.key;
  if (key === 'Escape') return null;
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null;

  const mods: ModifierKey[] = [];
  if (event.ctrlKey) mods.push('ctrl');
  if (event.altKey) mods.push('alt');
  if (event.shiftKey) mods.push('shift');
  if (event.metaKey) mods.push('meta');

  const sortedMods = MODIFIER_ORDER.filter((m) => mods.includes(m));
  return [...sortedMods, key].join('+');
}

export default function ShortcutKeyInput(props: ShortcutKeyInputProps) {
  const { t } = useI18n();
  const [recording, setRecording] = createSignal(false);
  const [pending, setPending] = createSignal<string | null>(null);

  const startRecord = () => {
    if (recording()) return;
    setRecording(true);
    setPending(null);
  };

  const cancelRecord = () => {
    setRecording(false);
    setPending(null);
  };

  const commitRecord = (combo: string) => {
    setRecording(false);
    setPending(null);
    props.onCommit(combo);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!recording()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRecord();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const combo = eventToCombo(event);
    if (!combo) return;
    const main = extractMain(combo);
    if (!main) {
      setPending(combo);
      return;
    }
    commitRecord(combo);
  };

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    handleKeyDown(event);
  };

  const beginCapture = () => {
    startRecord();
    window.addEventListener('keydown', handleWindowKeyDown, true);
    onCleanup(() => {
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    });
  };

  const displayValue = (): { mods: ModifierKey[]; main: string } => {
    const source = recording() && pending() !== null ? (pending() ?? '') : props.value;
    if (!source) return { mods: [], main: '' };
    const mods = parseShortcut(source);
    const main = extractMain(source);
    return { mods, main };
  };

  const isDisplayingPlaceholder = () => !displayValue().main && displayValue().mods.length === 0;

  return (
    <ArkField.Root class={styles.field} invalid={props.invalid}>
      <ArkField.Label class={shared.overline}>{props.label}</ArkField.Label>
      <div class={styles.row} data-recording={recording() ? '' : undefined} role="presentation">
        <div class={styles.valueArea}>
          <Show
            when={recording()}
            fallback={
              <>
                <Show
                  when={!isDisplayingPlaceholder()}
                  fallback={
                    <span class={styles.placeholder}>
                      <Keyboard class={styles.placeholderIcon} />
                      <span>{t().settings.shortcutClickToRecord}</span>
                    </span>
                  }
                >
                  {(() => {
                    const d = displayValue();
                    return (
                      <>
                        {d.mods.map((m) => (
                          <kbd class={styles.kbd}>{m === 'meta' ? 'Cmd' : m.toUpperCase()}</kbd>
                        ))}
                        {d.mods.length > 0 && <span class={styles.plus}>+</span>}
                        <kbd class={styles.kbd}>{formatKey(d.main)}</kbd>
                      </>
                    );
                  })()}
                </Show>
              </>
            }
          >
            <span class={styles.recordingText}>
              <Keyboard class={styles.recordingIcon} />
              <span>{t().settings.shortcutPressAnyKey}</span>
            </span>
          </Show>
        </div>
        <Show
          when={recording()}
          fallback={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                beginCapture();
              }}
            >
              {t().settings.shortcutRecord}
            </Button>
          }
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t().settings.shortcutCancel}
            onClick={(e) => {
              e.stopPropagation();
              cancelRecord();
            }}
          >
            <X class={styles.cancelIcon} />
          </Button>
        </Show>
      </div>
    </ArkField.Root>
  );
}
