"use client";

import { useState, useCallback } from "react";
import { HEADSHOT_STYLES } from "@/lib/constants";

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(HEADSHOT_STYLES[0].slug);
  const [status, setStatus] = useState<"idle" | "uploading" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image (JPEG, PNG, or WebP).");
      return;
    }
    setError(null);
    setFile(f);
    setSelfiePreview(URL.createObjectURL(f));
    setSelfiePath(null);
    setResultUrl(null);
    setStatus("idle");
  }, []);

  const upload = async () => {
    if (!file) return;
    setError(null);
    setStatus("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSelfiePath(data.path ?? data.selfie_url);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("idle");
    }
  };

  const generate = async () => {
    let pathToUse = selfiePath;
    if (!pathToUse && file) {
      setError(null);
      setStatus("uploading");
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        pathToUse = data.path ?? data.selfie_url;
        setSelfiePath(pathToUse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setStatus("idle");
        return;
      }
      setStatus("idle");
    }
    if (!pathToUse) {
      setError("Please upload a selfie first.");
      return;
    }
    setError(null);
    setStatus("generating");
    setResultUrl(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfie_url: pathToUse, style_slug: selectedStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      if (data.result_signed_url) setResultUrl(data.result_signed_url);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Create your headshot</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">1. Upload a selfie</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-shrink-0">
            <label className="block h-40 w-40 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-gray-100">
              {selfiePreview ? (
                <img
                  src={selfiePreview}
                  alt="Selfie preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                  Click to upload
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-500">
              JPEG, PNG or WebP. Max 5MB. Face clearly visible.
            </p>
            {file && !selfiePath && (
              <button
                type="button"
                onClick={upload}
                disabled={status === "uploading"}
                className="w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {status === "uploading" ? "Uploading…" : "Upload"}
              </button>
            )}
            {selfiePath && (
              <p className="text-sm text-green-600">Uploaded. Select a style and generate.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">2. Choose a style</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HEADSHOT_STYLES.map((style) => (
            <button
              key={style.slug}
              type="button"
              onClick={() => setSelectedStyle(style.slug)}
              className={`rounded-lg border-2 p-4 text-left transition ${
                selectedStyle === style.slug
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="font-medium text-gray-900">{style.label}</span>
              <p className="mt-1 text-sm text-gray-500">{style.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">3. Generate</h2>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={!file || status === "uploading" || status === "generating"}
          className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {status === "uploading"
            ? "Uploading…"
            : status === "generating"
              ? "Generating… (about 3s)"
              : "Generate headshot"}
        </button>

        {status === "done" && resultUrl && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-gray-700">Your headshot</p>
            <div className="inline-block overflow-hidden rounded-lg border border-gray-200">
              <img
                src={resultUrl}
                alt="Generated headshot"
                className="h-64 w-64 object-cover"
              />
            </div>
            <div className="mt-2">
              <a
                href={resultUrl}
                download="headshot.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Download
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
