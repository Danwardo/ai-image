
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function resizeImage(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const ratio = width / height;
      const targetRatio = targetWidth / targetHeight;

      if (ratio > targetRatio) {
        // Source is wider than target
        width = targetWidth;
        height = targetWidth / ratio;
      } else {
        // Source is taller than target
        height = targetHeight;
        width = targetHeight * ratio;
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function resizeImageToMax(
  dataUrl: string, 
  maxDimension: number = 1536,
  quality: number = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Compress to high-quality JPEG to drastically reduce upload size and accelerate processing
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}


export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start
    .replace(/-+$/, '');       // Trim - from end
}

export function generateSeoFilename(keywords: string, originalName: string, index: number, isWeb: boolean): string {
  const base = keywords || originalName.split('.')[0];
  const suffix = isWeb ? '-web' : '-full';
  return `${base}-${index + 1}${suffix}.jpg`;
}
