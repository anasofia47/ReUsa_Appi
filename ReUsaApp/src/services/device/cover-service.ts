import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { Repositories } from '@/db/repositories';
import type { ApiClient } from '@/services/api/client';
import type { Book, Item } from '@/types';

export type CoverSource = 'camera' | 'library';

/** La API acepta hasta 700 000 caracteres en base64 (~520 KB de imagen). */
export const MAX_BASE64_LENGTH = 700_000;
const COVER_WIDTH = 600;
const QUALITIES = [0.7, 0.5, 0.35, 0.2];

export class PermissionDeniedError extends Error {
  constructor(readonly canAskAgain: boolean) {
    super('Permiso de cámara denegado');
    this.name = 'PermissionDeniedError';
  }
}

export class ImageTooLargeError extends Error {
  constructor() {
    super('La imagen es demasiado grande incluso después de comprimirla');
    this.name = 'ImageTooLargeError';
  }
}

export interface PickedCover {
  base64: string;
  contentType: 'image/jpeg';
}

export async function pickCover(
  source: CoverSource,
  activity: Pick<Repositories['activity'], 'log'>,
): Promise<PickedCover | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    await activity.log('cover.permission', `cámara: ${permission.status}`);
    if (!permission.granted) throw new PermissionDeniedError(permission.canAskAgain);
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets || result.assets.length === 0) {
    await activity.log('cover.pick', `${source}: cancelado`);
    return null;
  }

  const asset = result.assets[0];

  for (const compress of QUALITIES) {
    const manipResult = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: COVER_WIDTH } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    if (manipResult.base64 && manipResult.base64.length <= MAX_BASE64_LENGTH) {
      await activity.log(
        'cover.pick',
        `${source}: ${Math.round(manipResult.base64.length / 1024)} KB base64, calidad ${compress}`,
      );
      return { base64: manipResult.base64, contentType: 'image/jpeg' };
    }
  }

  await activity.log('cover.pick', `${source}: imagen demasiado grande`);
  throw new ImageTooLargeError();
}

/** Sube la portada o foto del libro / objeto a la API. */
export async function uploadCover(
  api: Pick<ApiClient, 'put'>,
  activity: Pick<Repositories['activity'], 'log'>,
  bookId: string,
  cover: PickedCover,
): Promise<Book> {
  try {
    const { book } = await api.put<{ book: Book }>(`/api/books/${bookId}/cover`, {
      contentType: cover.contentType,
      data: cover.base64,
    });
    await activity.log('cover.upload', `OK libro ${bookId}`);
    return book;
  } catch (err) {
    await activity.log('cover.upload', `ERROR libro ${bookId}: ${(err as Error).name}`);
    throw err;
  }
}

/** Sube la foto de un objeto ReUsa. */
export async function uploadItemPhoto(
  api: Pick<ApiClient, 'put'>,
  activity: Pick<Repositories['activity'], 'log'>,
  itemId: string,
  cover: PickedCover,
): Promise<Item> {
  try {
    const { item } = await api.put<{ item: Item }>(`/api/items/${itemId}/cover`, {
      contentType: cover.contentType,
      data: cover.base64,
    });
    await activity.log('cover.upload', `OK objeto ${itemId}`);
    return item;
  } catch (err) {
    await activity.log('cover.upload', `ERROR objeto ${itemId}: ${(err as Error).name}`);
    throw err;
  }
}
