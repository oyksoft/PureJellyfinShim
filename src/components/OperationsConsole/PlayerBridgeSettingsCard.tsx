import { Field as ArkField } from '@ark-ui/solid/field';
import { TagsInput } from '@ark-ui/solid/tags-input';
import { cx } from '@styled-system/css';
import { ArrowDown, ArrowUp, Globe, Plus, Settings, Trash2 } from 'lucide-solid';
import { For, Show } from 'solid-js';
import type { Translations } from '~i18n';

import { Button, FieldControl, JellyPilotSelect, SectionCard } from '../ui';
import type { JellyPilotSelectItem } from '../ui';
import * as styles from './PlayerBridgeSettingsCard.styles';
import * as shared from './shared.styles';
import { useOperationsConsoleStore } from './store';
import { getSubtitleLanguageLabel, parseSubtitleLanguageInput } from './subtitleLanguages';
import type { OperationsConsoleForm } from './types';

interface PlayerBridgeSettingsCardProps {
  t: Translations;
  form: OperationsConsoleForm;
  subtitleLanguageSelectItems: JellyPilotSelectItem[];
  onSaveTextSetting: (field: 'deviceName' | 'mpvPath', value: string) => void;
  onDetectMpv: () => void;
  onAddSubtitleLanguageCodes: (codes: string[]) => void;
  onAddSubtitleLanguages: () => void;
  onRemoveSubtitleLanguage: (language: string) => void;
  onClearSubtitleLanguages: () => void;
  onMoveSubtitleLanguage: (index: number, direction: -1 | 1) => void;
}

