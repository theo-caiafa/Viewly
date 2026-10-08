"use client";

import { useEffect, useRef, useState } from "react";

interface MockupResult {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
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
  hasSourceContext?: boolean;
}

type ExportFormat = "png" | "webp" | "pdf";
const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "pdf", label: "PDF" },
];

type Mode = "full" | "sections";
type Quality = "standard" | "high";
type DeviceId = "desktop" | "tablet" | "mobile";
type InputMode = "url" | "media";

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  tablet: "Tablette",
  mobile: "Mobile",
};

const DEVICE_ORDER: DeviceId[] = ["desktop", "tablet", "mobile"];

interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

// "custom" is always appended as the last option per device — not listed
// here since it has no fixed width/height of its own.
const RESOLUTION_PRESETS: Record<DeviceId, ResolutionOption[]> = {
  desktop: [
    { label: "1440×900", width: 1440, height: 900 },
    { label: "1920×1080", width: 1920, height: 1080 },
  ],
  tablet: [
    { label: "768×1024 (iPad portrait)", width: 768, height: 1024 },
    { label: "1024×768 (iPad paysage)", width: 1024, height: 768 },
    { label: "820×1180 (iPad Air)", width: 820, height: 1180 },
  ],
  mobile: [
    { label: "375×812 (iPhone)", width: 375, height: 812 },
    { label: "390×844 (iPhone 12/13/14)", width: 390, height: 844 },
    { label: "360×800 (Android)", width: 360, height: 800 },
  ],
};

function defaultPresetLabel(id: DeviceId): string {
  return RESOLUTION_PRESETS[id][0].label;
}

// Mirrors lib/import/media.ts — duplicated rather than imported because
// that module pulls in sharp, which must stay out of the client bundle.
const MEDIA_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MEDIA_MAX_FILE_BYTES = 20 * 1024 * 1024;
const MEDIA_MAX_FILES = 10;
const DEVICE_RATIO_TOLERANCE = 0.08;

interface StagedMediaFile {
  id: string;
  file: File;
  width: number;
  height: number;
  device: DeviceId | "";
  error?: string;
}

// Guesses a device from the image's aspect ratio against every known
// preset (not just the default size per device) — a ratio match within
// tolerance picks the closest device; nothing close enough leaves it to be
// chosen manually.
function classifyDeviceId(width: number, height: number): DeviceId | null {
  const ratio = width / height;
  let best: { id: DeviceId; diff: number } | null = null;
  for (const id of DEVICE_ORDER) {
    for (const preset of RESOLUTION_PRESETS[id]) {
      const presetRatio = preset.width / preset.height;
      const diff = Math.abs(ratio - presetRatio) / presetRatio;
      if (diff <= DEVICE_RATIO_TOLERANCE && (!best || diff < best.diff)) {
        best = { id, diff };
      }
    }
  }
  return best?.id ?? null;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      reject(new Error("Fichier illisible."));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

const DURATION_PRESETS_MS = [3000, 5000, 8000, 15000];
const SCALE_OPTIONS = [1, 0.5] as const;
const DEFAULT_DURATION_MS = 5000;
const DEFAULT_SCALE = 1;
const MIN_CUSTOM_DURATION_S = 1;
const MAX_CUSTOM_DURATION_S = 30;

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
}

function scaledResolution(width: number, height: number, scale: number): string {
  return `${Math.round(width * scale)}×${Math.round(height * scale)}`;
}

