export type DuelWidgetProps = {
  meName: string;
  meAvatar: string;
  mePoints: number;
  oppName: string;
  oppAvatar: string;
  oppPoints: number;
  /** Metas concluídas hoje pelo jogador do aparelho. */
  done: number;
  total: number;
  streak: number;
  status: string;
  weekLeader: string;
};

export const EMPTY_WIDGET_PROPS: DuelWidgetProps = {
  meName: 'Você',
  meAvatar: '💪',
  mePoints: 0,
  oppName: 'Rival',
  oppAvatar: '❔',
  oppPoints: 0,
  done: 0,
  total: 0,
  streak: 0,
  status: 'Abra o Level Fit para começar o duelo!',
  weekLeader: '',
};
