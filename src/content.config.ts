import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIES } from './lib/categories';

const specSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1).optional(),
});

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
      image: image()
        .check((ctx) => {
          const value: unknown = ctx.value;
          if (typeof value === "string" && value.includes("placehold.co")) {
            ctx.issues.push({
              code: "custom",
              input: value,
              message: "Omit image until there is a photograph of the stocked part.",
            });
          }
        })
        .optional(),
      image_note: z.string().min(1).optional(),
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
      if (record.image_note && !record.image) {
        ctx.addIssue({
          code: "custom",
          path: ["image_note"],
          message: "image_note is only for a photograph.",
        });
      }
    }),
});

export const collections = {
  components: componentsCollection,
};
