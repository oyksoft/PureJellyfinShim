import { css } from '@styled-system/css';

export const stack = css({
  display: 'grid',
  gap: '6',
});

export const addServiceDialogOverflowLayout = {
  contentMarginBlock: 'auto',
  positionerAlignItems: 'flex-start',
  positionerOverflowY: 'auto',
} as const;

export const positioner = css({
  position: 'fixed',
  inset: '0',
  display: 'flex',
  alignItems: addServiceDialogOverflowLayout.positionerAlignItems,
  justifyContent: 'center',
  overflowY: addServiceDialogOverflowLayout.positionerOverflowY,
  p: '4',
  zIndex: '60',
});

export const content = css({
  my: addServiceDialogOverflowLayout.contentMarginBlock,
  maxWidth: '[28rem]',
  outline: 'none',
  position: 'relative',
  width: 'full',
  bg: 'surface',
  borderRadius: 'xl',
});

export const closeButton = css({
  bg: 'surfaceContainerHigh/80',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  borderRadius: 'xl',
  boxShadow: 'lg',
  color: 'onSurfaceVariant',
  position: 'absolute',
  right: '5',
  top: '4',
  zIndex: '10',
  _hover: {
    borderColor: 'secondary',
    color: 'secondary',
  },
});

export const icon4_5 = css({
  height: 'lg',
  width: 'lg',
});

/* Settings sidebar layout */
export const settingsLayout = css({
  display: 'flex',
  alignItems: 'stretch',
  gap: '0',
  height: '[100%]',
  width: 'full',
});

export const settingsNav = css({
  bg: 'surfaceContainerLow/50',
  borderRadius: '2xl',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant/40',
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  height: '[calc(100%-16px)]',
  mb: '2',
  ml: '2',
  mt: '2',
  p: '3',
  position: 'sticky',
  top: '2',
  width: '[200px]',
  flexShrink: '0',
  alignSelf: 'flex-start',
});

export const settingsNavItem = css({
  appearance: 'none',
  bg: '[transparent]',
  borderRadius: '3xl',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant/40',
  color: 'onSurfaceVariant',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: '14',
  fontWeight: 'medium',
  gap: '3',
  minHeight: '10',
  p: '2',
  width: 'full',
  transitionDuration: '200',
  transitionTimingFunction: 'standard',
  _hover: {
    bg: 'surfaceContainerHigh/70',
    color: 'onSurface',
    borderColor: 'outline/60',
  },
});

export const settingsNavItemActive = css({
  appearance: 'none',
  bg: 'warningEmphasis',
  borderColor: 'warningEmphasis',
  borderWidth: '2px',
  boxShadow: 'lg',
  color: 'onWarningEmphasis',
  fontWeight: 'bold',
  _hover: {
    bg: 'warningEmphasis',
    borderColor: 'warningEmphasis',
    color: 'onWarningEmphasis',
  },
});

export const settingsNavDivider = css({});

export const settingsContent = css({
  flex: '1',
  minWidth: '0',
  p: '5',
  overflowY: 'auto',
});

export const settingsSection = css({
  mb: '6',
  '&:last-child': {
    mb: '0',
  },
});
