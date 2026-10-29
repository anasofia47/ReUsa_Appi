"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  publishItemAction,
  requestItemAction,
  reviewItemAction,
  uploadCoverAction,
  type FormState,
} from "@/app/actions";
import { Alert, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass } from "./ui";

const initial: FormState = {};

const CATEGORIES = [
  "Libros y Guías",
  "Tecnología y Calculadoras",
  "Papelería y Dibujo",
  "Ropa y Uniformes",
  "Mobiliario y Accesorios",
  "Otros",
];

const CONDITIONS = [
  "Nuevo",
  "Como nuevo",
  "Buen estado",
  "Aceptable",
];

export function PublishItemForm() {
  const [state, action, pending] = useActionState(publishItemAction, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const removePhoto = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nombre o Título del Objeto
        <input
          name="title"
          required
          minLength={3}
          placeholder="Ej: Calculadora Casio fx-570ES Plus"
          className={inputClass}
        />
      </label>

      {/* Campo para tomar foto con la cámara o seleccionar imagen */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Foto del Objeto a Donar
          <span className="text-xs font-normal text-zinc-500 block">
            Toma una foto con la cámara de tu dispositivo o selecciona una imagen (JPEG, PNG o WebP).
          </span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          id="item-cover-input"
          className="hidden"
        />

        {preview ? (
          <div className="relative flex flex-col items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Previsualización de foto tomada"
              className="h-48 w-full max-w-sm rounded-lg object-cover shadow-sm"
            />
            <div className="flex gap-2">
              <label
                htmlFor="item-cover-input"
                className={`${secondaryButtonClass} cursor-pointer text-xs`}
              >
                📷 Cambiar foto
              </label>
              <button
                type="button"
                onClick={removePhoto}
                className={`${dangerButtonClass} text-xs`}
              >
                ✕ Quitar foto
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="item-cover-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-zinc-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              📸
            </div>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Tomar foto con la cámara o subir imagen
            </span>
            <span className="text-xs text-zinc-500">
              Máximo 500 KB (JPEG, PNG o WebP)
            </span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Categoría
          <select name="category" required className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Estado del Objeto
          <select name="condition" required className={inputClass}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Punto de Entrega en el Campus TdeA
        <input
          name="deliveryPoint"
          required
          minLength={3}
          placeholder="Ej: Bloque 1 - Cafetería central o Biblioteca Bloque 2"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Descripción detallada
        <textarea
          name="description"
          required
          rows={4}
          minLength={10}
          placeholder="Describe el objeto, para qué asignatura sirve, si incluye accesorios, etc."
          className={inputClass}
        />
      </label>

      {state.error && <Alert kind="error">{state.error}</Alert>}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Link href="/items" className={secondaryButtonClass}>
          Cancelar
        </Link>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Enviando…" : "Enviar a Revisión del Supervisor"}
        </button>
      </div>
    </form>
  );
}

export function RequestItemForm({ itemId, isOwner }: { itemId: string; isOwner: boolean }) {
  const [state, action, pending] = useActionState(
    (_prev: FormState, formData: FormData) => requestItemAction(itemId, _prev, formData),
    initial,
  );

  if (isOwner) {
    return (
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400">
        Este objeto fue publicado por ti. Las solicitudes de otros estudiantes te llegarán en la sección <strong>Peticiones</strong>.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-emerald-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
        ¿Te interesa este objeto? Envíale una solicitud al dueño
      </h3>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Teléfono de contacto (WhatsApp)
        <input
          name="applicantPhone"
          type="tel"
          required
          placeholder="Ej: 3001234567"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        ¿Por qué lo necesitas?
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Ej: Lo necesito para mis clases de este semestre..."
          className={inputClass}
        />
      </label>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando solicitud…" : "Enviar Solicitud al Publicador"}
      </button>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}

export function SupervisorReviewForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(
    (_prev: FormState, formData: FormData) => reviewItemAction(itemId, _prev, formData),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <h3 className="font-semibold text-amber-900 dark:text-amber-200">
        Panel de Moderación (Supervisor / Admin)
      </h3>
      <p className="text-xs text-amber-800 dark:text-amber-300">
        Revisa que el objeto cumpla con las normas de ReUsa. Si lo rechazas, puedes indicar un motivo.
      </p>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Motivo de rechazo (opcional si apruebas):
        <input
          name="reason"
          placeholder="Ej: Objeto no permitido o descripción incompleta"
          className={inputClass}
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          name="action"
          value="approve"
          disabled={pending}
          className={buttonClass}
        >
          {pending ? "Procesando…" : "✓ Aprobar Publicación"}
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={pending}
          className={dangerButtonClass}
        >
          {pending ? "Procesando…" : "✕ Rechazar"}
        </button>
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}

export function ItemCoverUpload({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(
    (_prev: FormState, formData: FormData) => uploadCoverAction(itemId, _prev, formData),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium">
        Subir o actualizar foto (JPEG, PNG o WebP, máx ~500 KB)
        <input
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className={inputClass}
        />
      </label>
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        {pending ? "Subiendo…" : "Actualizar foto"}
      </button>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}
