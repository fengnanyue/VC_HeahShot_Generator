"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HEADSHOT_STYLES } from "@/lib/constants";
import { BuyCreditsButton } from "@/components/BuyCreditsButton";

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(HEADSHOT_STYLES[0].slug);
  const [status, setStatus] = useState<"idle" | "uploading" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits", { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      setCredits(typeof data.credits_balance === "number" ? data.credits_balance : 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

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
    setOutOfCredits(false);
    setStatus("generating");
    setResultUrl(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfie_url: pathToUse, style_slug: selectedStyle }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.code === "INSUFFICIENT_CREDITS") setOutOfCredits(true);
        throw new Error(data.error ?? "Generation failed");
      }
      if (data.result_signed_url) setResultUrl(data.result_signed_url);
      setStatus("done");
      await refreshCredits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create your headshot</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload one selfie, pick a style, and generate a polished headshot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-gray-500">Credits</span>{" "}
            <span className="font-semibold text-gray-900">
              {credits === null ? "—" : credits}
            </span>
          </div>
          {credits !== null && credits < 1 && (
            <BuyCreditsButton className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" />
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="p-6">
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              Before
            </div>
            <h2 className="mt-3 text-lg font-semibold text-gray-900">Casual selfie</h2>
            <p className="mt-1 text-sm text-gray-500">
              Hard lighting, busy background, not optimized for professional profiles.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="relative h-44">
                <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.08),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.06),transparent_35%),linear-gradient(135deg,rgba(99,102,241,0.08),rgba(0,0,0,0.02))]" />
                <div className="absolute bottom-6 left-6 h-20 w-20 rounded-full bg-gray-300" />
                <div className="absolute bottom-6 left-28 h-6 w-40 rounded-md bg-gray-200" />
                <div className="absolute bottom-14 left-28 h-4 w-28 rounded-md bg-gray-200" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 md:border-l md:border-t-0">
            <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              After
            </div>
            <h2 className="mt-3 text-lg font-semibold text-gray-900">Studio-style headshot</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cleaner background, balanced lighting, and a sharp crop that works on LinkedIn.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
              <div className="relative h-44">
                <div className="absolute inset-0 opacity-90 [background:radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.25),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(14,165,233,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.6),rgba(99,102,241,0.08))]" />
                <div className="absolute bottom-6 left-6 h-20 w-20 rounded-full bg-indigo-200" />
                <div className="absolute bottom-6 left-28 h-6 w-40 rounded-md bg-indigo-100" />
                <div className="absolute bottom-14 left-28 h-4 w-28 rounded-md bg-indigo-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tip: If you run out of credits, buy more in{" "}
            <Link href="/account" className="font-medium text-indigo-700 underline hover:no-underline">
              Account
            </Link>
            .
          </span>
          <span className="text-xs text-gray-500">$1 = 5 credits • 1 credit = 1 headshot</span>
        </div>
      </section>

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
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            {outOfCredits && (
              <span className="ml-1">
                <Link href="/account" className="font-medium underline hover:no-underline">
                  Go to Account
                </Link>
              </span>
            )}
          </div>
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
            <div className="w-full max-w-sm overflow-hidden rounded-lg border border-gray-200">
              <img
                src={resultUrl}
                alt="Generated headshot"
                className="aspect-square w-full object-cover"
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
