import sharp from "sharp";

const GAP_CSS_PX = 32;
const BACKGROUND = { r: 228, g: 228, b: 231, alpha: 1 }; // zinc-200, neutral separator

/**
 * Stacks individually-captured section screenshots into a single
 * presentation-ready image: same width, a neutral gap between each block so
 * the sections read as distinct pieces rather than one continuous scroll.
 */
export async function composeSections(
  sections: Buffer[],
  deviceScaleFactor: number,
): Promise<Buffer> {
  if (sections.length === 1) {
    return sections[0];
  }

  const gap = Math.round(GAP_CSS_PX * deviceScaleFactor);
  const metas = await Promise.all(sections.map((buffer) => sharp(buffer).metadata()));
  const width = Math.max(...metas.map((meta) => meta.width ?? 0));
  const contentHeight = metas.reduce((sum, meta) => sum + (meta.height ?? 0), 0);
  const height = contentHeight + gap * (sections.length + 1);

  const composites = [];
  let top = gap;
  for (let i = 0; i < sections.length; i++) {
    composites.push({ input: sections[i], top, left: 0 });
    top += (metas[i].height ?? 0) + gap;
  }

  return sharp({
    create: { width, height, channels: 4, background: BACKGROUND },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
