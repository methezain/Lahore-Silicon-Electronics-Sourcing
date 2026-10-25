import { z } from "zod";
import { CATEGORIES } from "../categories";

export const LOGIC_LEVELS = ["3.3 V", "5 V", "3.3 V and 5 V"] as const;

const specSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1).optional(),
});

/**
 * The one product record. The build reads it from JSON with `image()` as the photo
 * type; the admin and D1 use a string reference (a build asset path or a `/media` key).
 */
export function makeProductSchema<Image extends z.ZodType>(imageSrc: Image) {
  return z
    .object({
      part_number: z.string().min(1),
      manufacturer: z
        .string()
        .min(1)
        .refine((value) => value.trim().toLowerCase() !== "generic", { message: 'Never "Generic".' }),
      mpn: z.string().min(1),
      name: z.string().min(1),
      category: z.enum(CATEGORIES),
      featured: z.boolean().optional(),
      price: z.number().int().nonnegative(),
      currency: z.literal("PKR"),
      stock_qty: z.number().int().nonnegative(),
      restock_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "restock_on is an ISO date.")
        .optional(),
      package_type: z.string().min(1),
      mounting_type: z.string().min(1),
      voltage: z.string().min(1).optional(),
      specs: z.array(specSchema).min(1),
      summary: z.string().min(1).max(160),
      key_specs: z.array(z.string().min(1)).min(2).max(4),
      logic_level: z.enum(LOGIC_LEVELS).optional(),
      pinout: z
        .array(
          z.object({
            pin: z.string().min(1),
            label: z.string().min(1),
            note: z.string().min(1).optional(),
          }),
        )
        .min(1)
        .optional(),
      companions: z.array(z.string().min(1)).min(1).optional(),
      not_included: z.string().min(1).optional(),
      faq: z
        .array(z.object({ q: z.string().min(1), a: z.string().min(1) }))
        .min(3)
        .max(6)
        .optional(),
      low_stock_at: z.number().int().nonnegative().default(10),
      shelf_qty: z.number().int().positive().optional(),
      datasheet: z
        .string()
        .refine((value) => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" && !value.includes("#");
          } catch {
            return false;
          }
        }, "Datasheet must be an absolute https URL.")
        .optional(),
      images: z
        .array(
          z.object({
            src: imageSrc,
            alt: z.string().min(1),
            note: z.string().min(1).optional(),
            width: z.number().int().positive().optional(),
            height: z.number().int().positive().optional(),
          }),
        )
        .min(1)
        .optional(),
      in_the_bag: z.string().min(1),
      limits: z.string().min(1).optional(),
      min_qty: z.number().int().positive().default(1),
      qty_multiple: z.number().int().positive().default(1),
      breaks: z
        .array(
          z.object({
            min_qty: z.number().int().positive(),
            unit_price: z.number().int().nonnegative(),
          }),
        )
        .optional(),
      description: z.string().min(1),
    })
    .superRefine((record, ctx) => {
      const labels = new Set(record.specs.map((spec) => spec.label));
      record.key_specs.forEach((label, index) => {
        if (!labels.has(label)) {
          ctx.addIssue({
            code: "custom",
            path: ["key_specs", index],
            message: `"${label}" is not a spec label on this part.`,
          });
        }
      });
      if (record.companions?.includes(record.part_number)) {
        ctx.addIssue({
          code: "custom",
          path: ["companions"],
          message: "A part cannot list itself as a companion.",
        });
      }
    });
}

export const storedProductSchema = makeProductSchema(z.string().min(1));

export type StoredProduct = z.output<typeof storedProductSchema>;
