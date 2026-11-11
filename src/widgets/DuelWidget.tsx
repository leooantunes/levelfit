import type { DuelWidgetProps } from './types';

/** Web/fallback: widgets só existem em iOS e Android. */
const DuelWidget = {
  updateSnapshot(_props: DuelWidgetProps) {},
  reload() {},
};

export default DuelWidget;
