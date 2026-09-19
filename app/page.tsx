"use client";

import { useState } from "react";

interface MockupResult {
  label: string;
  dataUrl: string;
}

const LABELS: Record<string, string> = {
  desktop: "Desktop",
  tablet: "Tablette",
  mobile: "Mobile",
};

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<MockupResult[]>([]);
  const [zipDataUrl, setZipDataUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setImages([]);
    setZipDataUrl(null);

    try {
      const response = await fetch("/api/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      setImages(data.images);
      setZipDataUrl(data.zipDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Viewly
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Colle l&apos;URL d&apos;un site, récupère des captures pleine page propres en
            desktop, tablette et mobile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            required
            placeholder="https://exemple.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? "Génération..." : "Générer les mockups"}
          </button>
        </form>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {images.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
              <button
                onClick={() => zipDataUrl && downloadDataUrl(zipDataUrl, "mockups.zip")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Tout télécharger (.zip)
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {images.map((image) => (
                <div
                  key={image.label}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {LABELS[image.label] ?? image.label}
                  </span>
                  <div className="max-h-80 overflow-y-auto rounded border border-zinc-100 dark:border-zinc-800">
                    <img
                      src={image.dataUrl}
                      alt={`Mockup ${image.label}`}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={() => downloadDataUrl(image.dataUrl, `${image.label}.png`)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    Télécharger
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
