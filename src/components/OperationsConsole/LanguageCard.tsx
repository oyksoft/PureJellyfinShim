import { Globe } from 'lucide-solid';
import type { SupportedLocale, Translations } from '~i18n';

import { SectionCard } from '../ui';
import * as styles from './LanguageCard.styles';
import * as shared from './shared.styles';

interface LanguageCardProps {
  t: Translations;
  current: SupportedLocale;
  options: { value: SupportedLocale; label: string }[];
  onSelect: (value: SupportedLocale) => void;
}

export default function LanguageCard(props: LanguageCardProps) {
  const s = () => props.t.settings;

  return (
    <SectionCard icon={<Globe class={shared.sectionIcon.plain} />} title={s().language}>
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '12px',
        }}
      >
        <p class={styles.description}>{s().languageHint}</p>
        <div class={styles.options}>
          {props.options.map((opt) => (
            <button
              type="button"
              class={styles.option}
              classList={{ [styles.optionActive]: props.current === opt.value }}
              onClick={() => props.onSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
