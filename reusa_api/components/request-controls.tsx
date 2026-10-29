"use client";

import { useActionState } from "react";
import { requestTransitionAction, type FormState } from "@/app/actions";
import { Alert, buttonClass, dangerButtonClass } from "./ui";

const initial: FormState = {};

export function RequestActionButtons({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(
    (_prev: FormState, formData: FormData) =>
      requestTransitionAction(requestId, String(formData.get("action"))),
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {currentStatus === "requested" && (
          <>
            <button
              type="submit"
              name="action"
              value="approve"
              disabled={pending}
              className={buttonClass}
            >
              {pending ? "..." : "Aceptar interesado"}
            </button>
            <button
              type="submit"
              name="action"
              value="reject"
              disabled={pending}
              className={dangerButtonClass}
            >
              {pending ? "..." : "Rechazar"}
            </button>
          </>
        )}

        {currentStatus === "approved" && (
          <button
            type="submit"
            name="action"
            value="deliver"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "..." : "✓ Confirmar Entrega Realizada"}
          </button>
        )}
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}
