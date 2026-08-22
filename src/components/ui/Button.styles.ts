import { css, cva } from '@styled-system/css';

const focusRing = {
  outline: '[2px solid {colors.primary}]',
  outlineOffset: '[2px]',
} as const;

export const button = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    border: 0,
    cursor: 'pointer',
    textDecoration: 'none',
    transform: '[scale3d(1, 1, 1)]',
    transitionDuration: '200',
    transitionProperty: '[background-color, border-color, color, box-shadow, filter, transform]',
    userSelect: 'none',
    verticalAlign: 'middle',
    _disabled: {
      opacity: '[0.5]',
      pointerEvents: 'none',
    },
    _focusVisible: focusRing,
  },
  variants: {
    size: {
      sm: {
        borderRadius: 'lg',
        fontSize: '11',
        gap: '1',
        lineHeight: '14',
        minHeight: '7',
        padding: '[0.4em 0.6em]',
      },
      md: {
        borderRadius: 'xl',
        fontSize: '12',
        gap: '1_5',
        lineHeight: '16',
        minHeight: '8',
        padding: '[0.6em 0.9em]',
      },
      lg: {
        borderRadius: '2xl',
        fontSize: '13',
        gap: '2',
        lineHeight: '20',
        minHeight: '9',
        padding: '[0.75em 1em]',
      },
    },
    variant: {
      primary: {
        bg: 'primary',
        color: 'onPrimary',
        _hover: {
          filter: '[brightness(1.1)]',
        },
        _active: {
          transform: '[translateY(0) scale3d(0.96, 0.96, 1)]',
        },
      },
      secondary: {
        bg: 'surfaceContainerHigh',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant',
        color: 'onSurface',
        _hover: {
          bg: 'surfaceContainerHighest',
        },
        _active: {
          transform: '[translateY(0) scale3d(0.96, 0.96, 1)]',
        },
      },
      tonal: {
        bg: 'surfaceContainerHigh',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant',
        color: 'onSurface',
        _hover: {
          bg: 'surfaceContainerHighest',
        },
        _active: {
          transform: '[translateY(0) scale3d(0.96, 0.96, 1)]',
        },
      },
      outlined: {
        bg: '[transparent]',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant',
        color: '[#e8eaed]',
        _hover: {
          bg: 'surfaceContainerHigh',
          borderColor: 'primary',
        },
        _active: {
          transform: '[scale3d(0.96, 0.96, 1)]',
        },
      },
      danger: {
        bg: '[#dc2626]',
        color: '[white]',
        _hover: {
          bg: '[#ef4444]',
        },
        _active: {
          transform: '[translateY(0) scale3d(0.96, 0.96, 1)]',
        },
      },
      text: {
        bg: '[transparent]',
        color: 'primary',
        _hover: {
          bg: 'primary/10',
        },
        _active: {
          transform: '[scale3d(0.96, 0.96, 1)]',
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

export const iconButton = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'onSurfaceVariant',
    bg: '[transparent]',
    border: 0,
    cursor: 'pointer',
    padding: '0',
    transform: '[scale3d(1, 1, 1)]',
    transitionDuration: '200',
    transitionProperty: '[background-color, color, transform]',
    userSelect: 'none',
    _disabled: {
      opacity: '[0.5]',
      pointerEvents: 'none',
    },
    _focusVisible: focusRing,
    _hover: {
      bg: 'primary/10',
      color: 'onSurface',
    },
    _active: {
      transform: '[scale3d(0.96, 0.96, 1)]',
    },
  },
  variants: {
    size: {
      sm: {
        borderRadius: 'lg',
        height: '7',
        minHeight: '7',
        minWidth: '7',
        width: '7',
      },
      md: {
        borderRadius: 'xl',
        height: '8',
        minHeight: '8',
        minWidth: '8',
        width: '8',
      },
      lg: {
        borderRadius: '2xl',
        height: '9',
        minHeight: '9',
        minWidth: '9',
        width: '9',
      },
      row: {
        borderRadius: 'xl',
        gap: '2',
        height: 'auto',
        minHeight: '9',
        minWidth: '[0]',
        padding: '2',
        width: 'full',
        _hover: {
          bg: 'surfaceContainerHigh',
          color: 'onSurfaceVariant',
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const buttonIcon = css({
  alignItems: 'center',
  display: 'inline-flex',
  flexShrink: '[0]',
  height: '[1lh]',
  justifyContent: 'center',
  width: '[1lh]',
});
