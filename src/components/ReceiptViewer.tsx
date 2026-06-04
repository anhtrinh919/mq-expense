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

function ImageOrPdf({ blob, alt }: { blob: Blob | null; alt: string }) {
  const url = useObjectUrl(blob);
  if (!blob || !url) return <div className="rv-empty muted">No image</div>;
  if (blob.type === "application/pdf") {
    return <iframe className="rv-frame" src={url} title={alt} />;
  }
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
