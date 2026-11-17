/**
 * Health Connect: ao tocar em "política de privacidade" no diálogo de permissões, o sistema abre o app
 * com a intent ACTION_SHOW_PERMISSIONS_RATIONALE (até Android 13) ou VIEW_PERMISSION_USAGE (Android 14+).
 * O plugin do react-native-health-connect só manda essas intents para a MainActivity; aqui elas viram
 * o link levelfit://privacy, que o Expo Router abre na tela de privacidade (exigência do Google).
 */
const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// levelfit-health-rationale';

const HELPER = `
  ${MARKER}
  private fun routeHealthRationale(intent: android.content.Intent?) {
    val action = intent?.action ?: return
    if (action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" ||
        action == "android.intent.action.VIEW_PERMISSION_USAGE") {
      intent.action = android.content.Intent.ACTION_VIEW
      intent.data = android.net.Uri.parse("levelfit://privacy")
    }
  }

  override fun onNewIntent(intent: android.content.Intent) {
    routeHealthRationale(intent)
    super.onNewIntent(intent)
  }
`;

module.exports = function withHealthRationale(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (cfg.modResults.language !== 'kt') throw new Error('withHealthRationale: MainActivity em Kotlin esperada');
    if (src.includes(MARKER)) return cfg;

    const onCreate = /override fun onCreate\(savedInstanceState: Bundle\?\) \{\n/;
    if (!onCreate.test(src)) throw new Error('withHealthRationale: onCreate não encontrado na MainActivity');
    src = src.replace(onCreate, (m) => `${m}    routeHealthRationale(intent)\n`);

    const classOpen = /class MainActivity : ReactActivity\(\) \{\n/;
    if (!classOpen.test(src)) throw new Error('withHealthRationale: classe MainActivity não encontrada');
    src = src.replace(classOpen, (m) => m + HELPER);

    cfg.modResults.contents = src;
    return cfg;
  });
};
