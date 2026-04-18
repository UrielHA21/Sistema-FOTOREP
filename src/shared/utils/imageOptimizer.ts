import imageCompression from 'browser-image-compression';

export type CompressionLevel = 'original' | 'light' | 'max';

export function getCompressionOptions(level: CompressionLevel) {
  switch (level) {
    case 'light':
      return {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8
      };
    case 'max':
      return {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        initialQuality: 0.6
      };
    case 'original':
    default:
      return null;
  }
}

export async function optimizeImage(file: File, level: CompressionLevel): Promise<File> {
   const options = getCompressionOptions(level);
   if (!options) return file; // Retorna original

   try {
       const compressedFile = await imageCompression(file, options);
       return compressedFile;
   } catch (error) {
       console.error("Fallo la compresión local de imagen:", error);
       return file; // Fallback por seguridad a original
   }
}
