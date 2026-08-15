"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input } from "@/src/ui";
import { adminFetch, type FetchInit } from "@/src/shared/http/admin-fetch";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const MAX_FILE_BYTES = 2_800_000;

interface Preview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; message: string }>;
  rows: Array<{ name: string; age: number | null; location: string }>;
}

interface ImportResult extends Preview {
  listId: string;
  inserted: number;
  updated: number;
}

async function requestJson<T>(url: string, init: FetchInit): Promise<T> {
  const response = await adminFetch(url, init);
  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? `Error ${response.status}`);
  }
  return body as T;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function DeceasedImportsAdmin() {
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const previewImport = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      requestJson<{ preview: Preview }>("/api/admin/deceased-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, dryRun: true }),
      }),
    onSuccess: ({ preview: nextPreview }) => {
      setPreview(nextPreview);
      setResult(null);
    },
  });

  const applyImport = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      requestJson<{ result: ImportResult }>("/api/admin/deceased-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, dryRun: false }),
      }),
    onSuccess: ({ result: nextResult }) => setResult(nextResult),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!file) throw new Error("Elige un archivo CSV o XLSX.");
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("El archivo supera ~2.8 MB. Divide la lista en archivos más pequeños.");
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
      if (!contentType) throw new Error("Solo se permiten archivos CSV o XLSX.");
      const fileBase64 = await fileToBase64(file);
      const nextPayload = {
        title,
        sourceName,
        sourceUrl,
        publishedAt: publishedAt ? new Date(`${publishedAt}T00:00:00Z`).getTime() : null,
        contentType,
        fileBase64,
      };
      setPayload(nextPayload);
      previewImport.mutate(nextPayload);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    }
  }

  const error = previewImport.error ?? applyImport.error;
  const canApply = preview && preview.validRows > 0 && preview.invalidRows === 0 && payload;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Importar lista oficial de fallecidos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Estos registros se publican en una sección separada. No se asignan a hospitales ni se
          cuentan como pacientes hospitalizados.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded border p-4">
        <Input
          label="Título de la lista"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Institución oficial"
          required
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
        />
        <Input
          label="Enlace oficial de la lista"
          type="url"
          required
          placeholder="https://example.org/lista-oficial"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        <Input
          label="Fecha de publicación (opcional)"
          type="date"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
        />
        <label className="text-sm font-medium">
          Archivo (CSV o XLSX, máximo ~3 MB)
          <input
            type="file"
            accept=".csv,.xlsx"
            required
            className="mt-1 block w-full rounded border p-2 text-sm"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Columna obligatoria: Nombre. Opcionales: Edad, Ubicación y Descripción.
          </span>
        </label>
        <Button type="submit" disabled={previewImport.isPending}>
          {previewImport.isPending ? "Validando…" : "Validar archivo"}
        </Button>
      </form>

      {preview && (
        <section className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">Vista previa</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-muted">Filas</dt>
              <dd>{preview.totalRows}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Válidas</dt>
              <dd>{preview.validRows}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Inválidas</dt>
              <dd>{preview.invalidRows}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Duplicadas</dt>
              <dd>{preview.duplicateRows}</dd>
            </div>
          </dl>
          {preview.errors.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-red-600">
              {preview.errors.map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Fila {item.row}: {item.message}
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Edad</th>
                  <th className="p-2">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="border-t">
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.age ?? "—"}</td>
                    <td className="p-2">{row.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 20 && (
            <p className="text-xs text-ink-muted">Se muestran las primeras 20 filas.</p>
          )}
          <Button
            type="button"
            disabled={!canApply || applyImport.isPending}
            onClick={() => payload && applyImport.mutate(payload)}
          >
            {applyImport.isPending ? "Publicando…" : "Publicar lista validada"}
          </Button>
        </section>
      )}

      {result && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800"
        >
          Lista publicada: {result.inserted} registros nuevos y {result.updated} actualizados.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}
