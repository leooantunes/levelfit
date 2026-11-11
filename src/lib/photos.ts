import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  allowsEditing: true,
  aspect: [4, 5],
};

export async function takeProofPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Precisamos da câmera para registrar a prova 📸');
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return result.canceled ? null : result.assets[0].uri;
}

export async function pickProofPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : result.assets[0].uri;
}

/** Copia a foto (que vem de um cache temporário) para a pasta permanente do app. */
export function persistPhoto(uri: string, id: string): string {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'proofs');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${id}.jpg`);
  if (dest.exists) dest.delete();
  new File(uri).copy(dest);
  return dest.uri;
}

export function deleteLocalPhoto(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignorar
  }
}
