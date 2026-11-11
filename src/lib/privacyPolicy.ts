/**
 * Política de privacidade do Level Fit. A mesma versão está em docs/privacy-policy.md
 * para publicar numa URL pública (exigida no App Store Connect). Mudou aqui, mude lá.
 */
export const PRIVACY_UPDATED_AT = '11 de novembro de 2026';

export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Quem somos',
    body: 'O Level Fit é um app de duelos de hábitos saudáveis entre amigos. Esta política explica quais dados o app usa, para quê e como você controla esses dados.',
  },
  {
    title: 'Dados que coletamos',
    body:
      '• Conta: e-mail e senha (a senha é guardada criptografada pelo nosso provedor de login; nós não temos acesso a ela).\n' +
      '• Perfil: nome ou apelido, avatar e cor que você escolhe.\n' +
      '• Duelos: nome do duelo, metas escolhidas, aposta (texto livre) e o rival.\n' +
      '• Provas: as fotos que você tira ou escolhe, a observação opcional, a data, as reações e contestações.\n' +
      '• Assinatura: se você assina o Premium, recebemos da loja (App Store ou Google Play), por meio do RevenueCat, o status e a validade da assinatura. Não recebemos dados do seu cartão.\n' +
      '• Denúncias e bloqueios que você fizer.',
  },
  {
    title: 'Dados de saúde e do relógio',
    body:
      'Só se você ligar "Relógio" em Minha conta, o app lê do Apple Health (iPhone) ou do Health Connect (Android): passos, treinos, sono, meditação e tempo ao ar livre. A leitura acontece no seu celular. Quando você bate uma meta, só o resultado do dia (ex.: "10.432 passos") vai para o servidor como prova e aparece para o seu rival no duelo.\n' +
      'Não guardamos o histórico de saúde, não gravamos nada no Apple Health ou no Health Connect, não usamos esses dados para anúncios ou marketing e não os vendemos nem compartilhamos com terceiros. Você desliga quando quiser em Minha conta e pode revogar a permissão nos ajustes do Saúde ou do Health Connect.',
  },
  {
    title: 'Para que usamos',
    body: 'Só para o app funcionar: entrar na sua conta, mostrar seus duelos, placar e provas para você e seu rival, liberar o Premium, analisar denúncias e impedir duelos com quem você bloqueou. Não vendemos seus dados, não mostramos anúncios e não rastreamos você em outros apps ou sites.',
  },
  {
    title: 'Quem vê suas fotos',
    body: 'Suas provas ficam num armazenamento privado e só aparecem para quem participa do mesmo duelo. Se uma prova for denunciada, a equipe do Level Fit pode vê-la para analisar a denúncia.',
  },
  {
    title: 'Permissões do celular',
    body: 'Câmera e fotos: só quando você vai registrar uma prova. Saúde (Apple Health / Health Connect): só se você conectar o relógio. Notificações: lembretes diários criados no próprio aparelho, que você desliga em Minha conta. Você pode negar qualquer permissão e continuar usando o resto do app.',
  },
  {
    title: 'Serviços de terceiros',
    body:
      '• Supabase: hospeda contas, duelos e fotos.\n' +
      '• RevenueCat, Apple e Google: processam a assinatura Premium.\n' +
      '• Apple Health e Health Connect: de onde o app lê os dados do relógio, no próprio celular.\n' +
      'Esses serviços tratam os dados só para prestar o serviço ao Level Fit.',
  },
  {
    title: 'Por quanto tempo guardamos',
    body: 'Enquanto sua conta existir. Ao excluir uma prova, a foto é apagada. Ao bloquear alguém, suas provas naquele duelo são apagadas. Ao excluir a conta, apagamos sua conta, suas provas e fotos e os duelos em que você joga sozinho.',
  },
  {
    title: 'Seus direitos',
    body: 'Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados. Você corrige o perfil em Minha conta e exclui tudo em Minha conta → Excluir minha conta, a qualquer momento, sem precisar falar com a gente.',
  },
  {
    title: 'Crianças',
    body: 'O Level Fit não é destinado a menores de 13 anos.',
  },
  {
    title: 'Mudanças nesta política',
    body: 'Se a política mudar, atualizamos a data acima e avisamos no app quando a mudança for importante.',
  },
];