interface HoverableElement {
  id: string;
  label: string;
  point: { x: number; y: number };
}

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
  const [resolutionChoice, setResolutionChoice] = useState<Record<DeviceId, string>>({
    desktop: defaultPresetLabel("desktop"),
    tablet: defaultPresetLabel("tablet"),
    mobile: defaultPresetLabel("mobile"),
  });
  const [customSize, setCustomSize] = useState<Record<DeviceId, { width: number; height: number }>>({
    desktop: { width: 1440, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
  });
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [stagedFiles, setStagedFiles] = useState<StagedMediaFile[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [mediaImportError, setMediaImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error" | "cancelled">("idle");
  const [progress, setProgress] = useState<JobProgressEntry[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<MockupResult[]>([]);
  const [hasSourceContext, setHasSourceContext] = useState(true);
  // Tracks which flow produced the current results — a media-imported
  // image must never inherit the "vue complète" scroll-clamp below, since
  // that's governed by the URL capture's leftover `mode` state, which is
  // meaningless for an uploaded file.
  const [resultsSource, setResultsSource] = useState<InputMode>("url");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exportingLabel, setExportingLabel] = useState<string | null>(null);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [videoPanelOpenFor, setVideoPanelOpenFor] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<Record<string, number>>({});
  const [videoCustomDurationS, setVideoCustomDurationS] = useState<Record<string, number>>({});
  const [videoScale, setVideoScale] = useState<Record<string, number>>({});
  const [videoCapturingFor, setVideoCapturingFor] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoResults, setVideoResults] = useState<Record<string, string>>({});
  const [scrollToNext, setScrollToNext] = useState<Record<string, boolean>>({});
  const [hoverElements, setHoverElements] = useState<Record<string, HoverableElement[]>>({});
  const [hoverElementId, setHoverElementId] = useState<Record<string, string>>({});
  const [hoverLoadingFor, setHoverLoadingFor] = useState<string | null>(null);

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
        setHasSourceContext(data.hasSourceContext ?? true);
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
    setResultsSource("url");
    setJobId(null);
    setVideoPanelOpenFor(null);
    setVideoResults({});
    setVideoError(null);
    setScrollToNext({});
    setHoverElements({});
    setHoverElementId({});
    setExportError(null);

    const resolutions: Record<string, { width: number; height: number }> = {};
    for (const id of devices) {
      const choice = resolutionChoice[id];
      resolutions[id] = choice === "custom" ? customSize[id] : RESOLUTION_PRESETS[id].find((p) => p.label === choice) ?? RESOLUTION_PRESETS[id][0];
    }

    try {
      const response = await fetch("/api/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          mode,
          quality,
          devices: Array.from(devices),
          resolutions,
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

  async function addMediaFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    setMediaImportError(null);

    const room = MEDIA_MAX_FILES - stagedFiles.length;
    const kept = incoming.slice(0, Math.max(room, 0));
    if (incoming.length > kept.length) {
      setMediaImportError(
        `Maximum ${MEDIA_MAX_FILES} fichiers par import — ${incoming.length - kept.length} fichier(s) ignoré(s).`,
      );
    }

    for (const file of kept) {
      const id = crypto.randomUUID();

      if (!MEDIA_ACCEPTED_TYPES.includes(file.type)) {
        setStagedFiles((prev) => [...prev, { id, file, width: 0, height: 0, device: "", error: "Format non supporté." }]);
        continue;
      }
      if (file.size > MEDIA_MAX_FILE_BYTES) {
        setStagedFiles((prev) => [
          ...prev,
          { id, file, width: 0, height: 0, device: "", error: "Fichier trop volumineux (max 20 Mo)." },
        ]);
        continue;
      }

      try {
        const { width, height } = await readImageDimensions(file);
        const guess = classifyDeviceId(width, height);
        setStagedFiles((prev) => [...prev, { id, file, width, height, device: guess ?? "" }]);
      } catch {
        setStagedFiles((prev) => [...prev, { id, file, width: 0, height: 0, device: "", error: "Fichier illisible." }]);
      }
    }
  }

  function removeStagedFile(id: string) {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function setStagedFileDevice(id: string, device: DeviceId) {
    setStagedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, device } : f)));
  }

  // dragenter/dragleave fire repeatedly while the pointer crosses child
  // elements, not just the page boundary — a counter (rather than a plain
  // boolean) is what keeps the "dragging a file" state from flickering off
  // every time the cursor passes over a nested element.
  const dragCounterRef = useRef(0);

  function handlePageDragEnter(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  }

  function handlePageDragOver(event: React.DragEvent) {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
    }
  }

  function handlePageDragLeave(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFile(false);
  }

  function handlePageDrop(event: React.DragEvent) {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    if (event.dataTransfer.files.length === 0) return;
    setInputMode("media");
    addMediaFiles(event.dataTransfer.files);
  }

  const readyMediaFiles = stagedFiles.filter((f) => !f.error && f.device);

  async function handleMediaImport() {
    if (readyMediaFiles.length === 0) return;

    setStatus("running");
    setError(null);
    setWarning(null);
    setProgress([]);
    setImages([]);
    setResultsSource("media");
    setJobId(null);
    setVideoPanelOpenFor(null);
    setVideoResults({});
    setVideoError(null);
    setScrollToNext({});
    setHoverElements({});
    setHoverElementId({});
    setExportError(null);

    const formData = new FormData();
    for (const staged of readyMediaFiles) {
      formData.append("file", staged.file);
      formData.append("device", staged.device);
    }

    try {
      const response = await fetch("/api/mockup/media", { method: "POST", body: formData });
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

  function toggleVideoPanel(label: string) {
    setVideoPanelOpenFor((prev) => (prev === label ? null : label));
    setVideoError(null);
  }

  async function captureVideo(label: string) {
    if (!jobId) return;
    const durationMs = videoDuration[label] ?? DEFAULT_DURATION_MS;
    const scale = videoScale[label] ?? DEFAULT_SCALE;
    const selectedHoverId = hoverElementId[label];
    const hoverPoint = selectedHoverId
      ? hoverElements[label]?.find((el) => el.id === selectedHoverId)?.point
      : undefined;

    setVideoCapturingFor(label);
    setVideoError(null);

    try {
      const response = await fetch(`/api/mockup/${jobId}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          durationMs,
          scale,
          hoverPoint,
          scrollToNextScreen: scrollToNext[label] ?? false,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      setVideoResults((prev) => ({ ...prev, [label]: data.dataUrl }));
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setVideoCapturingFor(null);
    }
  }

  async function loadHoverableElements(label: string) {
    if (!jobId || hoverElements[label]) return;
    setHoverLoadingFor(label);
    setVideoError(null);

    try {
      const response = await fetch(`/api/mockup/${jobId}/hoverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      setHoverElements((prev) => ({ ...prev, [label]: data.elements }));
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setHoverLoadingFor(null);
    }
  }

  async function exportSingle(label: string) {
    if (!jobId) return;
    setExportingLabel(label);
    setExportError(null);

    try {
      const response = await fetch(`/api/mockup/${jobId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat, label }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      downloadDataUrl(data.dataUrl, data.filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setExportingLabel(null);
    }
  }

  async function exportZip() {
    if (!jobId) return;
    setExportingZip(true);
    setExportError(null);

    try {
      const response = await fetch(`/api/mockup/${jobId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }

      downloadDataUrl(data.dataUrl, data.filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setExportingZip(false);
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
    <div
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
      className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black"
    >
      {isDraggingFile && (
        <div className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-zinc-400 bg-zinc-50/90 dark:border-zinc-500 dark:bg-black/90">
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-200">
            Déposez vos fichiers pour les importer
          </p>
        </div>
      )}
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
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Source :</span>
            <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  inputMode === "url"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode("media")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  inputMode === "media"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Média
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-lg">
            {inputMode === "url" ? (
              <>
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
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Glissez vos images ici (maquettes, screenshots)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Parcourir
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addMediaFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {mediaImportError && <p className="text-xs text-red-600 dark:text-red-400">{mediaImportError}</p>}

                {stagedFiles.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {stagedFiles.map((staged) => (
                      <li
                        key={staged.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                      >
                        <span className="truncate text-zinc-800 dark:text-zinc-200">{staged.file.name}</span>
                        {staged.error ? (
                          <span className="text-xs text-red-600 dark:text-red-400">{staged.error}</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {staged.width}×{staged.height}
                            </span>
                            <select
                              value={staged.device}
                              onChange={(e) => setStagedFileDevice(staged.id, e.target.value as DeviceId)}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <option value="" disabled>
                                Choisir un device...
                              </option>
                              {DEVICE_ORDER.map((id) => (
                                <option key={id} value={id}>
                                  {DEVICE_LABELS[id]}
                                </option>
                              ))}
                            </select>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeStagedFile(staged.id)}
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleMediaImport}
                  disabled={readyMediaFiles.length === 0 || isRunning}
                  className="self-start rounded-lg bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {isRunning ? "Import..." : `Importer (${readyMediaFiles.length})`}
                </button>
              </div>
            )}
          </div>

          {inputMode === "url" && (
            <>
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

              <fieldset className="flex flex-col gap-3 text-sm">
                <legend className="text-zinc-600 dark:text-zinc-400">Devices :</legend>
                {DEVICE_ORDER.map((id) => (
                  <div key={id} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={devices.has(id)}
                        onChange={() => toggleDevice(id)}
                      />
                      {DEVICE_LABELS[id]}
                    </label>

                    {devices.has(id) && (
                      <span className="flex items-center gap-2">
                        <select
                          value={resolutionChoice[id]}
                          onChange={(e) => setResolutionChoice((prev) => ({ ...prev, [id]: e.target.value }))}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {RESOLUTION_PRESETS[id].map((preset) => (
                            <option key={preset.label} value={preset.label}>
                              {preset.label}
                            </option>
                          ))}
                          <option value="custom">Personnalisé</option>
                        </select>
                        {resolutionChoice[id] === "custom" && (
                          <>
                            <input
                              type="number"
                              min={200}
                              max={3840}
                              value={customSize[id].width}
                              onChange={(e) =>
                                setCustomSize((prev) => ({
                                  ...prev,
                                  [id]: { ...prev[id], width: Number(e.target.value) },
                                }))
                              }
                              className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            ×
                            <input
                              type="number"
                              min={200}
                              max={3840}
                              value={customSize[id].height}
                              onChange={(e) =>
                                setCustomSize((prev) => ({
                                  ...prev,
                                  [id]: { ...prev[id], height: Number(e.target.value) },
                                }))
                              }
                              className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </>
                        )}
                      </span>
                    )}
                  </div>
                ))}
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
            </>
          )}

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
            <div className="flex items-center justify-end gap-3">
              {exportError && (
                <p className="text-xs text-red-600 dark:text-red-400">{exportError}</p>
              )}
              <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                Format :
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {EXPORT_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={exportingZip}
                onClick={exportZip}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                {exportingZip ? "Préparation..." : "Tout télécharger (.zip)"}
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {orderedDeviceGroups.map((device) => {
                const deviceImages = byDevice.get(device) ?? [];
                return (
                <div key={device} className="flex flex-col gap-4">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {DEVICE_LABELS[device] ?? device}
                  </span>
                  {deviceImages.map((image, imageIndex) => {
                    const { screenIndex } = parseLabel(image.label);
                    const hasNextScreen = imageIndex < deviceImages.length - 1;
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
                            resultsSource === "url" && mode === "full" ? "max-h-80 overflow-y-auto" : ""
                          }`}
                        >
                          <img
                            src={image.dataUrl}
                            alt={`Mockup ${image.label}`}
                            className="w-full"
                          />
                        </button>
                        <button
                          type="button"
                          disabled={exportingLabel === image.label}
                          onClick={() => exportSingle(image.label)}
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        >
                          {exportingLabel === image.label ? "Préparation..." : "Télécharger"}
                        </button>

                        {mode === "sections" && hasSourceContext && (
                          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => toggleVideoPanel(image.label)}
                              className="text-left text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              {videoPanelOpenFor === image.label ? "Annuler" : "Capturer cet écran en vidéo"}
                            </button>

                            {videoPanelOpenFor === image.label && (
                              <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                                {videoResults[image.label] ? (
                                  <div className="flex flex-col gap-2">
                                    <video
                                      src={videoResults[image.label]}
                                      controls
                                      loop
                                      className="w-full rounded"
                                    />
                                    <button
                                      onClick={() =>
                                        downloadDataUrl(videoResults[image.label], `${image.label}.webm`)
                                      }
                                      className="rounded border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    >
                                      Télécharger la vidéo
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-col gap-1.5">
                                      <span className="font-medium text-zinc-600 dark:text-zinc-400">Durée</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {DURATION_PRESETS_MS.map((ms) => (
                                          <button
                                            key={ms}
                                            type="button"
                                            onClick={() =>
                                              setVideoDuration((prev) => ({ ...prev, [image.label]: ms }))
                                            }
                                            className={`rounded border px-2 py-1 ${
                                              (videoDuration[image.label] ?? DEFAULT_DURATION_MS) === ms
                                                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                                : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                            }`}
                                          >
                                            {formatDuration(ms)}
                                          </button>
                                        ))}
                                        <input
                                          type="number"
                                          min={MIN_CUSTOM_DURATION_S}
                                          max={MAX_CUSTOM_DURATION_S}
                                          placeholder="Perso (s)"
                                          value={videoCustomDurationS[image.label] ?? ""}
                                          onChange={(e) => {
                                            const seconds = Number(e.target.value);
                                            setVideoCustomDurationS((prev) => ({ ...prev, [image.label]: seconds }));
                                            if (seconds > 0) {
                                              setVideoDuration((prev) => ({ ...prev, [image.label]: seconds * 1000 }));
                                            }
                                          }}
                                          className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                      <span className="font-medium text-zinc-600 dark:text-zinc-400">Qualité</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {SCALE_OPTIONS.map((s) => {
                                          return (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() => setVideoScale((prev) => ({ ...prev, [image.label]: s }))}
                                              className={`rounded border px-2 py-1 ${
                                                (videoScale[image.label] ?? DEFAULT_SCALE) === s
                                                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                                  : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                              }`}
                                            >
                                              {scaledResolution(image.width, image.height, s)}
                                              {s === 1 ? " (native)" : ""}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                      <span className="font-medium text-zinc-600 dark:text-zinc-400">Mouvement</span>
                                      <label
                                        className={`flex items-center gap-1.5 ${!hasNextScreen ? "opacity-50" : ""}`}
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!hasNextScreen}
                                          checked={scrollToNext[image.label] ?? false}
                                          onChange={(e) =>
                                            setScrollToNext((prev) => ({ ...prev, [image.label]: e.target.checked }))
                                          }
                                        />
                                        Filmer le scroll vers l&apos;écran suivant
                                      </label>

                                      {hoverElements[image.label] ? (
                                        <select
                                          value={hoverElementId[image.label] ?? ""}
                                          onChange={(e) =>
                                            setHoverElementId((prev) => ({ ...prev, [image.label]: e.target.value }))
                                          }
                                          className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
                                        >
                                          <option value="">Aucun survol simulé</option>
                                          {hoverElements[image.label].map((el) => (
                                            <option key={el.id} value={el.id}>
                                              Survoler : {el.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={hoverLoadingFor === image.label}
                                          onClick={() => loadHoverableElements(image.label)}
                                          className="text-left underline underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-200"
                                        >
                                          {hoverLoadingFor === image.label
                                            ? "Recherche des éléments..."
                                            : "Simuler un survol (hover)"}
                                        </button>
                                      )}
                                    </div>

                                    {videoError && (
                                      <p className="text-red-600 dark:text-red-400">{videoError}</p>
                                    )}

                                    <button
                                      type="button"
                                      disabled={videoCapturingFor === image.label}
                                      onClick={() => captureVideo(image.label)}
                                      className="rounded bg-black px-3 py-1.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                                    >
                                      {videoCapturingFor === image.label ? "Capture en cours..." : "Lancer la capture"}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })}
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
