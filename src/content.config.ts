import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const componentsCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/components" }),
  schema: z.object({
    part_number: z.string(),
    name: z.string(),
    category: z.string(),
    voltage: z.string(),
    package_type: z.string(),
    price: z.number(),
    mounting_type: z.string(),
    in_stock: z.boolean(),
    image: z.string().optional(),
    description: z.string().optional()
  })
});

export const collections = {
  'components': componentsCollection,
};
