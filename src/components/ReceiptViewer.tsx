import { useEffect, useState } from "react";
import { getImageById } from "../data/repos";
import "./ReceiptViewer.css";

type View = "original" | "bwscan";

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

// Phone browsers can't show a PDF in an iframe, so each page is drawn to a canvas with pdf.js.
function PdfPages({ blob, alt }: { blob: Blob; alt: string }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      const out: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        out.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      void doc.destroy();
      if (!cancelled) setPages(out);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [blob]);
  if (failed) return <div className="rv-empty muted">Couldn't show this PDF</div>;
  if (!pages) return <div className="rv-empty muted"><span className="spinner" /> Loading…</div>;
  return <div className="rv-pages">{pages.map((src, i) => <img key={i} className="rv-img" src={src} alt={`${alt}, page ${i + 1}`} />)}</div>;
}

export function ImageOrPdf({ blob, alt }: { blob: Blob | null; alt: string }) {
  const url = useObjectUrl(blob);
  if (!blob || !url) return <div className="rv-empty muted">No image</div>;
  if (blob.type === "application/pdf") return <PdfPages blob={blob} alt={alt} />;
  return <img className="rv-img" src={url} alt={alt} />;
}

export default function ReceiptViewer({ originalImageId, bwScanId, initial = "original" }: { originalImageId: string; bwScanId: string; initial?: View }) {
  const [view, setView] = useState<View>(initial);
  const [original, setOriginal] = useState<Blob | null>(null);
  const [bw, setBw] = useState<Blob | null>(null);

  useEffect(() => {
    getImageById(originalImageId).then((i) => setOriginal(i?.blob ?? null));
    getImageById(bwScanId).then((i) => setBw(i?.blob ?? null));
  }, [originalImageId, bwScanId]);

  return (
    <div className="rv">
      <div className="rv-tabs">
        <button className={`rv-tab${view === "original" ? " active" : ""}`} onClick={() => setView("original")}>Colour</button>
        <button className={`rv-tab${view === "bwscan" ? " active" : ""}`} onClick={() => setView("bwscan")}>B&amp;W scan</button>
      </div>
      <div className="rv-stage">
        {view === "original" ? <ImageOrPdf blob={original} alt="Original receipt" /> : <ImageOrPdf blob={bw} alt="B&W scan" />}
      </div>
    </div>
  );
}
