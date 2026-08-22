import OperationsConsole from '@components/OperationsConsole';
import { Button } from '@components/ui';
import { css } from '@styled-system/css';
import { createFileRoute, useNavigate } from '@tanstack/solid-router';
import { ArrowLeft } from 'lucide-solid';
import { Suspense } from 'solid-js';

import { useI18n } from '../../i18n';

export const Route = createFileRoute('/_authenticated/ops')({
  component: OpsPage,
});

const page = css({
  display: 'flex',
  flexDirection: 'column',
  height: '[100dvh]',
  width: 'full',
  bg: 'background',
});

const header = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'outlineVariant/40',
  px: '5',
  py: '3',
  flexShrink: '0',
});

const title = css({
  color: 'onSurface',
  fontSize: '18',
  fontWeight: 'bold',
  m: '0',
});

const body = css({
  display: 'flex',
  flex: '1',
  minHeight: '[0]',
  overflow: 'hidden',
});

const backIcon = css({
  height: '5',
  width: '5',
});

export default function OpsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const goHome = () => navigate({ to: '/home' });

  return (
    <div class={page}>
      <header class={header}>
        <Button type="button" variant="icon" size="md" aria-label="Back to home" onClick={goHome}>
          <ArrowLeft class={backIcon} />
        </Button>
        <h1 class={title}>{t().settings.title}</h1>
      </header>
      <div class={body}>
        <Suspense>
          <OperationsConsole />
        </Suspense>
      </div>
    </div>
  );
}
