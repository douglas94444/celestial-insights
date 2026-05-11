import { toPng } from "html-to-image";

const CARD_BG = "#0f0a1a";

const BASE_OPTS = {
  pixelRatio: 1,
  cacheBust: true,
  backgroundColor: CARD_BG,
} satisfies NonNullable<Parameters<typeof toPng>[1]>;

async function waitFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

function waitTwoFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function toPngBlob(
  el: HTMLElement,
  overrides: Partial<NonNullable<Parameters<typeof toPng>[1]>> = {},
): Promise<Blob> {
  const dataUrl = await toPng(el, { ...BASE_OPTS, ...overrides });
  const res = await fetch(dataUrl);
  return res.blob();
}

async function serializeSvgsToImages(el: HTMLElement): Promise<() => void> {
  const svgEls = Array.from(el.querySelectorAll("svg"));
  const restoreFns: Array<() => void> = [];
  for (const svg of svgEls) {
    const parent = svg.parentElement;
    if (!parent) continue;
    const w = svg.clientWidth || 420;
    const h = svg.clientHeight || 420;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.width = w;
    img.height = h;
    img.style.display = "block";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });
    URL.revokeObjectURL(url);
    parent.replaceChild(img, svg);
    restoreFns.push(() => parent.replaceChild(svg, img));
  }
  return () => restoreFns.forEach((fn) => fn());
}

export async function captureMomentShareCardPng(
  el: HTMLElement,
  opts: { pixelRatio?: 1 | 2; backgroundColor?: string } = {},
): Promise<Blob> {
  const { pixelRatio = 1, backgroundColor = CARD_BG } = opts;
  await waitFonts();
  await waitTwoFrames();
  await delay(60);
  const restoreSvgs = await serializeSvgsToImages(el);
  try {
    return await toPngBlob(el, { pixelRatio, backgroundColor });
  } catch {
    return await toPngBlob(el, { pixelRatio, backgroundColor, skipFonts: true });
  } finally {
    restoreSvgs();
  }
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function sharePngIfPossible(
  blob: Blob,
  filename: string,
  title: string,
): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  if (!nav.share) return false;
  const data: ShareData = { files: [file], title };
  if (nav.canShare && !nav.canShare(data)) return false;
  try {
    await nav.share(data);
    return true;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return true;
    return false;
  }
}
