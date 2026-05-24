import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) {
    return;
  }

  Font.register({
    family: 'Inter',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-400-normal.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-600-normal.ttf',
        fontWeight: 600,
      },
      {
        src: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-700-normal.ttf',
        fontWeight: 700,
      },
    ],
  });

  fontsRegistered = true;
}
