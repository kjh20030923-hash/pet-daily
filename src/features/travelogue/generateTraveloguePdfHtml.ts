export type TraveloguePdfPhoto = {
  url: string;
  date: string;
  location: string;
  colorDot: string;
};

const ROTATIONS = [-2.8, 1.6, -1.1, 3.2, -3.7, 0.9, 2.4, -2.1] as const;
const DEFAULT_DOT_COLOR = '#C49A80';

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalizeColor = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : DEFAULT_DOT_COLOR;

const getPageSizes = (photoCount: number) => {
  const sizes: number[] = [];
  let remaining = photoCount;

  while (remaining > 4) {
    // Avoid leaving a single photo alone on the final page.
    const size = remaining - 4 === 1 ? 3 : 4;
    sizes.push(size);
    remaining -= size;
  }
  if (remaining > 0) sizes.push(remaining);
  return sizes;
};

const paginate = (photos: TraveloguePdfPhoto[]) => {
  const pages: TraveloguePdfPhoto[][] = [];
  let cursor = 0;
  for (const pageSize of getPageSizes(photos.length)) {
    pages.push(photos.slice(cursor, cursor + pageSize));
    cursor += pageSize;
  }
  return pages;
};

const renderPhoto = (photo: TraveloguePdfPhoto, pageSize: number, slot: number, globalIndex: number) => {
  const rotation = ROTATIONS[globalIndex % ROTATIONS.length];
  const location = escapeHtml(photo.location);
  const date = escapeHtml(photo.date);
  const imageUrl = escapeHtml(photo.url);
  const dotColor = normalizeColor(photo.colorDot);

  return `
    <figure
      class="polaroid count-${pageSize} slot-${slot}"
      style="--rotation: ${rotation}deg; transform: rotate(${rotation}deg);"
    >
      <span class="color-dot" style="background-color: ${dotColor};"></span>
      <img class="photo" src="${imageUrl}" alt="${location}" />
      <figcaption class="caption">
        <span class="caption-line">${location} · ${date}</span>
      </figcaption>
    </figure>`;
};

/**
 * Creates a complete, print-ready A4 scrapbook document.
 * The output can be passed directly to an HTML-to-PDF renderer.
 */
export const generateTraveloguePdfHtml = (photos: TraveloguePdfPhoto[]): string => {
  const pages = paginate(photos);
  let globalIndex = 0;

  const pageMarkup = pages.length > 0
    ? pages.map((page, pageIndex) => {
      const photosMarkup = page.map((photo, slot) => {
        const markup = renderPhoto(photo, page.length, slot, globalIndex);
        globalIndex += 1;
        return markup;
      }).join('');

      return `
      <section class="pdf-page">
        <header class="page-header">
          <span class="page-kicker">PET TRAVELOGUE</span>
          <h1>宠物游记</h1>
          <span class="page-number">${String(pageIndex + 1).padStart(2, '0')}</span>
        </header>
        <div class="scrapbook count-${page.length}">${photosMarkup}</div>
      </section>`;
    }).join('')
    : `
      <section class="pdf-page empty-page">
        <div class="empty-copy">
          <span>PET TRAVELOGUE</span>
          <h1>宠物游记</h1>
          <p>还没有照片回忆</p>
        </div>
      </section>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>宠物游记</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #FAF8F2;
      color: #35251F;
      font-family: "Handwriting", "Kaiti SC", "STKaiti", "KaiTi", "PingFang SC", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-page {
      position: relative;
      width: 170mm;
      height: 257mm;
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      background:
        radial-gradient(circle at 13% 18%, rgba(196,154,128,0.07) 0 1mm, transparent 1.1mm),
        radial-gradient(circle at 88% 72%, rgba(168,177,162,0.08) 0 0.8mm, transparent 0.9mm),
        #FAF8F2;
    }

    .pdf-page:last-child { break-after: auto; page-break-after: auto; }

    .page-header {
      position: relative;
      height: 25mm;
      border-bottom: 0.25mm solid rgba(51,45,43,0.10);
    }

    .page-kicker {
      display: block;
      padding-top: 1mm;
      color: #74452F;
      font-family: "PingFang SC", sans-serif;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.18em;
    }

    h1 { margin: 2.5mm 0 0; font-size: 21pt; font-weight: 700; }

    .page-number {
      position: absolute;
      right: 0;
      bottom: 4mm;
      color: #8A8480;
      font-family: "PingFang SC", sans-serif;
      font-size: 8pt;
    }

    .scrapbook { position: relative; width: 100%; height: 228mm; }

    .polaroid {
      position: absolute;
      margin: 0;
      padding: 4mm 4mm 0;
      background: #FFFFFF;
      border: 0.2mm solid #E4DDD4;
      box-shadow: 0 0.8mm 1.8mm rgba(53,37,31,0.04);
      transform-origin: center center;
      page-break-inside: avoid;
    }

    .photo { display: block; width: 100%; height: calc(100% - 20mm); object-fit: cover; background: #EEE9E3; }

    .caption {
      height: 20mm;
      padding: 5.5mm 1mm 2mm;
      overflow: hidden;
      text-align: center;
    }

    .caption-line { color: #4A4542; font-size: 11pt; line-height: 1.35; }

    .color-dot {
      position: absolute;
      z-index: 2;
      top: -2mm;
      left: 50%;
      width: 12px;
      height: 12px;
      margin-left: -6px;
      border: 1px solid rgba(255,255,255,0.72);
      border-radius: 50%;
      box-shadow: 0 1mm 2mm rgba(51,45,43,0.12);
    }

    /* One-photo fallback for very small exports. */
    .polaroid.count-1 { left: 31mm; top: 28mm; width: 108mm; height: 145mm; }

    /* Two-photo spread: generous diagonal rhythm. */
    .polaroid.count-2 { width: 76mm; height: 102mm; }
    .polaroid.count-2.slot-0 { left: 4mm; top: 18mm; }
    .polaroid.count-2.slot-1 { right: 3mm; top: 105mm; }

    /* Three-photo spread: one hero image and two supporting memories. */
    .polaroid.count-3.slot-0 { left: 3mm; top: 11mm; width: 82mm; height: 107mm; }
    .polaroid.count-3.slot-1 { right: 1mm; top: 23mm; width: 69mm; height: 88mm; }
    .polaroid.count-3.slot-2 { left: 52mm; top: 127mm; width: 73mm; height: 91mm; }

    /* Four-photo spread: offset pairs rather than a rigid grid. */
    .polaroid.count-4 { width: 69mm; height: 88mm; }
    .polaroid.count-4.slot-0 { left: 2mm; top: 9mm; }
    .polaroid.count-4.slot-1 { right: 4mm; top: 18mm; }
    .polaroid.count-4.slot-2 { left: 9mm; top: 119mm; }
    .polaroid.count-4.slot-3 { right: 0; top: 126mm; }

    .empty-page { display: flex; align-items: center; justify-content: center; text-align: center; }
    .empty-copy span { color: #74452F; font: 700 8pt "PingFang SC", sans-serif; letter-spacing: 0.18em; }
    .empty-copy h1 { margin-top: 4mm; }
    .empty-copy p { margin-top: 4mm; color: #8A8480; font-size: 11pt; }
  </style>
</head>
<body>${pageMarkup}
</body>
</html>`;
};

export default generateTraveloguePdfHtml;
