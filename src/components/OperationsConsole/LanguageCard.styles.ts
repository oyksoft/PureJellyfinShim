import { css } from '@styled-system/css';

export const options = css({
  display: 'inline-flex',
  alignItems: 'center',
  bg: 'surfaceContainerHigh/60',
  borderRadius: 'full',
  p: '0_5',
  gap: '0',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant/40',
  width: 'fit',
});

export const option = css({
  appearance: 'none',
  bg: '[transparent]',
  borderWidth: '0',
  color: 'onSurfaceVariant',
  cursor: 'pointer',
  fontSize: '13',
  fontWeight: 'medium',
  px: '4',
  py: '1_5',
  borderRadius: 'full',
  transitionDuration: '150',
  transitionProperty: '[background-color, color]',
  _hover: {
    color: 'onSurface',
  },
});

export const optionActive = css({
  bg: 'surfaceContainerHighest',
  color: 'onSurface',
  fontWeight: 'semibold',
  boxShadow: 'sm',
  _hover: {
    bg: 'surfaceContainerHighest',
    color: 'onSurface',
  },
});

export const description = css({
  fontSize: '13',
  color: 'onSurfaceVariant/80',
  m: '0',
});
