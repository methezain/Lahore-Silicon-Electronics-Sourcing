import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIES } from './lib/categories';

const specSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1).optional(),
});

const LOGIC_LEVELS = ["3.3 V", "5 V", "3.3 V and 5 V"] as const;

const componentsCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/components" }),
  schema: ({ image }) =>
    z
    .object({
      part_number: z.string().min(1),
      manufacturer: z
        .string()
        .min(1)
        .refine((value) => value.trim().toLowerCase() !== "generic", {
          message: 'Never "Generic".',
        }),
      mpn: z.string().min(1),
      name: z.string().min(1),
      category: z.enum(CATEGORIES),
      /** Front hero card. Editorial until a sales rank exists. See docs/decisions.md. */
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
      /** One sentence under the name. docs/commerce.md#fields-to-add. */
      summary: z.string().min(1).max(160),
      /** Spec labels, in tile order. Each one must exist in `specs`. */
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
        .array(
          z.object({
            q: z.string().min(1),
            a: z.string().min(1),
          }),
        )
        .min(3)
        .max(6)
        .optional(),
      /** Default 10. docs/commerce.md#stock. */
      low_stock_at: z.number().int().nonnegative().default(10),
      /** Full-drawer count for the meter. Omit when the drawer size is unknown. */
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
      /** First image is the main one. Replaces the single `image` field. */
      images: z
        .array(
          z.object({
            src: image().check((ctx) => {
              const value: unknown = ctx.value;
              if (typeof value === "string" && value.includes("placehold.co")) {
                ctx.issues.push({
                  code: "custom",
                  input: value,
                  message: "Omit image until there is a photograph of the stocked part.",
                });
              }
            }),
            alt: z.string().min(1),
            note: z.string().min(1).optional(),
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
    }),
});

export const collections = {
  components: componentsCollection,
};
