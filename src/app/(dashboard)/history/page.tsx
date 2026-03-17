"use client";

import { useEffect, useState } from "react";
import { HEADSHOT_STYLES } from "@/lib/constants";

type Gen = {
  id: string;
  style_slug: string;
  status: string;
  result_signed_url: string | null;
  error_message: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/generations")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGenerations(data.generations ?? []);
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const styleLabel = (slug: string) =>
    HEADSHOT_STYLES.find((s) => s.slug === slug)?.label ?? slug;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Generation history</h1>
      {generations.length === 0 ? (
        <p className="text-gray-500">No generations yet. Create one from the Dashboard.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {generations.map((g) => (
            <li
              key={g.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="aspect-square bg-gray-100">
                {g.status === "completed" && g.result_signed_url ? (
                  <img
                    src={g.result_signed_url}
                    alt={`Headshot ${g.style_slug}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    {g.status === "processing"
                      ? "Processing…"
                      : g.status === "failed"
                        ? "Failed"
                        : "Pending"}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-900">{styleLabel(g.style_slug)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(g.created_at).toLocaleString("en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                {g.status === "completed" && g.result_signed_url && (
                  <a
                    href={g.result_signed_url}
                    download="headshot.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Download
                  </a>
                )}
                {g.status === "failed" && g.error_message && (
                  <p className="mt-1 text-xs text-red-600">{g.error_message}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
