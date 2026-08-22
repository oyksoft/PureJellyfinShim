import { css, cva } from '@styled-system/css';

export const root = css({
  display: 'grid',
  gap: '4',
});

export const header = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '3',
  px: '1',
});

export const count = css({
  color: 'onSurfaceVariant',
  fontFamily: 'mono',
  fontSize: '11',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 'semibold',
});

export const checkboxRoot = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2_5',
  color: 'onSurface',
  cursor: 'pointer',
  fontSize: '11',
  fontWeight: 'bold',
  letterSpacing: '8',
  lineHeight: '16',
  textTransform: 'uppercase',
  transitionProperty: '[opacity]',
  userSelect: 'none',
  verticalAlign: 'top',
  _disabled: {
    cursor: 'not-allowed',
    opacity: '[0.5]',
  },
});

export const checkboxLabel = css({
  cursor: 'pointer',
  userSelect: 'none',
});

export const logBox = cva({
  base: {
    borderRadius: '2xl',
    p: '4',
    boxShadow: 'inner',
    bg: 'surfaceContainerHigh/40',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'outlineVariant',
    fontFamily: 'mono',
    fontSize: '12',
    lineHeight: '20',
    color: 'onSurface',
    resize: 'none',
    outline: 'none',
    cursor: 'text',
    whiteSpace: 'pre',
    overflowX: 'scroll',
    overflowY: 'auto',
    // Custom scrollbar styling - high contrast indigo accent
    '&::-webkit-scrollbar': {
      width: '[12px]',
      height: '[12px]',
    },
    '&::-webkit-scrollbar-track': {
      bg: 'surfaceContainerLow/50',
      borderRadius: '[6px]',
    },
    '&::-webkit-scrollbar-thumb': {
      bg: 'primary/70',
      borderRadius: '[6px]',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: '[transparent]',
      backgroundClip: 'padding-box',
      transitionProperty: '[background-color]',
      transitionDuration: '150',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      bg: 'primary',
    },
    '&::-webkit-scrollbar-thumb:active': {
      bg: 'primary/90',
    },
    '&::-webkit-scrollbar-corner': {
      bg: 'surfaceContainerLow/50',
    },
    // Firefox support
    scrollbarWidth: '[auto]',
    scrollbarColor:
      '[color-mix(in_srgb,var(--colors-primary)_70%,transparent)_color-mix(in_srgb,var(--colors-surfaceContainerLow)_50%,transparent)]',
  },
  variants: {
    size: {
      compact: {
        height: '[14rem]',
      },
      expanded: {
        height: '[24rem]',
      },
    },
  },
});

export const actions = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '3',
  px: '1',
});

export const status = cva({
  base: {
    fontSize: '11',
    lineHeight: '16',
    fontWeight: 'bold',
    letterSpacing: '8',
    textTransform: 'uppercase',
  },
  variants: {
    tone: {
      copied: {
        color: 'tertiary',
      },
      failed: {
        color: 'error',
      },
    },
  },
});

export const actionButton = css({
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  borderRadius: 'xl',
  color: 'onSurface',
  fontSize: '11',
  fontWeight: 'bold',
  letterSpacing: '8',
  lineHeight: '16',
  textTransform: 'uppercase',
  _hover: {
    bg: 'secondary/10',
    borderColor: 'secondary',
  },
});
