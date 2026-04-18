import cfeLogo from '../../assets/CFE_icono.png';

/**
 * Fetches the bundled CFE logo asset and converts it to a clean Base64 string
 * (without the "data:image/png;base64," prefix), ready to be sent to the
 * Cloud Function as part of the PDF payload.
 */
export async function getLogoBase64(): Promise<string> {
  const response = await fetch(cfeLogo);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el logo CFE: ${response.status}`);
  }
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URI prefix → "data:image/png;base64,<actual_base64>"
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('FileReader no pudo extraer el Base64 del logo.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
