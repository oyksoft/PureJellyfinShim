import { cx } from '@styled-system/css';
import { splitProps } from 'solid-js';
import type { JSX } from 'solid-js';

import * as styles from './ConsoleLayout.styles';

export interface ConsoleShellProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  children: JSX.Element;
}

/** Authenticated app outer shell: full-height flex column with responsive padding. */
export function ConsoleShell(props: ConsoleShellProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cx(styles.consoleShell, local.class)} {...rest}>
      {local.children}
    </div>
  );
}
