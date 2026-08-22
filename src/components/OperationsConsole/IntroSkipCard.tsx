import { Bot } from 'lucide-solid';
import { For, Show } from 'solid-js';
import type { Translations } from '~i18n';

import type { IntroSkipperMode } from '../../bindings';
import { SectionCard } from '../ui';
import { INTRO_SKIPPER_MODES } from './introSkipperModes';
import * as styles from './shared.styles';
import { useOperationsConsoleStore } from './store';

interface IntroSkipCardProps {
  t: Translations;
  currentMode: IntroSkipperMode;
  onModeChange: (mode: IntroSkipperMode) => void;
}

export default function IntroSkipCard(props: IntroSkipCardProps) {
  const s = () => props.t.settings;
  const [ui] = useOperationsConsoleStore();

  return (
    <SectionCard icon={<Bot class={styles.sectionIcon.secondary} />} title={s().introSkip}>
      <div class={styles.stack4}>
        <fieldset class={styles.fieldset} aria-label={s().introSkipMode}>
          <For each={INTRO_SKIPPER_MODES(props.t)}>
            {(option) => (
              <button
                type="button"
                class={styles.choice}
                aria-pressed={props.currentMode === option.mode}
                onClick={() => props.onModeChange(option.mode)}
              >
                <span class={styles.choiceTitle}>{option.label}</span>
                <span class={styles.choiceDescription}>{option.description}</span>
              </button>
            )}
          </For>
        </fieldset>
        <Show when={ui.introSkipperSaving}>
          <p class={styles.saving}>
            <span class={styles.pingDot} />
            {s().savingPreference}
          </p>
        </Show>
        <p class={styles.bodyText}>{s().introSkipHint}</p>
        <Show when={ui.introSkipperError}>
          {(message) => <p class={styles.errorPanel}>{message()}</p>}
        </Show>
      </div>
    </SectionCard>
  );
}
