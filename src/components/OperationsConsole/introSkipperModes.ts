import type { Translations } from '~i18n';

import type { IntroSkipperMode } from '../../bindings';

export const INTRO_SKIPPER_MODES = (t: Translations) => [
  {
    description: t.settings.introSkipAutomaticDesc,
    label: t.settings.introSkipAutomatic,
    mode: 'automatic' as IntroSkipperMode,
  },
  {
    description: t.settings.introSkipManualDesc,
    label: t.settings.introSkipManual,
    mode: 'manual' as IntroSkipperMode,
  },
  {
    description: t.settings.introSkipOffDesc,
    label: t.settings.introSkipOff,
    mode: 'off' as IntroSkipperMode,
  },
];
