import { css, cva } from '@styled-system/css';

export const page = css({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 'full',
  bg: 'background',
  position: 'relative',
  overflow: 'hidden',
  zIndex: '[1]',
});

export const ambientBg = css({
  position: 'fixed',
  top: '[-200px]',
  left: '[50%]',
  transform: 'translateX(-50%)',
  width: '[600px]',
  height: '[600px]',
  borderRadius: 'full',
  bg: 'primary',
  opacity: '0_04',
  filter: '[blur(120px)]',
  pointerEvents: 'none',
  zIndex: '0',
});

export const ambientBg2 = css({
  position: 'fixed',
  bottom: '[-100px]',
  right: '[-100px]',
  width: '[400px]',
  height: '[400px]',
  borderRadius: 'full',
  bg: 'tertiary',
  opacity: '0_03',
  filter: '[blur(80px)]',
  pointerEvents: 'none',
  zIndex: '0',
});

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

export const headerActions = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
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
  transitionProperty: '[background-color, color, border-color, transform]',
  transform: 'none',
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

export const refreshButton = css({
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
  transitionProperty: '[background-color, color, border-color, transform]',
  transform: 'none',
  _hover: {
    bg: 'surfaceContainerHigh',
    borderColor: 'primary',
    color: 'primary',
  },
  _active: {
    transform: '[scale3d(0.95, 0.95, 1)]',
  },
  _disabled: {
    opacity: '[0.5]',
    cursor: 'not-allowed',
    _hover: {
      bg: 'surfaceContainer',
      borderColor: 'outlineVariant',
      color: 'onSurfaceVariant',
    },
  },
});

export const refreshIcon = cva({
  base: {
    width: '5',
    height: '5',
  },
  variants: {
    spinning: {
      true: {
        animation: '[spin 1s {easings.linear} infinite]',
      },
    },
  },
  defaultVariants: {
    spinning: false,
  },
});

export const content = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6',
  px: '8',
  pb: '10',
  flex: '1',
  position: 'relative',
  zIndex: '10',
});

export const statusSection = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4',
  pt: '4',
});

export const statusRing = css({
  width: '20',
  height: '20',
  borderRadius: 'full',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
});

export const statusRingOuter = css({
  position: 'absolute',
  inset: '0',
  borderRadius: 'full',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'tertiary',
  opacity: '0_3',
});

export const statusRingPulse = css({
  position: 'absolute',
  inset: '[-4px]',
  borderRadius: 'full',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'tertiary',
  opacity: '0_1',
  // Play once on mount, stay at final state. No infinite loop = no CPU drain.
  animation: '[ping 2s cubic-bezier(0, 0, 0.2, 1) forwards]',
});

export const statusIcon = css({
  width: '10',
  height: '10',
  color: 'tertiary',
});

export const statusIconLoading = css({
  width: '10',
  height: '10',
  color: 'onSurfaceVariant',
  animation: '[spin 1.5s {easings.linear} infinite]',
});

export const statusIconError = css({
  width: '10',
  height: '10',
  color: 'error',
});

export const statusTitle = css({
  fontSize: '28',
  fontWeight: 'bold',
  color: 'onBackground',
  letterSpacing: '[-0.5px]',
  textAlign: 'center',
});

export const statusDesc = css({
  fontSize: '14',
  color: 'onSurfaceVariant',
  textAlign: 'center',
  maxWidth: '[480px]',
  lineHeight: 'relaxed',
});

export const reconnectButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'full',
  maxWidth: '[260px]',
  px: '8',
  py: '3',
  borderRadius: 'full',
  bg: 'primary',
  color: 'onPrimary',
  fontSize: '15',
  fontWeight: 'semibold',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'primary',
  transitionDuration: '200',
  transitionProperty: '[background-color, transform]',
  transform: 'none',
  _hover: {
    bg: 'primary/90',
    borderColor: 'primary/90',
  },
  _active: {
    transform: '[scale3d(0.97, 0.97, 1)]',
  },
  _disabled: {
    opacity: '[0.5]',
    cursor: 'not-allowed',
  },
});

export const servicesSection = css({
  width: 'full',
  maxWidth: '[420px]',
});

export const sectionHeader = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: '4',
});

