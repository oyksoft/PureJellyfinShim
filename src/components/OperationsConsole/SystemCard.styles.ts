import { css } from '@styled-system/css';

export const row = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '[12px]',
});

export const label = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '[2px]',
});

export const labelTitle = css({
  fontSize: '13',
  fontWeight: 'medium',
  color: 'onSurface',
  lineHeight: '[1.4]',
});

export const labelDesc = css({
  fontSize: '12',
  color: 'onSurfaceVariant',
  lineHeight: '[1.4]',
});

export const toggleRoot = css({
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
});

export const toggleControl = css({
  position: 'relative',
  width: '[44px]',
  height: '[24px]',
  borderRadius: '[12px]',
  bg: 'outlineVariant',
  transitionProperty: '[background-color]',
  transitionDuration: '150',

  '&[data-state="checked"]': {
    bg: 'primary',
  },
});

export const toggleThumb = css({
  position: 'absolute',
  top: '[3px]',
  left: '[3px]',
  width: '[18px]',
  height: '[18px]',
  borderRadius: 'full',
  bg: '[white]',
  boxShadow: 'sm',
  transitionDuration: '150',

  '&[data-state="checked"]': {
    left: '[23px]',
  },
});
