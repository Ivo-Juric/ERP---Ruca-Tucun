"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X, File, CheckCircle } from "lucide-react";
import { createClientComponentClient } from "@/lib/supabase";
import { guardarMaterial } from "@/app/(dashboard)/formacion/actions";
import { useRouter } from "next/navigation";
import type { SeccionBasica } from "@/app/(dashboard)/formacion/actions";

// Nota: el bucket 'materiales-fdoc' debe existir en Supabase Storage
// con acceso público. Crearlo en: Supabase Dashboard → Storage → New bucket.

type Props = {
  secciones: SeccionBasica[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizarNombreArchivo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export default function SubirMaterial({ secciones }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progreso, setProgreso] = useState<"idle" | "subiendo" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [supabase] = useState(() => createClientComponentClient());

  function handleClose() {
    setAbierto(false);
    setArchivo(null);
    setIsDragging(false);
    setProgreso("idle");
    setError(null);
  }

  function handleArchivoSeleccionado(file: File) {
    const MAX_MB = 25;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo no puede superar ${MAX_MB} MB.`);
      return;
    }
    setArchivo(file);
    setError(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleArchivoSeleccionado(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleArchivoSeleccionado(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) {
      setError("Seleccioná un archivo para subir.");
      return;
    }

    const form = e.currentTarget;
    const nombre = (form.elements.namedItem("nombre") as HTMLInputElement).value.trim();
    const descripcion =
      (form.elements.namedItem("descripcion") as HTMLTextAreaElement).value.trim() ||
      null;
    const seccion_id =
      (form.elements.namedItem("seccion_id") as HTMLSelectElement).value || null;

    setError(null);
    setProgreso("subiendo");

    startTransition(async () => {
      try {
        // 1. Subir a Supabase Storage
        const extension = archivo.name.split(".").pop() ?? "";
        const nombreArchivo = sanitizarNombreArchivo(
          `${Date.now()}-${archivo.name}`,
        );
        const filePath = `${seccion_id ?? "general"}/${nombreArchivo}`;

        const { data: storageData, error: storageError } =
          await supabase.storage
            .from("materiales-fdoc")
            .upload(filePath, archivo, {
              contentType: archivo.type,
              upsert: false,
            });

        if (storageError) {
          setError(`Error al subir: ${storageError.message}`);
          setProgreso("error");
          return;
        }

        // 2. Obtener URL pública
        const { data: urlData } = supabase.storage
          .from("materiales-fdoc")
          .getPublicUrl(storageData.path);

        // 3. Guardar en DB via server action
        const res = await guardarMaterial({
          nombre: nombre || archivo.name.replace(`.${extension}`, ""),
          descripcion,
          url_archivo: urlData.publicUrl,
          tipo_archivo: archivo.type || `application/${extension}`,
          seccion_id,
        });

        if (res.ok) {
          setProgreso("ok");
          router.refresh();
          setTimeout(() => handleClose(), 1500);
        } else {
          setError(res.error);
          setProgreso("error");
        }
      } catch {
        setError("Error inesperado al subir el archivo.");
        setProgreso("error");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
      >
        <Upload size={16} />
        Subir material
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-ruca-yellow" />
                <h2 className="font-semibold text-white">Subir material</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
                disabled={progreso === "subiendo"}
              >
                <X size={18} />
              </button>
            </div>

            {progreso === "ok" ? (
              <div className="flex flex-col items-center gap-3 p-12">
                <CheckCircle size={48} className="text-green-400" />
                <p className="font-medium text-white">
                  Material subido con éxito
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {/* Zona drag & drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
                    isDragging
                      ? "border-ruca-yellow bg-ruca-yellow/5"
                      : archivo
                        ? "border-green-700/60 bg-green-900/10"
                        : "border-ruca-gray-light hover:border-ruca-yellow/50"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                    onChange={handleInputChange}
                  />
                  {archivo ? (
                    <>
                      <File size={32} className="text-green-400" />
                      <div className="text-center">
                        <p className="font-medium text-white">{archivo.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(archivo.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchivo(null);
                        }}
                        className="text-xs text-gray-500 hover:text-red-400"
                      >
                        Cambiar archivo
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-500" />
                      <div className="text-center">
                        <p className="text-sm text-gray-300">
                          Arrastrá un archivo aquí o hacé click
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          PDF, DOC, PPT, XLS, imágenes — máx. 25 MB
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Nombre del material
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    placeholder={
                      archivo
                        ? archivo.name.replace(/\.[^.]+$/, "")
                        : "Nombre descriptivo del archivo"
                    }
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    rows={2}
                    placeholder="Breve descripción del contenido..."
                    className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                </div>

                {/* Sección destino */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Sección destino
                  </label>
                  <select
                    name="seccion_id"
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    <option value="">Todas las secciones</option>
                    {secciones.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p className="rounded-xl bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={progreso === "subiendo"}
                    className="flex-1 rounded-xl border border-ruca-gray-light py-2.5 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || progreso === "subiendo"}
                    className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                  >
                    {progreso === "subiendo" ? "Subiendo..." : "Subir material"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
