import { ClipboardList } from 'lucide-solid';
import type { Translations } from '~i18n';

import DiagnosticsPanel from '../DiagnosticsPanel';
import { Button, SectionCard } from '../ui';
import * as shared from './shared.styles';
import { useOperationsConsoleStore } from './store';

interface DiagnosticsCardProps {
  t: Translations;
}

export default function DiagnosticsCard(props: DiagnosticsCardProps) {
  const s = () => props.t.settings;
  const [ui, actions] = useOperationsConsoleStore();

  return (
    <SectionCard
      icon={<ClipboardList class={shared.sectionIcon.plain} />}
      title={s().diagnostics}
      trailing={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={actions.toggleDiagnostics}
          aria-expanded={ui.diagnosticsExpanded}
          aria-label={ui.diagnosticsExpanded ? s().collapse : s().expand}
        >
          {ui.diagnosticsExpanded ? s().collapse : s().expand}
        </Button>
      }
    >
      <DiagnosticsPanel t={props.t} compact={!ui.diagnosticsExpanded} />
    </SectionCard>
  );
}
