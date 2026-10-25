import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { adminActor } from "../lib/admin/constants";
import type { AdminDatabase } from "../lib/admin/db";
import { changeStatus, saveNote } from "../lib/admin/orders";
import { setStock } from "../lib/admin/stock";
import { invalidateProducts } from "../lib/catalog-db";

function admin(context: ActionAPIContext): AdminDatabase {
  if (!context.locals.admin?.signedIn) throw new ActionError({ code: "NOT_FOUND" });
  if (!env?.DB) throw new ActionError({ code: "INTERNAL_SERVER_ERROR" });
  return env.DB as unknown as AdminDatabase;
}

const field = z.union([z.string(), z.null()]).transform((value) => value ?? "");

export const adminActions = {
  setOrderStatus: defineAction({
    accept: "form",
    input: z.object({
      id: field,
      expected: field,
      to: field,
      restock: field.optional(),
      back: field.optional(),
    }),
    handler: async (input, context) => {
      const db = admin(context);
      const result = await changeStatus(db, {
        id: input.id,
        expected: input.expected,
        to: input.to,
        restock: input.restock === "on",
        actor: adminActor,
      });
      if (result.ok && result.restocked) invalidateProducts();
      return { id: input.id, back: input.back ?? "", result };
    },
  }),

  saveOrderNote: defineAction({
    accept: "form",
    input: z.object({ id: field, note: field, back: field.optional() }),
    handler: async (input, context) => {
      const db = admin(context);
      const result = await saveNote(db, { id: input.id, note: input.note, actor: adminActor });
      return { id: input.id, back: input.back ?? "", result };
    },
  }),

  setStock: defineAction({
    accept: "form",
    input: z.object({
      part_number: field,
      expected: field,
      qty: field,
      restock_on: field.optional(),
    }),
    handler: async (input, context) => {
      const db = admin(context);
      const result = await setStock(db, {
        partNumber: input.part_number,
        expected: input.expected,
        qty: input.qty,
        restockOn: input.restock_on ?? "",
        actor: adminActor,
      });
      if (result.ok) invalidateProducts();
      return { result };
    },
  }),
};
