import { css, cva } from '@styled-system/css';

/* Shell */
export const shell = css({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '[100dvh]',
  position: 'relative',
  overflow: 'hidden',
});

/* Ambient glows */
export const ambientBg = css({
  position: 'absolute',
  top: '[-200px]',
  left: '[50%]',
  transform: 'translate3d(-50%, 0, 0)',
  width: '[600px]',
  height: '[600px]',
  borderRadius: 'full',
  bg: 'primary',
  opacity: '0_04',
  filter: '[blur(120px)]',
  pointerEvents: 'none',
});

export const ambientBg2 = css({
  position: 'absolute',
  bottom: '[-100px]',
  right: '[-100px]',
  width: '[400px]',
  height: '[400px]',
  borderRadius: 'full',
  bg: 'tertiary',
  opacity: '0_03',
  filter: '[blur(80px)]',
  pointerEvents: 'none',
});

/* Header */
export const header = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '8',
  py: '6',
  position: 'relative',
  zIndex: '10',
});

export const logoArea = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
});

export const logo = css({
  width: '8',
  height: '8',
  borderRadius: 'xl',
  bg: 'surfaceContainer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
});

export const logoIcon = css({
  width: '5',
  height: '5',
  color: 'primary',
});

export const title = css({
  fontSize: '22',
  fontWeight: 'bold',
  color: 'onBackground',
  letterSpacing: '[-0.5px]',
});

export const subtitle = css({
  fontSize: '12',
  color: 'onSurfaceVariant',
  marginTop: '0_5',
});

/* Main content */
export const content = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flex: '1',
  position: 'relative',
  zIndex: '10',
  px: '8',
  pb: '10',
});

/* Form card */
export const card = cva({
  base: {
    width: 'full',
    maxWidth: '[440px]',
    overflow: 'hidden',
  },
  variants: {
    embedded: {
      true: {
        bg: '[transparent]',
        borderWidth: '0',
      },
      false: {
        bg: 'surfaceContainer',
        borderRadius: '3xl',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant',
      },
    },
  },
  defaultVariants: {
    embedded: false,
  },
});

export const cardHeader = css({
  px: '6',
  pt: '6',
  pb: '5',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'outlineVariant',
});

export const cardHeaderEmbedded = css({
  px: '6',
  pt: '6',
  pb: '4',
});

export const cardTitle = css({
  fontSize: '18',
  fontWeight: 'semibold',
  color: 'onSurface',
});

export const cardBody = css({
  p: '6',
  display: 'grid',
  gap: '5',
});

export const cardBodyEmbedded = css({
  p: '6',
  display: 'grid',
  gap: '5',
});

/* Field label */
export const fieldLabel = css({
  display: 'block',
  mb: '1_5',
  color: 'onSurfaceVariant',
  fontSize: '12',
  lineHeight: '16',
  fontWeight: 'bold',
  letterSpacing: '[0.5px]',
  textTransform: 'uppercase',
});

export const fieldBlock = css({
  display: 'block',
});

export const settingsButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '10',
  height: '10',
  borderRadius: '2xl',
  bg: 'surfaceContainer',
  color: 'onSurfaceVariant',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  transitionDuration: '200',
  transitionProperty: '[background-color, color, border-color]',
  _hover: {
    bg: 'surfaceContainerHigh',
    borderColor: 'primary',
    color: 'primary',
  },
  _active: {
    transform: '[scale3d(0.95, 0.95, 1)]',
  },
});

export const settingsIcon = css({
  width: '5',
  height: '5',
});

/* Server protocol toggle */
export const segmented = cva({
  base: {
    display: 'grid',
    borderRadius: 'xl',
    p: '1',
    bg: 'surfaceContainerHigh/40',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'outlineVariant',
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: '[1fr]' },
      2: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' },
    },
  },
});

export const segment = cva({
  base: {
    borderRadius: 'lg',
    px: '3',
    py: '2',
    fontSize: '13',
    lineHeight: '20',
    fontWeight: 'semibold',
    bg: '[transparent]',
    border: 0,
    cursor: 'pointer',
    transform: '[scale3d(1, 1, 1)]',
    transitionDuration: '200',
    transitionProperty: '[background-color, color, transform]',
    _hover: {
      bg: 'surfaceContainerHighest/40',
    },
    _active: {
      transform: '[scale3d(0.96, 0.96, 1)]',
    },
    _disabled: {
      cursor: 'not-allowed',
      opacity: '[0.5]',
    },
  },
  variants: {
    selected: {
      true: {
        bg: 'primary',
        color: 'onPrimary',
        fontWeight: 'bold',
      },
      false: {
        color: 'onSurfaceVariant',
      },
    },
  },
});

