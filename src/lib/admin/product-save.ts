import type { AdminDatabase } from "./db";
import { adminActor } from "./constants";
import { valuesFromForm, valuesFromRecord, type FieldErrors, type ProductValues } from "./product-form";
import { createProduct, updateProduct, validateProduct, type SaveResult } from "./products";
import type { StoredProduct } from "./product-schema";

export type Submission =
  | { saved: true; partNumber: string }
  | { saved: false; values: ProductValues; errors: FieldErrors; error?: string; stale?: boolean };

const saveMessages: Record<Exclude<Extract<SaveResult, { ok: false }>["reason"], never>, string> = {
  exists: "A part with this number already exists.",
  stale: "This product changed on another screen. Reload to see the current version.",
  missing: "This product no longer exists.",
  failed: "Nothing was saved. Try again.",
};

/** Validates a posted form, then creates or updates. A failure returns the typed values so nothing is lost. */
export async function submitProduct(
  db: AdminDatabase,
  form: FormData,
  mode: "create" | "update",
  current?: { record: StoredProduct },
): Promise<Submission> {
  const values = valuesFromForm(form);
  if (mode === "update" && current) values.part_number = current.record.part_number;

  const checked = await validateProduct(db, values, mode, current?.record);
  if (!checked.ok) return { saved: false, values, errors: checked.errors };

  const result =
    mode === "create"
      ? await createProduct(db, { record: checked.record, published: values.published, qty: Number(values.initial_qty), actor: adminActor })
      : await updateProduct(db, {
          record: checked.record,
          published: values.published,
          expectedUpdatedAt: String(form.get("updated_at") ?? ""),
          actor: adminActor,
        });
  if (result.ok) return { saved: true, partNumber: result.part_number };
  return {
    saved: false,
    values,
    errors: result.reason === "exists" ? { part_number: saveMessages.exists } : {},
    error: result.reason === "exists" ? undefined : saveMessages[result.reason],
    stale: result.reason === "stale",
  };
}

export { valuesFromRecord };