export const sectionTitle = css({
  fontSize: '11',
  fontWeight: 'semibold',
  color: '[#e8eaed]',
  letterSpacing: '20',
  textTransform: 'uppercase',
});

export const servicesList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  listStyle: 'none',
  p: '0',
  m: '0',
});

export const serviceItem = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  px: '5',
  py: '4',
  bg: 'surfaceContainer',
  borderRadius: '2xl',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  transitionDuration: '200',
  transitionProperty: '[background-color, border-color]',
  _hover: {
    bg: 'surfaceContainerHigh',
    borderColor: 'primary',
  },
});

export const serviceAvatar = css({
  width: '10',
  height: '10',
  borderRadius: 'xl',
  bg: 'surfaceContainerHighest',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'onSurfaceVariant',
  fontSize: '13',
  fontWeight: 'semibold',
  flexShrink: '0',
});

export const serviceInfo = css({
  flex: '1',
  minWidth: '0',
});

export const serviceName = css({
  fontSize: '15',
  fontWeight: 'medium',
  color: 'onSurface',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const serviceUser = css({
  fontSize: '12',
  color: '[#e8eaed]',
  marginTop: '1',
});

export const activeBadge = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  fontSize: '10',
  fontWeight: 'semibold',
  color: 'tertiary',
  bg: 'tertiaryContainer',
  borderRadius: 'full',
  px: '2_5',
  py: '1',
  letterSpacing: '[0.5px]',
  flexShrink: '0',
});

export const hint = css({
  fontSize: '12',
  color: 'onSurfaceVariant',
  textAlign: 'center',
  opacity: '0.7',
});

/* Dialog */
export const dialogBackdrop = css({
  position: 'fixed',
  inset: '0',
  bg: 'surfaceContainerLowest',
  opacity: '0_9',
  zIndex: '50',
  backdropFilter: '[blur(8px)]',
  _after: {
    content: '""',
    position: 'absolute',
    top: '[-100px]',
    left: '[50%]',
    transform: 'translate3d(-50%, 0, 0)',
    width: '[500px]',
    height: '[500px]',
    borderRadius: 'full',
    bg: 'primary',
    opacity: '0_06',
    filter: '[blur(100px)]',
    pointerEvents: 'none',
  },
  _before: {
    content: '""',
    position: 'absolute',
    bottom: '[-80px]',
    right: '[10%]',
    width: '[350px]',
    height: '[350px]',
    borderRadius: 'full',
    bg: 'tertiary',
    opacity: '0_04',
    filter: '[blur(80px)]',
    pointerEvents: 'none',
  },
});

export const dialogOverlay = css({
  position: 'fixed',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '60',
  p: '6',
});

export const dialogContent = css({
  bg: 'surfaceContainerLow',
  borderRadius: '3xl',
  boxShadow: '[0_25px_50px_-12px_rgba(0,0,0,0.5)]',
  width: 'full',
  maxWidth: '[900px]',
  maxHeight: '[85vh]',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  position: 'relative',
  _after: {
    content: '""',
    position: 'absolute',
    top: '[30%]',
    left: '[50%]',
    transform: 'translate3d(-50%, -50%, 0)',
    width: '[600px]',
    height: '[600px]',
    borderRadius: 'full',
    bg: 'primary',
    opacity: '0_03',
    filter: '[blur(120px)]',
    pointerEvents: 'none',
    zIndex: '0',
  },
});

export const dialogHeader = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '6',
  py: '5',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'outlineVariant',
  flexShrink: '0',
  position: 'relative',
  zIndex: '[1]',
});

export const dialogTitle = css({
  fontSize: '18',
  fontWeight: 'semibold',
  color: 'onSurface',
});

export const closeButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '9',
  height: '9',
  borderRadius: 'xl',
  bg: 'surfaceContainer',
  color: 'onSurfaceVariant',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  transitionDuration: '150',
  transitionProperty: '[background-color, color, border-color]',
  _hover: {
    bg: 'surfaceContainerHigh',
    borderColor: 'error',
    color: 'error',
  },
});

export const closeIcon = css({
  width: '5',
  height: '5',
});

export const dialogBody = css({
  flex: '1',
  overflow: 'auto',
  minHeight: '0',
  position: 'relative',
  zIndex: '[1]',
});
