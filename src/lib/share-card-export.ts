import { toBlob } from "html-to-image";

const CARD_BG = "#0f0a1a";

const BASE_OPTS = {
  pixelRatio: 1,
  cacheBust: true,
  backgroundColor: CARD_BG,
} satisfies NonNullable<Parameters<typeof toBlob>[1]>;

type HtmlToImageOpts = Partial<NonNullable<Parameters<typeof toBlob>[1]>>;

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

async function elementToPngBlob(el: HTMLElement, overrides: HtmlToImageOpts = {}): Promise<Blob> {
  const blob = await toBlob(el, { ...BASE_OPTS, ...overrides });
  if (!blob) throw new Error("html-to-image: toBlob devolveu null");
  return blob;
}

/** Blob SVG precisa de xmlns; sem isto alguns browsers falham ao decodificar o <img>. */
function ensureSvgXmlns(serialized: string): string {
  const head = serialized.slice(0, 600);
  if (/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(head)) return serialized;
  return serialized.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg" ');
}

/** Tamanho estável para rasterizar o wheel (evita 0×0 ou rect reduzido por transform no pai). */
function svgExportPixelSize(svg: SVGSVGElement): { w: number; h: number } {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width >= 1 && vb.height >= 1) {
    return { w: Math.round(vb.width), h: Math.round(vb.height) };
  }
  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(svg.clientWidth || rect.width || 420));
  const h = Math.max(1, Math.round(svg.clientHeight || rect.height || 420));
  return { w, h };
}

async function serializeSvgsToImages(el: HTMLElement): Promise<() => void> {
  const svgEls = Array.from(el.querySelectorAll("svg")).filter(
    (n): n is SVGSVGElement => n instanceof SVGSVGElement,
  );
  const restoreFns: Array<() => void> = [];
  for (const svg of svgEls) {
    const parent = svg.parentElement;
    if (!parent) continue;
    const { w, h } = svgExportPixelSize(svg);
    const svgStr = ensureSvgXmlns(new XMLSerializer().serializeToString(svg));
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.width = w;
    img.height = h;
    img.style.display = "block";
    try {
      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error("svg raster timeout")), 15_000);
        img.onload = () => {
          window.clearTimeout(t);
          resolve();
        };
        img.onerror = () => {
          window.clearTimeout(t);
          reject(new Error("svg raster onerror"));
        };
        img.src = url;
      });
      URL.revokeObjectURL(url);
      parent.replaceChild(img, svg);
      restoreFns.push(() => parent.replaceChild(svg, img));
    } catch {
      URL.revokeObjectURL(url);
      /* Mantém o SVG inline para o html-to-image tentar capturar. */
    }
  }
  return () => restoreFns.forEach((fn) => fn());
}

async function tryCaptureOnce(
  el: HTMLElement,
  overrides: HtmlToImageOpts,
  useSvgRaster: boolean,
): Promise<Blob> {
  let restoreSvgs: () => void = () => {};
  if (useSvgRaster) {
    try {
      restoreSvgs = await serializeSvgsToImages(el);
    } catch {
      restoreSvgs = () => {};
    }
  }
  try {
    return await elementToPngBlob(el, overrides);
  } finally {
    restoreSvgs();
  }
}

export async function captureMomentShareCardPng(
  el: HTMLElement,
  opts: { pixelRatio?: 1 | 2; backgroundColor?: string } = {},
): Promise<Blob> {
  const { pixelRatio = 1, backgroundColor = CARD_BG } = opts;
  await waitFonts();
  await waitTwoFrames();
  await delay(60);

  const baseOverrides: HtmlToImageOpts = { pixelRatio, backgroundColor };

  const attempts: Array<{ overrides: HtmlToImageOpts; svgRaster: boolean }> = [
    { overrides: { ...baseOverrides, skipFonts: true }, svgRaster: false },
    { overrides: { ...baseOverrides, skipFonts: true }, svgRaster: true },
    { overrides: { ...baseOverrides, skipFonts: false }, svgRaster: true },
    {
      overrides: { ...baseOverrides, skipFonts: true, skipAutoScale: true },
      svgRaster: true,
    },
  ];

  let lastError: unknown;
  for (const att of attempts) {
    try {
      return await tryCaptureOnce(el, att.overrides, att.svgRaster);
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(typeof lastError === "string" ? lastError : "Falha ao gerar PNG do cartão");
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 400);
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
