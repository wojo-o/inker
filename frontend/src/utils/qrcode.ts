/**
 * QR Code Generator Utility
 * Generates QR codes as data URLs without external dependencies.
 * Uses the QR Server API for reliable QR code generation.
 */

/**
 * Generate a QR code image URL from content
 * Uses the QR Server API which is free and reliable
 */
export function generateQRCodeUrl(
  content: string,
  size: number = 200,
  options: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    backgroundColor?: string;
    foregroundColor?: string;
  } = {}
): string {
  const {
    errorCorrection = 'M',
    margin = 1,
    backgroundColor = 'ffffff',
    foregroundColor = '000000',
  } = options;

  // Use QR Server API - free, reliable, no API key needed
  const url = new URL('https://api.qrserver.com/v1/create-qr-code/');
  url.searchParams.set('data', content); // API handles encoding
  url.searchParams.set('size', `${size}x${size}`);
  url.searchParams.set('ecc', errorCorrection);
  url.searchParams.set('margin', margin.toString());
  url.searchParams.set('bgcolor', backgroundColor);
  url.searchParams.set('color', foregroundColor);
  url.searchParams.set('format', 'png');

  return url.toString();
}

/**
 * Alternative: Generate QR code using Google Charts API (also free)
 */
export function generateQRCodeUrlGoogle(
  content: string,
  size: number = 200
): string {
  const encodedContent = encodeURIComponent(content);
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedContent}&choe=UTF-8`;
}
