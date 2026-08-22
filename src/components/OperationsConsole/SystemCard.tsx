import { Switch } from '@ark-ui/solid/switch';
import { Monitor } from 'lucide-solid';
import type { Translations } from '~i18n';

import { SectionCard } from '../ui';
import * as shared from './shared.styles';
import * as styles from './SystemCard.styles';

interface SystemCardProps {
  t: Translations;
  startMinimized: boolean;
  onStartMinimizedChange: (value: boolean) => void;
}

export default function SystemCard(props: SystemCardProps) {
  const s = () => props.t.settings;

  return (
    <SectionCard icon={<Monitor class={shared.sectionIcon.plain} />} title={s().system}>
      <div class={styles.row}>
        <div class={styles.label}>
          <span class={styles.labelTitle}>{s().startMinimized}</span>
          <span class={styles.labelDesc}>{s().startMinimizedHint}</span>
        </div>
        <Switch.Root
          class={styles.toggleRoot}
          checked={props.startMinimized}
          onCheckedChange={(details) => props.onStartMinimizedChange(details.checked)}
        >
          <Switch.Control class={styles.toggleControl}>
            <Switch.Thumb class={styles.toggleThumb} />
          </Switch.Control>
          <Switch.HiddenInput name={s().startMinimized} />
        </Switch.Root>
      </div>
    </SectionCard>
  );
}
