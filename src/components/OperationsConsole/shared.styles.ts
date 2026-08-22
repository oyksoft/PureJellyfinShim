import { css } from '@styled-system/css';

export const sectionIcon = {
  primary: css({
    color: 'primary',
    height: '5',
    width: '5',
  }),
  secondary: css({
    color: 'secondary',
    height: '5',
    width: '5',
  }),
  plain: css({
    height: '6',
    width: '6',
  }),
} as const;

export const grid3 = css({
  display: 'grid',
  gap: '4',
  gridTemplateColumns: '[1fr]',
  md: {
    gridTemplateColumns: '[repeat(3, minmax(0, 1fr))]',
  },
});

export const tile = css({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '2xl',
  p: '4',
  bg: 'surfaceContainerHigh/30',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant/60',
});

export const span2 = css({
  md: {
    gridColumn: '[span 2 / span 2]',
  },
});

export const tileWatermark = css({
  opacity: '[0.05]',
  p: '3',
  position: 'absolute',
  right: '0',
  top: '0',
});

export const watermarkIcon = css({
  width: '12',
  height: '12',
});

export const overline = css({
  color: 'onSurfaceVariant',
  fontSize: '11',
  lineHeight: '16',
  fontWeight: 'bold',
  letterSpacing: '8',
  textTransform: 'uppercase',
});

export const value = css({
  mt: '1_5',
  color: 'onSurface',
  fontSize: '16',
  lineHeight: '24',
  fontWeight: 'bold',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const monoValue = css({
  mt: '1_5',
  color: 'secondary',
  fontFamily: 'mono',
  fontSize: '14',
  lineHeight: '20',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const bodyText = css({
  color: 'onSurfaceVariant/80',
  fontSize: '12',
  lineHeight: '16',
});

export const warning = css({
  mt: '2',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '2',
  color: 'warning',
  fontSize: '12',
  lineHeight: '16',
  fontWeight: 'semibold',
});

export const warningIcon = css({
  flexShrink: '[0]',
  height: '3_5',
  mt: '0_5',
  width: '3_5',
});

export const actionRow = css({
  mt: '6',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '3',
});

/* Confirm dialog */
export const backdrop = css({
  position: 'fixed',
  inset: '0',
  bg: '[rgba(0,0,0,0.3)]',
  zIndex: '100',
});

export const confirmDialog = css({
  position: 'fixed',
  top: '[50%]',
  left: '[50%]',
  transform: 'translate3d(-50%, -50%, 0)',
  zIndex: '[101]',
  bg: 'surfaceContainerLow',
  borderRadius: '4xl',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  p: '6',
  maxWidth: '[28rem]',
  width: 'full',
  boxShadow: '2xl',
});

export const confirmTitle = css({
  color: 'onSurface',
  fontSize: '18',
  fontWeight: 'bold',
  lineHeight: '24',
  mb: '3',
});

export const confirmDesc = css({
  color: 'onSurfaceVariant',
  fontSize: '14',
  lineHeight: '20',
  mb: '6',
});

export const confirmActions = css({
  display: 'flex',
  gap: '3',
  justifyContent: 'flex-end',
});

export const stack4 = css({
  display: 'grid',
  gap: '4',
});

export const fieldset = css({
  border: 0,
  display: 'grid',
  gap: '3',
  gridTemplateColumns: '[1fr]',
  margin: '0',
  padding: '0',
});

export const choice = css({
  bg: 'surfaceContainerHigh/40',
  color: 'onSurface',
  borderRadius: '2xl',
  px: '4',
  py: '3',
  textAlign: 'left',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  cursor: 'pointer',
  transform: '[scale3d(1, 1, 1)]',
  transitionDuration: '300',
  transitionProperty: '[background-color, border-color, box-shadow, transform]',
  _active: {
    transform: '[scale3d(0.96, 0.96, 1)]',
  },
  _hover: {
    bg: 'surfaceContainerHigh/60',
    borderColor: 'primary/50',
  },
  _pressed: {
    bg: 'primaryContainer/35',
    borderColor: 'primary',
    color: 'onPrimaryContainer',
    fontWeight: 'semibold',
    _hover: { bg: 'surfaceContainerHigh/60', borderColor: 'primary/50' },
  },
});

export const choiceTitle = css({
  display: 'block',
  color: 'onSurface',
  fontSize: '16',
  lineHeight: '24',
  fontWeight: 'semibold',
});

export const choiceDescription = css({
  display: 'block',
  mt: '1',
  color: 'onSurfaceVariant/80',
  fontSize: '12',
  lineHeight: '16',
  opacity: '[0.8]',
});

export const saving = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1_5',
  color: 'secondary',
  fontSize: '14',
  lineHeight: '20',
  fontWeight: 'semibold',
  animation: '[pulse 1.8s {easings.inOut} infinite]',
});

export const pingDot = css({
  animation: '[ping 1s cubic-bezier(0, 0, 0.2, 1) infinite]',
  bg: 'secondary',
  borderRadius: 'full',
  height: '1_5',
  width: '1_5',
});

export const errorPanel = css({
  borderRadius: '2xl',
  px: '4',
  py: '3',
  color: 'onErrorContainer',
  fontSize: '12',
  lineHeight: '16',
  fontWeight: 'semibold',
  bg: 'errorContainer/20',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'error/30',
});

export const mutedOutlinedButton = css({
  color: 'onSurfaceVariant',
  _hover: {
    borderColor: 'primary/50',
    color: 'onSurface',
  },
});

export const refreshButton = css({
  bg: 'surfaceContainerHigh/20',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  borderRadius: 'xl',
  marginLeft: 'auto',
  _hover: {
    borderColor: 'secondary',
    color: 'secondary',
  },
});

export const icon4_5 = css({
  height: 'lg',
  width: 'lg',
});
