import { css } from '@styled-system/css';

export const field = css({
  display: 'block',
});

export const row = css({
  alignItems: 'center',
  bg: 'surfaceContainerHigh/60',
  borderRadius: 'lg',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant/50',
  display: 'flex',
  gap: '3',
  minHeight: '[2.5rem]',
  padding: '2',
  transitionDuration: '150',
  transitionProperty: '[background-color, border-color]',
  _hover: {
    borderColor: 'outline',
  },
  _focusWithin: {
    borderColor: 'primary',
    outline: '[2px solid_var(--colors-primary)]',
    outlineOffset: '1',
  },
  '&[data-recording]': {
    borderColor: 'primary',
    bg: 'primaryContainer/15',
  },
});

export const valueArea = css({
  alignItems: 'center',
  display: 'flex',
  flex: '1',
  flexWrap: 'wrap',
  gap: '1_5',
  minHeight: '[1.5rem]',
  minWidth: '[0]',
});

export const placeholder = css({
  alignItems: 'center',
  color: 'onSurfaceVariant/70',
  display: 'inline-flex',
  fontSize: '13',
  gap: '2',
});

export const placeholderIcon = css({
  height: '4',
  width: '4',
});

export const recordingText = css({
  alignItems: 'center',
  color: 'primary',
  display: 'inline-flex',
  fontSize: '13',
  fontWeight: 'medium',
  gap: '2',
});

export const recordingIcon = css({
  animation: '[pulse_1.5s_ease-in-out_infinite]',
  height: '4',
  width: '4',
});

export const kbd = css({
  alignItems: 'center',
  bg: 'surfaceContainerHighest',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  boxShadow: '[0_1px_0_var(--colors-outlineVariant)]',
  color: 'onSurface',
  display: 'inline-flex',
  fontFamily: 'mono',
  fontSize: '12',
  fontWeight: 'semibold',
  justifyContent: 'center',
  lineHeight: '16',
  minWidth: '[1.5rem]',
  paddingX: '2',
  paddingY: '0_5',
});

export const plus = css({
  color: 'onSurfaceVariant/70',
  fontSize: '12',
  fontWeight: 'medium',
});

export const cancelIcon = css({
  height: '4',
  width: '4',
});
