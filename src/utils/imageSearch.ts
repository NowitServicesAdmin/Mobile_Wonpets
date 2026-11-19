import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VisualSearchResult, VisualSearchScope, sharedService } from '../services/shared.service';
import { errorMessage } from '../services/api';
import { toast } from '../components/WonPetsAlert';

type Source = 'camera' | 'gallery';

const askSource = (): Promise<Source | null> =>
  new Promise((resolve) => {
    Alert.alert(
      'Search by photo',
      'Take a photo of a pet or product, or pick one from your gallery.',
      [
        { text: 'Take a photo', onPress: () => resolve('camera') },
        { text: 'Choose from gallery', onPress: () => resolve('gallery') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });

/**
 * "Search by photo" for the Store and Resell screens.
 *
 * Asks camera / gallery, uploads the photo and resolves with the backend result when
 * something in that inventory matches - the caller just puts `result.searchTerm` into
 * its search box. Resolves with null when the user cancels, nothing matched or it
 * failed; the user has already been told why (toast), so callers need no extra handling.
 */
export async function searchByPhoto(scope: VisualSearchScope): Promise<VisualSearchResult | null> {
  try {
    const from = await askSource();
    if (!from) return null;

    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(from === 'camera' ? 'Camera permission is needed to take a photo.' : 'Photo access is needed to pick an image.');
      return null;
    }

    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: false };
    const picked = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (picked.canceled || !picked.assets?.[0]?.uri) return null;

    toast.info('Looking for matches…');
    const r = await sharedService.visualSearch(picked.assets[0].uri, scope);
    if (!r.found) {
      const where = scope === 'resell' ? 'in Resell' : 'in the store';
      toast.error(r.identified?.label ? `No matches for "${r.identified.label}" ${where} right now.` : `No matches found ${where}.`);
      return null;
    }
    const extra = (r.items?.length ?? 0) - 1;
    if (extra > 0) toast.success(`Found ${extra + 1} items in your photo - showing "${r.searchTerm}", tap the others under the search bar`);
    else toast.success(r.similar ? `No exact match - showing similar: "${r.searchTerm}"` : `Showing results for "${r.searchTerm}"`);
    return r;
  } catch (e) {
    toast.error(errorMessage(e, 'Image search failed. Please try again.'));
    return null;
  }
}