/* Server URL preview strip */
export const preview = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  borderRadius: 'xl',
  px: '4',
  py: '3',
  bg: 'surfaceContainerHigh/30',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
});

export const previewDot = css({
  width: '2',
  height: '2',
  borderRadius: 'full',
  bg: 'tertiary',
  flexShrink: '[0]',
});

export const previewValue = css({
  color: 'onSurface',
  fontSize: '13',
  fontFamily: 'mono',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '1',
  minWidth: '0',
});

export const previewEmpty = css({
  color: 'onSurfaceVariant',
  fontSize: '13',
  fontStyle: 'italic',
  flex: '1',
});

/* Media server toggle */
export const providerGrid = css({
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '2',
});

export const providerBtn = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'xl',
    px: '4',
    py: '3',
    fontSize: '14',
    fontWeight: 'semibold',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    transitionDuration: '150',
    transitionProperty: '[background-color, border-color, color]',
    _disabled: {
      cursor: 'not-allowed',
      opacity: '[0.5]',
    },
  },
  variants: {
    selected: {
      true: {
        bg: 'primary',
        borderColor: 'primary',
        color: 'onPrimary',
      },
      false: {
        bg: 'surfaceContainerHigh/40',
        borderColor: 'outlineVariant',
        color: 'onSurfaceVariant',
        _hover: {
          bg: 'surfaceContainerHigh',
          borderColor: 'primary/50',
          color: 'onSurface',
        },
      },
    },
  },
});

/* Tabs (Quick Connect / Password) */
export const tabsList = css({
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '2',
  borderRadius: 'xl',
  p: '1',
  bg: 'surfaceContainerHigh/40',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
});

export const tabTrigger = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'lg',
    px: '4',
    py: '2_5',
    fontSize: '13',
    fontWeight: 'semibold',
    cursor: 'pointer',
    border: 0,
    transform: '[scale3d(1, 1, 1)]',
    transitionDuration: '150',
    transitionProperty: '[background-color, color, transform]',
    _hover: {
      bg: 'surfaceContainerHighest/40',
    },
  },
  variants: {
    selected: {
      true: {
        bg: 'primary',
        color: 'onPrimary',
        fontWeight: 'bold',
      },
      false: {
        bg: '[transparent]',
        color: 'onSurfaceVariant',
      },
    },
  },
});

/* Quick Connect panel */
export const quickPanel = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: '3',
  p: '4',
});

export const radar = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16',
  height: '16',
  borderRadius: 'full',
  bg: 'tertiaryContainer/20',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'tertiary/20',
});

export const radarIcon = css({
  color: 'tertiary',
  height: '7',
  width: '7',
});

export const radarPulse = css({
  animation: '[ping 2s cubic-bezier(0, 0, 0.2, 1) infinite]',
});

export const quickText = css({
  color: 'onSurface',
  fontSize: '14',
  lineHeight: '20',
});

export const quickHint = css({
  color: 'onSurfaceVariant',
  fontSize: '12',
  lineHeight: '16',
});

export const codeBox = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1',
  px: '6',
  py: '3',
  borderRadius: '2xl',
  bg: 'surfaceContainerHigh/50',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
});

export const codeLabel = css({
  color: 'onSurfaceVariant',
  fontSize: '10',
  fontWeight: 'bold',
  letterSpacing: '[1px]',
  textTransform: 'uppercase',
});

export const codeValue = css({
  color: 'tertiary',
  fontFamily: 'mono',
  fontSize: '28',
  fontWeight: 'bold',
  letterSpacing: '[2px]',
  lineHeight: '44',
});

export const awaitingRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  color: 'onSurfaceVariant',
  fontSize: '12',
  fontWeight: 'semibold',
  animation: '[pulse 1.8s {easings.inOut} infinite]',
});

export const awaitingDot = css({
  width: '2',
  height: '2',
  borderRadius: 'full',
  bg: 'tertiary',
});

