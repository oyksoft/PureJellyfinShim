import { cx } from '@styled-system/css';
import { Activity, AlertTriangle, Link, Power, RefreshCw, Server, User } from 'lucide-solid';
import { createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Translations } from '~i18n';

import type { ConnectionState } from '../../bindings';
import { Button, SectionCard } from '../ui';
import * as styles from './shared.styles';
import { useOperationsConsoleStore } from './store';

interface ConnectionCardProps {
  t: Translations;
  state: ConnectionState | undefined;
  canReconnect: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
}

export default function ConnectionCard(props: ConnectionCardProps) {
  const [ui] = useOperationsConsoleStore();
  const [confirming, setConfirming] = createSignal(false);
  const s = () => props.t.settings;
  const capabilities = () => props.state?.capabilities;
  const remoteControlLabel = () => {
    const caps = capabilities();
    if (!caps?.remoteControl) return s().remoteControlUnavailable;
    return caps.remoteControlAvailable ? s().remoteControlAvailable : s().remoteControlPending;
  };
  const handleDisconnectClick = () => setConfirming(true);
  const handleConfirmDisconnect = () => {
    setConfirming(false);
    props.onDisconnect();
  };

  return (
    <>
      <SectionCard
        icon={<Activity class={styles.sectionIcon.secondary} />}
        title={s().connection}
        trailing={
          <Button
            type="button"
            variant="icon"
            onClick={props.onRefresh}
            aria-label={s().refreshStatus}
            title={s().refreshStatus}
          >
            <RefreshCw class={styles.icon4_5} />
          </Button>
        }
      >
        <div class={styles.grid3}>
          <div class={styles.tile}>
            <div class={styles.tileWatermark}>
              <Server class={styles.watermarkIcon} />
            </div>
            <p class={styles.overline}>{s().server}</p>
            <p class={styles.value} title={props.state?.serverName ?? ''}>
              {props.state?.serverName ?? s().notConnected}
            </p>
          </div>
          <div class={cx(styles.tile, styles.span2)}>
            <div class={styles.tileWatermark}>
              <Link class={styles.watermarkIcon} />
            </div>
            <p class={styles.overline}>{s().serverUrl}</p>
            <p class={styles.monoValue} title={props.state?.serverUrl ?? ''}>
              {props.state?.serverUrl ?? s().reconnectHint}
            </p>
          </div>
          <div class={styles.tile}>
            <div class={styles.tileWatermark}>
              <User class={styles.watermarkIcon} />
            </div>
            <p class={styles.overline}>{s().user}</p>
            <p class={styles.value} title={props.state?.userName ?? ''}>
              {props.state?.userName ?? s().noActiveUser}
            </p>
          </div>
          <div class={cx(styles.tile, styles.span2)}>
            <div class={styles.tileWatermark}>
              <Activity class={styles.watermarkIcon} />
            </div>
            <p class={styles.overline}>{s().remoteControl}</p>
            <p class={styles.value}>{remoteControlLabel()}</p>
            <Show when={capabilities()?.remoteControlWarning}>
              {(message) => (
                <p class={styles.warning}>
                  <AlertTriangle class={styles.warningIcon} />
                  <span>{message()}</span>
                </p>
              )}
            </Show>
          </div>
        </div>

        <div class={styles.actionRow}>
          <Button
            type="button"
            variant="danger"
            disabled={ui.disconnecting || !props.state?.connected}
            onClick={handleDisconnectClick}
            leadingIcon={<Power class={styles.icon4_5} />}
          >
            {ui.disconnecting ? s().disconnecting : s().disconnect}
          </Button>
          <Show when={!props.state?.connected && props.canReconnect}>
            <Button
              type="button"
              variant="primary"
              disabled={ui.reconnecting}
              onClick={props.onReconnect}
            >
              {ui.reconnecting ? s().reconnecting : s().reconnect}
            </Button>
          </Show>
        </div>
      </SectionCard>

      <Show when={confirming()}>
        <Portal>
          <div
            class={styles.backdrop}
            role="presentation"
            onClick={() => setConfirming(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setConfirming(false);
            }}
          />
          <div class={styles.confirmDialog}>
            <h3 class={styles.confirmTitle}>{s().disconnectConfirm}</h3>
            <p class={styles.confirmDesc}>{s().disconnectConfirmDesc}</p>
            <div class={styles.confirmActions}>
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                {s().cancel}
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmDisconnect}>
                {s().disconnect}
              </Button>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
