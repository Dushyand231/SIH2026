"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";

export default function OcrUploader() {
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setText("");
    setConfidence(null);

    const { data } = await Tesseract.recognize(file, "eng+tam+hin");

    setText(data.text);
    setConfidence(data.confidence);
    setLoading(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>FDR OCR Test</h1>

      <input type="file" accept="image/*" onChange={handleFile} />

      {loading && <p>Reading the image...</p>}

      {confidence !== null && <p>Confidence: {Math.round(confidence)}%</p>}

      {text && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{text}</pre>
      )}
    </div>
  );
}