export default function PlayerBridgeSettingsCard(props: PlayerBridgeSettingsCardProps) {
  const s = () => props.t.settings;
  const [ui, actions] = useOperationsConsoleStore();

  return (
    <SectionCard
      icon={<Settings class={shared.sectionIcon.primary} />}
      title={s().playerBridgeSettings}
      trailing={
        <Show when={ui.playerBridgeSaveStatus}>
          {(status) => (
            <span class={styles.saveBadge({ tone: status().type === 'error' ? 'error' : 'ok' })}>
              {status().text}
            </span>
          )}
        </Show>
      }
    >
      <div class={shared.stack4}>
        <props.form.Field
          name="deviceName"
          validators={{
            onBlur: ({ value }) => (!value.trim() ? s().deviceNameRequired : undefined),
          }}
        >
          {(field) => (
            <ArkField.Root class={styles.field} invalid={field().state.meta.errors.length > 0}>
              <ArkField.Label class={shared.overline}>{s().playbackTargetName}</ArkField.Label>
              <ArkField.Input
                asChild={(fieldProps) => (
                  <FieldControl
                    {...fieldProps()}
                    variant="filled"
                    name={field().name}
                    type="text"
                    value={field().state.value}
                    onInput={(event) => field().handleChange(event.currentTarget.value)}
                    onBlur={(event) => {
                      field().handleBlur();
                      props.onSaveTextSetting('deviceName', event.currentTarget.value);
                    }}
                    class={styles.fullWidth}
                    placeholder="PureJellyfinShim"
                  />
                )}
              />
              <Show when={field().state.meta.errors.length > 0}>
                <ArkField.ErrorText class={styles.error}>
                  {field().state.meta.errors[0]}
                </ArkField.ErrorText>
              </Show>
              <ArkField.HelperText class={styles.helper}>{s().deviceNameHint}</ArkField.HelperText>
            </ArkField.Root>
          )}
        </props.form.Field>

        <props.form.Field name="mpvPath">
          {(field) => (
            <ArkField.Root class={styles.field}>
              <ArkField.Label class={shared.overline}>{s().mpvPath}</ArkField.Label>
              <div class={styles.detectRow}>
                <ArkField.Input
                  asChild={(fieldProps) => (
                    <FieldControl
                      {...fieldProps()}
                      variant="filled"
                      name={field().name}
                      type="text"
                      value={field().state.value}
                      onInput={(event) => field().handleChange(event.currentTarget.value)}
                      onBlur={(event) => {
                        field().handleBlur();
                        props.onSaveTextSetting('mpvPath', event.currentTarget.value);
                      }}
                      placeholder={s().mpvPathPlaceholder}
                      class={styles.flexInput}
                    />
                  )}
                />
                <Button
                  type="button"
                  onClick={props.onDetectMpv}
                  disabled={ui.detectingMpv}
                  variant="primary"
                >
                  {ui.detectingMpv ? s().detecting : s().detectMpv}
                </Button>
              </div>
            </ArkField.Root>
          )}
        </props.form.Field>

        <TagsInput.Root
          value={ui.selectedSubtitleLanguages}
          inputValue=""
          editable={false}
          class={styles.languagePanel}
        >
          <div class={styles.panelHeader}>
            <div>
              <h3 class={styles.languageTitle}>
                <Globe class={styles.languageIcon} />
                {s().subtitleLanguages}
              </h3>
              <p class={styles.helper}>{s().subtitleLanguagesHint}</p>
            </div>
            <Show when={ui.selectedSubtitleLanguages.length > 0}>
              <Button
                type="button"
                variant="text"
                class={styles.clearButton}
                onClick={props.onClearSubtitleLanguages}
              >
                {s().clearAll}
              </Button>
              <TagsInput.ClearTrigger class={styles.hidden} />
            </Show>
          </div>

          <div class={styles.languageGrid}>
            <JellyPilotSelect
              label={s().predefinedLanguages}
              items={props.subtitleLanguageSelectItems}
              value={null}
              placeholder={s().selectLanguagePlaceholder}
              onValueChange={(value) => {
                props.onAddSubtitleLanguageCodes([value]);
              }}
            />

            <ArkField.Root class={styles.customField}>
              <ArkField.Label class={shared.overline}>{s().customCode}</ArkField.Label>
              <div class={styles.addRow}>
                <ArkField.Input
                  asChild={(fieldProps) => (
                    <FieldControl
                      {...fieldProps()}
                      variant="filled"
                      id="custom-subtitle-lang-input"
                      type="text"
                      value={ui.subtitleLanguageInput}
                      onInput={(event) =>
                        actions.setSubtitleLanguageInput(event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return;
                        }
                        event.preventDefault();
                        props.onAddSubtitleLanguages();
                      }}
                      class={cx(styles.flexInput, styles.mono)}
                      placeholder={s().customCodePlaceholder}
                      aria-label={s().customCode}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={parseSubtitleLanguageInput(ui.subtitleLanguageInput).length === 0}
                  onClick={props.onAddSubtitleLanguages}
                  leadingIcon={<Plus class={styles.icon4_5} />}
                >
                  {s().add}
                </Button>
              </div>
            </ArkField.Root>
          </div>

          <Show
            when={ui.selectedSubtitleLanguages.length > 0}
            fallback={<p class={styles.empty}>{s().subtitleLanguagesEmpty}</p>}
          >
            <ol class={styles.list} aria-label={s().subtitleLanguages}>
              <For each={ui.selectedSubtitleLanguages}>
                {(language, index) => (
                  <TagsInput.Item index={index()} value={language} class={styles.item}>
                    <TagsInput.ItemPreview class={styles.itemPreview}>
                      <span class={styles.indexBadge}>{index() + 1}</span>
                      <TagsInput.ItemText class={styles.code}>{language}</TagsInput.ItemText>
                      <span class={styles.itemLabel}>{getSubtitleLanguageLabel(language)}</span>
                    </TagsInput.ItemPreview>
                    <div class={styles.itemActions}>
                      <Button
                        type="button"
                        variant="icon"
                        class={styles.smallIconButton}
                        disabled={index() === 0}
                        aria-label={s().moveUp.replace('{language}', language)}
                        onClick={() => props.onMoveSubtitleLanguage(index(), -1)}
                      >
                        <ArrowUp class={styles.icon4} />
                      </Button>
                      <Button
                        type="button"
                        variant="icon"
                        class={styles.smallIconButton}
                        disabled={index() === ui.selectedSubtitleLanguages.length - 1}
                        aria-label={s().moveDown.replace('{language}', language)}
                        onClick={() => props.onMoveSubtitleLanguage(index(), 1)}
                      >
                        <ArrowDown class={styles.icon4} />
                      </Button>
                      <TagsInput.ItemDeleteTrigger
                        asChild={(triggerProps) => (
                          <Button
                            {...triggerProps()}
                            type="button"
                            variant="icon"
                            class={cx(styles.smallIconButton, styles.deleteButton)}
                            aria-label={s().removeLanguage.replace('{language}', language)}
                            onClick={() => props.onRemoveSubtitleLanguage(language)}
                          >
                            <Trash2 class={styles.icon4} />
                          </Button>
                        )}
                      />
                    </div>
                  </TagsInput.Item>
                )}
              </For>
            </ol>
          </Show>
          <TagsInput.HiddenInput />
        </TagsInput.Root>
      </div>
    </SectionCard>
  );
}
