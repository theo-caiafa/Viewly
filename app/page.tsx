"use client";

import { useEffect, useRef, useState } from "react";

interface MockupResult {
  label: string;
  dataUrl: string;
}

interface JobProgressEntry {
  device: string;
  current: number;
  total: number;
}

interface JobPayload {
  status: "running" | "done" | "error" | "cancelled";
  progress: JobProgressEntry[];
  warning?: string;
  error?: string;
  images?: MockupResult[];
  zipDataUrl?: string;
  pdfDataUrl?: string;
}

type Mode = "full" | "sections";
type Quality = "standard" | "high";
type DeviceId = "desktop" | "tablet" | "mobile";
type ResolutionPreset = "1440x900" | "1920x1080" | "1366x768" | "custom";

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  tablet: "Tablette",
  mobile: "Mobile",
};

const DEVICE_ORDER: DeviceId[] = ["desktop", "tablet", "mobile"];

const RESOLUTION_PRESETS: Record<Exclude<ResolutionPreset, "custom">, { width: number; height: number }> = {
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
  "1366x768": { width: 1366, height: 768 },
};

const POLL_INTERVAL_MS = 1000;

function parseLabel(raw: string): { device: string; screenIndex?: number } {
  const [device, index] = raw.split("-");
  return { device, screenIndex: index ? Number(index) : undefined };
}

function isValidUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).hostname.includes(".");
  } catch {
    return false;
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("full");
  const [quality, setQuality] = useState<Quality>("standard");
  const [devices, setDevices] = useState<Set<DeviceId>>(new Set(DEVICE_ORDER));
  const [resolution, setResolution] = useState<ResolutionPreset>("1440x900");
  const [customWidth, setCustomWidth] = useState(1440);
  const [customHeight, setCustomHeight] = useState(900);
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error" | "cancelled">("idle");
  const [progress, setProgress] = useState<JobProgressEntry[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<MockupResult[]>([]);
  const [zipDataUrl, setZipDataUrl] = useState<string | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function toggleDevice(id: DeviceId) {
    setDevices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one device selected
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function pollJob(id: string) {
    try {
      const response = await fetch(`/api/mockup/${id}`);
      const data: JobPayload = await response.json();

      if (!response.ok) {
        setError("error" in data ? (data as unknown as { error: string }).error : "Erreur inconnue.");
        setStatus("error");
        stopPolling();
        return;
      }

      setProgress(data.progress);
      if (data.warning) setWarning(data.warning);

      if (data.status === "done") {
        setImages(data.images ?? []);
        setZipDataUrl(data.zipDataUrl ?? null);
        setPdfDataUrl(data.pdfDataUrl ?? null);
        setStatus("done");
        stopPolling();
      } else if (data.status === "error") {
        setError(data.error ?? "Erreur inconnue.");
        setStatus("error");
        stopPolling();
      } else if (data.status === "cancelled") {
        setStatus("cancelled");
        stopPolling();
      }
    } catch {
      setError("Connexion perdue avec le serveur.");
      setStatus("error");
      stopPolling();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isValidUrl(url)) {
      setUrlError("Cette URL ne semble pas valide.");
      return;
    }
    setUrlError(null);

    setStatus("running");
    setError(null);
    setWarning(null);
    setProgress([]);
    setImages([]);
    setZipDataUrl(null);
    setPdfDataUrl(null);
    setJobId(null);

    const resolvedResolution = resolution === "custom" ? { width: customWidth, height: customHeight } : RESOLUTION_PRESETS[resolution];

    try {
      const response = await fetch("/api/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          mode,
          quality,
          devices: Array.from(devices),
          desktopWidth: devices.has("desktop") ? resolvedResolution.width : undefined,
          desktopHeight: devices.has("desktop") ? resolvedResolution.height : undefined,
          username: showAuth ? username : undefined,
          password: showAuth ? password : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      setJobId(data.jobId);
      pollRef.current = setInterval(() => pollJob(data.jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setStatus("error");
    }
  }

  async function handleCancel() {
    if (!jobId) return;
    try {
      await fetch(`/api/mockup/${jobId}`, { method: "DELETE" });
    } catch {
      // best-effort — the poll loop will surface any resulting state anyway
    }
  }

  const byDevice = new Map<string, MockupResult[]>();
  for (const image of images) {
    const { device } = parseLabel(image.label);
    const list = byDevice.get(device) ?? [];
    list.push(image);
    byDevice.set(device, list);
  }
  const orderedDeviceGroups = DEVICE_ORDER.filter((device) => byDevice.has(device));
  const isRunning = status === "running";

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Viewly
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Colle l&apos;URL d&apos;un site, récupère des mockups propres en desktop,
            tablette et mobile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                required
                placeholder="https://exemple.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={isRunning}
                className="rounded-lg bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {isRunning ? "Génération..." : "Générer les mockups"}
              </button>
            </div>
            {urlError && <p className="text-xs text-red-600 dark:text-red-400">{urlError}</p>}
          </div>

          <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:gap-8">
            <fieldset className="flex items-center gap-3">
              <legend className="sr-only">Mode de capture</legend>
              <span className="text-zinc-600 dark:text-zinc-400">Mode :</span>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "full"}
                  onChange={() => setMode("full")}
                />
                Vue complète
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "sections"}
                  onChange={() => setMode("sections")}
                />
                Par écrans
              </label>
            </fieldset>

            <fieldset className="flex items-center gap-3">
              <legend className="sr-only">Qualité</legend>
              <span className="text-zinc-600 dark:text-zinc-400">Qualité :</span>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="quality"
                  checked={quality === "standard"}
                  onChange={() => setQuality("standard")}
                />
                Standard
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="quality"
                  checked={quality === "high"}
                  onChange={() => setQuality("high")}
                />
                Haute qualité
              </label>
            </fieldset>
          </div>

          <fieldset className="flex flex-wrap items-center gap-3 text-sm">
            <legend className="sr-only">Devices à générer</legend>
            <span className="text-zinc-600 dark:text-zinc-400">Devices :</span>
            {DEVICE_ORDER.map((id) => (
              <label key={id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={devices.has(id)}
                  onChange={() => toggleDevice(id)}
                />
                {DEVICE_LABELS[id]}
              </label>
            ))}

            {devices.has("desktop") && (
              <span className="flex items-center gap-2">
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as ResolutionPreset)}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="1440x900">Desktop 1440×900</option>
                  <option value="1920x1080">Desktop 1920×1080</option>
                  <option value="1366x768">Desktop 1366×768</option>
                  <option value="custom">Personnalisé</option>
                </select>
                {resolution === "custom" && (
                  <>
                    <input
                      type="number"
                      min={320}
                      max={3840}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    ×
                    <input
                      type="number"
                      min={240}
                      max={3840}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </>
                )}
              </span>
            )}
          </fieldset>

          <div>
            <button
              type="button"
              onClick={() => setShowAuth((v) => !v)}
              className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Site protégé par mot de passe ?
            </button>
            {showAuth && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
            )}
          </div>

          {isRunning && (
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Génération en cours...</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Annuler
                </button>
              </div>
              {progress.map((entry) => (
                <div key={entry.device} className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{DEVICE_LABELS[entry.device] ?? entry.device}</span>
                  <span>
                    {entry.total > 0 ? `écran ${entry.current}/${entry.total}` : "chargement..."}
                  </span>
                </div>
              ))}
              {warning && <p className="text-xs text-amber-600 dark:text-amber-400">{warning}</p>}
            </div>
          )}
        </form>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {status === "cancelled" && (
          <p className="rounded-lg bg-zinc-100 px-4 py-3 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            Génération annulée.
          </p>
        )}

        {images.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => pdfDataUrl && downloadDataUrl(pdfDataUrl, "mockups.pdf")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Télécharger en PDF
              </button>
              <button
                onClick={() => zipDataUrl && downloadDataUrl(zipDataUrl, "mockups.zip")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Tout télécharger (.zip)
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {orderedDeviceGroups.map((device) => (
                <div key={device} className="flex flex-col gap-4">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {DEVICE_LABELS[device] ?? device}
                  </span>
                  {(byDevice.get(device) ?? []).map((image) => {
                    const { screenIndex } = parseLabel(image.label);
                    return (
                      <div
                        key={image.label}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        {screenIndex && (
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Écran {screenIndex}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setLightboxImage(image.dataUrl)}
                          className={`overflow-hidden rounded border border-zinc-100 dark:border-zinc-800 ${
                            mode === "full" ? "max-h-80 overflow-y-auto" : ""
                          }`}
                        >
                          <img
                            src={image.dataUrl}
                            alt={`Mockup ${image.label}`}
                            className="w-full"
                          />
                        </button>
                        <button
                          onClick={() => downloadDataUrl(image.dataUrl, `${image.label}.png`)}
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        >
                          Télécharger
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Aperçu du mockup"
            className="max-h-full max-w-full rounded shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
