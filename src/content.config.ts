import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { makeProductSchema } from './lib/admin/product-schema';

const componentsCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/components" }),
  schema: ({ image }) =>
    makeProductSchema(
      image().check((ctx) => {
        const value: unknown = ctx.value;
        if (typeof value === "string" && value.includes("placehold.co")) {
          ctx.issues.push({
            code: "custom",
            input: value,
            message: "Omit image until there is a photograph of the stocked part.",
          });
        }
      }),
    ),
});

export const collections = {
  components: componentsCollection,
};
