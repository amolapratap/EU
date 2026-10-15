import { PDFDocument } from "pdf-lib";

export type CompressionQuality = "high" | "medium" | "low";

const QUALITY_CONFIG: Record<CompressionQuality, { maxDim: number; quality: number }> = {
  high: { maxDim: 2400, quality: 0.88 },
  medium: { maxDim: 1600, quality: 0.75 }, // Optimal balance: ~300KB/page, sharp readable text
  low: { maxDim: 1200, quality: 0.60 },
};

/**
 * Reads the total page count of a PDF file using pdf-lib in the browser.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.error("Failed to read PDF page count:", err);
    return 1;
  }
}

/**
 * Extracts specified 1-based page numbers from a PDF and returns a new PDF File.
 * Example: selectedPages = [1, 3, 4] extracts pages 1, 3, and 4.
 */
export async function extractSelectedPages(
  originalFile: File,
  selectedPages: number[]
): Promise<File> {
  const arrayBuffer = await originalFile.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();

  // Convert 1-based page numbers to 0-based indices and remove duplicates
  const uniquePages = Array.from(new Set(selectedPages)).sort((a, b) => a - b);
  const zeroBasedIndices = uniquePages
    .map(p => p - 1)
    .filter(idx => idx >= 0 && idx < total);

  if (zeroBasedIndices.length === 0) {
    throw new Error("No valid pages selected for extraction.");
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedIndices);
  copiedPages.forEach(p => newDoc.addPage(p));

  const pdfBytes = await newDoc.save();
  const safeName = originalFile.name.replace(/\.pdf$/i, "");
  return new File([pdfBytes as any], `${safeName}_extracted.pdf`, {
    type: "application/pdf",
  });
}

/**
 * Converts one or more image files (JPG, PNG, WEBP, etc.) into a single multi-page PDF File.
 * Includes automatic resolution downscaling and JPEG optimization to avoid gigantic file sizes.
 */
export async function convertImagesToPdf(
  imageFiles: File[],
  outputName: string = "converted_paper",
  qualityLevel: CompressionQuality = "medium"
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const config = QUALITY_CONFIG[qualityLevel] || QUALITY_CONFIG.medium;

  for (const imgFile of imageFiles) {
    // Read image into HTMLImageElement via Object URL
    const objectUrl = URL.createObjectURL(imgFile);
    const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${imgFile.name}`));
      img.src = objectUrl;
    });

    let targetWidth = imgElement.naturalWidth || imgElement.width || 1200;
    let targetHeight = imgElement.naturalHeight || imgElement.height || 1600;

    // Scale down dimensions if exceeding max dimension (e.g. 12MP phone camera photos)
    const currentMax = Math.max(targetWidth, targetHeight);
    if (currentMax > config.maxDim) {
      const scale = config.maxDim / currentMax;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    // Clean white background for transparent PNGs
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

    URL.revokeObjectURL(objectUrl);

    // Convert canvas to optimized JPEG blob
    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error("Failed to encode image to JPEG"))),
        "image/jpeg",
        config.quality
      );
    });

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embeddedImg = await pdfDoc.embedJpg(jpegBytes);

    const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: embeddedImg.width,
      height: embeddedImg.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeBase = outputName.replace(/\.[^/.]+$/, "") || "paper";
  return new File([pdfBytes as any], `${safeBase}.pdf`, {
    type: "application/pdf",
  });
}

/**
 * Compresses an existing PDF file by rendering pages to canvas and repacking with optimized JPEG compression.
 * Reduces 10MB-30MB scanner PDFs down to ~800KB-1.5MB while maintaining clear readability.
 */
export async function compressPdfFile(
  pdfFile: File,
  qualityLevel: "medium" | "low" = "medium"
): Promise<{ file: File; originalSize: number; newSize: number; reductionPercent: number }> {
  // Dynamically import pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const loadedPdf = await loadingTask.promise;
  const numPages = loadedPdf.numPages;

  const pdfDoc = await PDFDocument.create();
  const config = QUALITY_CONFIG[qualityLevel] || QUALITY_CONFIG.medium;

  for (let i = 1; i <= numPages; i++) {
    const page = await loadedPdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const currentMax = Math.max(unscaledViewport.width, unscaledViewport.height);
    const scale = Math.min(2.0, config.maxDim / currentMax);
    const viewport = page.getViewport({ scale: Math.max(1.0, scale) });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error("Failed to encode compressed page"))),
        "image/jpeg",
        config.quality
      );
    });

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embeddedImg = await pdfDoc.embedJpg(jpegBytes);
    const pdfPage = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: embeddedImg.width,
      height: embeddedImg.height,
    });
  }

  const compressedBytes = await pdfDoc.save();
  const safeName = pdfFile.name.replace(/\.pdf$/i, "");
  const compressedFile = new File([compressedBytes as any], `${safeName}_optimized.pdf`, {
    type: "application/pdf",
  });

  const originalSize = pdfFile.size;
  const newSize = compressedFile.size;
  const reductionPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

  return {
    file: compressedFile,
    originalSize,
    newSize,
    reductionPercent,
  };
}

/**
 * Parses user input like "1-3, 5, 8-10" into sorted 1-based page numbers.
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const selected = new Set<number>();
  const parts = rangeStr.split(",").map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          selected.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        selected.add(page);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Formats an array of numbers into a readable string like "1-3, 5, 7".
 */
export function formatPageRange(pages: number[]): string {
  if (!pages || pages.length === 0) return "None";
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);

  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (rangeStart === prev) {
        ranges.push(String(rangeStart));
      } else {
        ranges.push(`${rangeStart}-${prev}`);
      }
      rangeStart = current;
      prev = current;
    }
  }

  return ranges.join(", ");
}

/**
 * Human-readable byte formatting.
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Loads a PDF Document using pdfjs-dist in the browser and returns the PDFDocumentProxy.
 */
export async function loadPdfDocument(file: File): Promise<any> {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return await loadingTask.promise;
}
