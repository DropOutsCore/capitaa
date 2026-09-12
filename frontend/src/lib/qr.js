import QRCode from 'qrcode';

// QR generation via the well-tested `qrcode` library. We render to an SVG
// string so it stays crisp at any size and matches the app's styling. Async
// because encoding is done off the main path.
export async function qrSvg(text, { size = 180, dark = '#0a0a0f', light = '#ffffff', margin = 2 } = {}) {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin,
    width: size,
    color: { dark, light },
  });
}

// Data-URL PNG variant (handy if an <img> is preferred over inline SVG).
export async function qrDataUrl(text, { size = 180, dark = '#0a0a0f', light = '#ffffff', margin = 2 } = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin,
    width: size,
    color: { dark, light },
  });
}
