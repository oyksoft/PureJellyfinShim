import { css } from '@styled-system/css';

export const root = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4',
  py: '6',
});

export const textBlock = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
});

export const appName = css({
  color: 'onSurface',
  fontFamily: 'mono',
  fontSize: '15',
  fontWeight: 'bold',
  letterSpacing: '[4]',
  lineHeight: '[1]',
  textShadow:
    '[0_1px_2px_rgba(0,0,0,0.5),0_0_8px_color-mix(in_srgb,var(--colors-primary)_25%,transparent)]',
});

export const iconLink = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'onSurfaceVariant',
  opacity: '[0.6]',
  borderRadius: 'sm',
  padding: '1',
  cursor: 'pointer',
  borderWidth: '0',
  bg: '[transparent]',
  transform: '[scale3d(1,1,1)]',
  transitionProperty: '[color, opacity, transform]',
  transitionDuration: '150',
  _hover: {
    color: 'primary',
    opacity: '[1]',
  },
  _active: {
    transform: '[scale3d(0.92,0.92,0.92)]',
  },
});

export const icon = css({
  width: '6',
  height: '6',
});
