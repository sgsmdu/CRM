import { AdminSettings } from '../types';

export const BRAND_IMAGE_FIELDS = [
  'workshopLogoUrl',
  'rubberStampUrl',
  'pandiyanLogoUrl',
  'pandiyanRubberStampUrl',
  'quotationBackgroundUrl',
  'quotationHeaderImageUrl',
  'quotationFooterImageUrl',
] as const;

export type BrandImageField = (typeof BRAND_IMAGE_FIELDS)[number];

export const BRAND_DOC_SENTINEL = '__brand_doc__';

/** Inline data URLs larger than this threshold are offloaded to their own `settings/brand_<field>` doc. */
export const INLINE_IMAGE_MAX_CHARS = 35_000;

export type BrandImagePreset = 'logo' | 'stamp' | 'banner' | 'letterhead';

const PRESET_LIMITS: Record<BrandImagePreset, { maxW: number; maxH: number; targetMaxBytes: number }> = {
  logo: { maxW: 640, maxH: 280, targetMaxBytes: 180_000 },
  stamp: { maxW: 460, maxH: 460, targetMaxBytes: 180_000 },
  banner: { maxW: 1400, maxH: 420, targetMaxBytes: 260_000 },
  letterhead: { maxW: 1240, maxH: 1754, targetMaxBytes: 320_000 },
};

export function brandDocKey(field: BrandImageField): string {
  return `brand_${field}`;
}

/**
 * Splits AdminSettings into:
 * 1. `coreSettings` for `settings/admin_settings` (always lightweight, well under Firestore's 1MB doc limit)
 * 2. `brandDocs` for individual `settings/brand_<field>` documents
 */
export function splitAdminSettingsForFirestore(settings: AdminSettings): {
  coreSettings: AdminSettings;
  brandDocs: Record<BrandImageField, string>;
} {
  const coreSettings: any = { ...settings };
  const brandDocs = {} as Record<BrandImageField, string>;

  for (const field of BRAND_IMAGE_FIELDS) {
    const raw = (settings as any)[field];
    const val = typeof raw === 'string' ? raw : '';
    brandDocs[field] = val;

    if (val.length > INLINE_IMAGE_MAX_CHARS) {
      coreSettings[field] = BRAND_DOC_SENTINEL;
    } else {
      coreSettings[field] = val;
    }
  }

  return { coreSettings: coreSettings as AdminSettings, brandDocs };
}

/**
 * Merges `settings/admin_settings` with per-field `settings/brand_<field>` documents.
 * Backward compatible: if a brand doc does not exist yet in Firestore, preserves any legacy value from `coreSettings`.
 */
export function mergeAdminSettingsWithBrandDocs(
  localFallback: AdminSettings,
  coreSettings: Partial<AdminSettings> | null | undefined,
  brandDocs: Partial<Record<BrandImageField, { exists: boolean; value: string }>>
): AdminSettings {
  const merged: any = {
    ...localFallback,
    ...(coreSettings || {}),
  };

  for (const field of BRAND_IMAGE_FIELDS) {
    const docEntry = brandDocs[field];
    if (docEntry && docEntry.exists) {
      merged[field] = docEntry.value;
    } else {
      const coreVal = coreSettings ? (coreSettings as any)[field] : undefined;
      if (coreVal === BRAND_DOC_SENTINEL) {
        // Brand doc hasn't finished loading yet; keep whatever we currently have locally
        merged[field] = (localFallback as any)[field] || '';
      } else if (coreVal !== undefined) {
        merged[field] = coreVal;
      }
    }
  }

  return merged as AdminSettings;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the selected image file.'));
    img.src = src;
  });
}

/**
 * Resizes and optimizes an uploaded brand image (logo, rubber stamp, header/footer banner, letterhead)
 * on an offscreen canvas while preserving aspect ratio and alpha transparency so it prints crisply
 * on A4 and always fits safely within Firestore & localStorage limits.
 */
export async function optimizeBrandImage(file: File, preset: BrandImagePreset): Promise<string> {
  const { maxW, maxH, targetMaxBytes } = PRESET_LIMITS[preset];

  // Preserve small SVG vectors directly
  if (file.type === 'image/svg+xml' && file.size <= targetMaxBytes) {
    return readFileAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const naturalW = img.naturalWidth || img.width || maxW;
    const naturalH = img.naturalHeight || img.height || maxH;

    let scale = Math.min(1, maxW / naturalW, maxH / naturalH);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return readFileAsDataUrl(file);
    }

    const renderToCanvas = (s: number) => {
      const w = Math.max(1, Math.round(naturalW * s));
      const h = Math.max(1, Math.round(naturalH * s));
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
    };

    renderToCanvas(scale);

    // 1. For logos and stamps, prefer PNG first (lossless transparency) if small enough
    if (preset === 'logo' || preset === 'stamp') {
      const png = canvas.toDataURL('image/png');
      if (png.length <= targetMaxBytes) {
        return png;
      }
      // 2. Try WebP (supports full alpha transparency and is 4-6x smaller)
      for (const q of [0.9, 0.82, 0.72]) {
        const webp = canvas.toDataURL('image/webp', q);
        if (webp.startsWith('data:image/webp') && webp.length <= targetMaxBytes) {
          return webp;
        }
      }
      // 3. Gently step down dimensions if still large
      for (const factor of [0.8, 0.65, 0.5]) {
        renderToCanvas(scale * factor);
        const webp = canvas.toDataURL('image/webp', 0.8);
        if (webp.startsWith('data:image/webp') && webp.length <= targetMaxBytes) {
          return webp;
        }
        const smallerPng = canvas.toDataURL('image/png');
        if (smallerPng.length <= targetMaxBytes) {
          return smallerPng;
        }
      }
      return canvas.toDataURL('image/png');
    }

    // For full-width banners & A4 letterheads: try WebP, then JPEG (white bg), then PNG
    const hasAlphaFormat = file.type === 'image/png' || file.type === 'image/webp';
    for (const q of [0.88, 0.78, 0.68]) {
      const webp = canvas.toDataURL('image/webp', q);
      if (webp.startsWith('data:image/webp') && webp.length <= targetMaxBytes) {
        return webp;
      }
    }

    if (!hasAlphaFormat) {
      for (const q of [0.86, 0.75, 0.65]) {
        const jpg = canvas.toDataURL('image/jpeg', q);
        if (jpg.length <= targetMaxBytes) {
          return jpg;
        }
      }
    }

    // Step down slightly if still above target
    for (const factor of [0.8, 0.65]) {
      renderToCanvas(scale * factor);
      const webp = canvas.toDataURL('image/webp', 0.78);
      if (webp.startsWith('data:image/webp') && webp.length <= targetMaxBytes) {
        return webp;
      }
      const jpg = canvas.toDataURL('image/jpeg', 0.8);
      if (jpg.length <= targetMaxBytes) {
        return jpg;
      }
    }

    return canvas.toDataURL('image/jpeg', 0.75);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