/* Alert */
export const alert = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '3',
  borderRadius: 'xl',
  px: '4',
  py: '3',
  color: 'onErrorContainer',
  bg: 'errorContainer/20',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'error/30',
});

export const alertIcon = css({
  mt: '0_5',
  width: '[1.125rem]',
  height: '[1.125rem]',
  flexShrink: '[0]',
  color: 'error',
});

export const alertTitle = css({
  color: 'error',
  fontSize: '13',
  fontWeight: 'bold',
});

export const alertMessage = css({
  mt: '0_5',
  color: 'onSurfaceVariant',
  fontSize: '13',
  lineHeight: '16',
});

/* Checkbox */
export const remember = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2_5',
  cursor: 'pointer',
  userSelect: 'none',
});

export const checkboxLabel = css({
  cursor: 'pointer',
  color: 'onSurface',
  fontSize: '13',
  fontWeight: 'medium',
  transitionProperty: '[color]',
  _hover: {
    color: 'onSurfaceVariant',
  },
});

/* Reauth mode */
export const reauthRows = css({
  display: 'grid',
  gap: '3',
});

export const reauthRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
});

export const reauthDot = css({
  width: '2',
  height: '2',
  borderRadius: 'full',
  bg: 'tertiary',
  flexShrink: '[0]',
});

export const reauthKey = css({
  fontSize: '11',
  fontWeight: 'bold',
  color: 'onSurfaceVariant',
  letterSpacing: '[0.5px]',
  textTransform: 'uppercase',
  flexShrink: '[0]',
  width: '[60px]',
});

export const reauthValue = css({
  fontSize: '13',
  color: 'onSurface',
  fontWeight: 'medium',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '1',
  minWidth: '0',
});

/* Footer */
export const footer = css({
  mt: '8',
});

/* Language popup */
export const langBackdrop = css({
  position: 'fixed',
  inset: '0',
  bg: 'surfaceContainerLowest',
  opacity: '0_8',
  zIndex: '50',
  backdropFilter: '[blur(8px)]',
});

export const langPopup = css({
  position: 'fixed',
  top: '[50%]',
  left: '[50%]',
  transform: 'translate3d(-50%, -50%, 0)',
  zIndex: '60',
  width: 'full',
  maxWidth: '[320px]',
  bg: 'surface',
  borderRadius: '3xl',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  boxShadow: '[0_25px_50px_-12px_rgba(0,0,0,0.5)]',
  overflow: 'hidden',
});

export const langPopupHeader = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '5',
  py: '4',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'outlineVariant',
});

export const langPopupTitle = css({
  fontSize: '15',
  fontWeight: 'semibold',
  color: 'onSurface',
});

export const langPopupClose = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '8',
  height: '8',
  borderRadius: 'xl',
  bg: 'surfaceContainer',
  color: 'onSurfaceVariant',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  transitionDuration: '150',
  transitionProperty: '[background-color, color]',
  _hover: {
    bg: 'surfaceContainerHigh',
    color: 'onSurface',
  },
});

export const langPopupCloseIcon = css({
  width: '4',
  height: '4',
});

export const langPopupBody = css({
  p: '4',
});

export const langPopupOptions = css({
  display: 'grid',
  gap: '2',
});

export const langPopupOption = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  px: '4',
  py: '3',
  borderRadius: 'xl',
  fontSize: '14',
  fontWeight: 'medium',
  color: 'onSurface',
  bg: 'surfaceContainer',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  cursor: 'pointer',
  transitionDuration: '150',
  transitionProperty: '[background-color, border-color, color]',
  _hover: {
    bg: 'surfaceContainerHigh',
  },
});

export const langPopupOptionActive = css({
  color: 'onPrimary',
  bg: 'primary',
  borderColor: 'primary',
  _hover: {
    bg: 'primary',
    color: 'onPrimary',
  },
});

/* Utility */
export const fullWidth = css({ width: 'full' });
export const icon3_5 = css({ height: '3_5', width: '3_5' });
export const icon5 = css({ height: '5', width: '5' });
export const spinner = css({ animation: '[spin 1s {easings.linear} infinite]' });

/* Stack gaps */
export const stack5 = css({ display: 'grid', gap: '5' });
export const stack4 = css({ display: 'grid', gap: '4' });
export const stack3 = css({ display: 'grid', gap: '3' });
