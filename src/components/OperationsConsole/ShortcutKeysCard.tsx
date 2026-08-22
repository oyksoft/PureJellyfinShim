import { Keyboard, RotateCcw } from 'lucide-solid';
import { Show } from 'solid-js';
import type { Translations } from '~i18n';

import { Button, SectionCard } from '../ui';
import * as shared from './shared.styles';
import ShortcutKeyInput from './ShortcutKeyInput';
import * as styles from './ShortcutKeysCard.styles';
import type { OperationsConsoleForm } from './types';

interface ShortcutKeysCardProps {
  t: Translations;
  form: OperationsConsoleForm;
  showIntroSkipKey: boolean;
  onSaveTextSetting: (
    field: 'keybindNext' | 'keybindPrev' | 'keybindIntroSkip',
    value: string,
  ) => void;
  onResetDefaults: () => void;
}

export default function ShortcutKeysCard(props: ShortcutKeysCardProps) {
  const s = () => props.t.settings;

  return (
    <SectionCard
      icon={<Keyboard class={shared.sectionIcon.secondary} />}
      title={s().shortcutKeys}
      trailing={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={props.onResetDefaults}
          leadingIcon={<RotateCcw class={styles.resetIcon} />}
        >
          {s().shortcutResetDefaults}
        </Button>
      }
    >
      <div class={shared.stack4}>
        <p class={styles.description}>
          {props.showIntroSkipKey ? s().shortcutKeysHint : s().shortcutKeysHintBasic}
        </p>

        <props.form.Field
          name="keybindNext"
          validators={{
            onChange: ({ value }) => (!value.trim() ? s().keybindingRequired : undefined),
          }}
        >
          {(field) => (
            <ShortcutKeyInput
              name={field().name}
              label={s().nextEpisodeKey}
              value={field().state.value}
              invalid={field().state.meta.errors.length > 0}
              onCommit={(value) => {
                field().handleChange(value);
                field().handleBlur();
                props.onSaveTextSetting('keybindNext', value);
              }}
            />
          )}
        </props.form.Field>

        <props.form.Field
          name="keybindPrev"
          validators={{
            onChange: ({ value }) => (!value.trim() ? s().keybindingRequired : undefined),
          }}
        >
          {(field) => (
            <ShortcutKeyInput
              name={field().name}
              label={s().prevEpisodeKey}
              value={field().state.value}
              invalid={field().state.meta.errors.length > 0}
              onCommit={(value) => {
                field().handleChange(value);
                field().handleBlur();
                props.onSaveTextSetting('keybindPrev', value);
              }}
            />
          )}
        </props.form.Field>

        <Show when={props.showIntroSkipKey}>
          <props.form.Field
            name="keybindIntroSkip"
            validators={{
              onChange: ({ value }) => (!value.trim() ? s().keybindingRequired : undefined),
            }}
          >
            {(field) => (
              <ShortcutKeyInput
                name={field().name}
                label={s().introSkipKey}
                value={field().state.value}
                invalid={field().state.meta.errors.length > 0}
                onCommit={(value) => {
                  field().handleChange(value);
                  field().handleBlur();
                  props.onSaveTextSetting('keybindIntroSkip', value);
                }}
              />
            )}
          </props.form.Field>
        </Show>
      </div>
    </SectionCard>
  );
}
