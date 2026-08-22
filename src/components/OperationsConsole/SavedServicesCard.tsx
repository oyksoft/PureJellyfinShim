import { css, cx } from '@styled-system/css';
import { CircleAlert, Plus, Server, Trash2, UserRound } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Translations } from '~i18n';

import type { SavedServiceProfiles } from '../../bindings';
import { Button, SectionCard } from '../ui';
import * as styles from './SavedServicesCard.styles';
import * as shared from './shared.styles';

interface SavedServicesCardProps {
  t: Translations;
  profiles: SavedServiceProfiles | null;
  activatingProfileKey: string | null;
  removingProfileKey: string | null;
  onAddService: () => void;
  onActivateProfile: (key: string) => void;
  onReauthenticateProfile: (key: string) => void;
  onRemoveProfile: (key: string) => void;
}

export default function SavedServicesCard(props: SavedServicesCardProps) {
  const s = () => props.t.settings;
  const profiles = () => props.profiles?.profiles ?? [];
  const [confirmKey, setConfirmKey] = createSignal<string | null>(null);
  const confirmingProfile = () => profiles().find((p) => p.key === confirmKey());

  const handleDeleteClick = (key: string) => setConfirmKey(key);
  const handleConfirmRemove = () => {
    const key = confirmKey();
    if (key) {
      props.onRemoveProfile(key);
      setConfirmKey(null);
    }
  };

  return (
    <>
      <SectionCard icon={<Server class={shared.sectionIcon.secondary} />} title={s().savedServices}>
        <div class={styles.stack}>
          <Show
            when={profiles().length > 0}
            fallback={
              <div class={css(styles.profile)}>
                <p class={styles.name}>{s().noSavedServices}</p>
                <p class={shared.bodyText}>{s().noSavedServicesHint}</p>
              </div>
            }
          >
            <For each={profiles()}>
              {(profile) => (
                <div
                  class={css(
                    styles.profile,
                    profile.active && styles.activeProfile,
                    Boolean(profile.lastRestoreError) && styles.warningProfile,
                  )}
                >
                  <div class={styles.profileInner}>
                    <div class={styles.copy}>
                      <div class={styles.titleRow}>
                        <p class={styles.name}>{profile.serverName ?? profile.serverUrl}</p>
                        <span class={styles.pill}>{profile.provider}</span>
                        <Show when={profile.active}>
                          <span class={cx(styles.pill, styles.activePill)}>
                            {props.t.services.active}
                          </span>
                        </Show>
                      </div>
                      <p class={styles.url}>{profile.serverUrl}</p>
                      <p class={styles.user}>
                        <UserRound class={styles.icon3_5} />
                        {profile.userName}
                      </p>
                      <Show when={profile.lastRestoreError}>
                        {(message) => (
                          <p class={styles.warning}>
                            <CircleAlert class={styles.warningIcon} />
                            <span>{message()}</span>
                          </p>
                        )}
                      </Show>
                    </div>
                    <div class={styles.actions}>
                      {profile.reauthRequired ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => props.onReauthenticateProfile(profile.key)}
                        >
                          {s().signInAgain}
                        </Button>
                      ) : (
                        <Show when={!profile.active}>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={props.activatingProfileKey === profile.key}
                            onClick={() => props.onActivateProfile(profile.key)}
                          >
                            {props.activatingProfileKey === profile.key
                              ? s().activating
                              : s().activate}
                          </Button>
                        </Show>
                      )}
                      <Button
                        type="button"
                        variant="danger"
                        disabled={props.removingProfileKey === profile.key}
                        onClick={() => handleDeleteClick(profile.key)}
                      >
                        <Trash2 class={styles.trashIcon} />
                        {props.removingProfileKey === profile.key ? s().removing : s().remove}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>

        <div class={styles.footer}>
          <Button
            type="button"
            variant="primary"
            onClick={props.onAddService}
            leadingIcon={<Plus class={styles.icon4_5} />}
          >
            {s().addService}
          </Button>
        </div>
      </SectionCard>

      <Show when={confirmKey()}>
        <Portal>
          <div
            class={styles.backdrop}
            role="presentation"
            onClick={() => setConfirmKey(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setConfirmKey(null);
            }}
          />
          <div class={styles.confirmDialog}>
            <h3 class={styles.confirmTitle}>{s().confirmRemoveService}</h3>
            <p class={styles.confirmDesc}>
              {s().confirmRemoveServiceDesc?.replace('{name}', confirmingProfile()?.userName ?? '')}
            </p>
            <div class={styles.confirmActions}>
              <Button type="button" variant="secondary" onClick={() => setConfirmKey(null)}>
                {s().cancel}
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmRemove}>
                {s().remove}
              </Button>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
