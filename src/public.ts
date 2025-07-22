import { z } from "zod"
import type { CustomGenerators, TypeRegistry } from "./types"
import { createMockDataFromZodSchema } from "./generator"

/**
 * Creates a type-safe mock data generator function based on a provided registry.
 *
 * @param typeRegistry - A map of type names to their corresponding Zod schemas.
 * @param customGenerators - Optional custom data generators to override default behavior.
 * @returns A `getZomocGenerator` function.
 */
export function createGenerator(
  typeRegistry: TypeRegistry,
  customGenerators?: CustomGenerators
) {
  /**
   * Generates mock data for a given registered type name.
   * Provides full type-safety and IDE autocompletion for the type names.
   *
   * @param typeName - The name of the type registered in your `mock.json` files. Must be a key in the typeRegistry.
   * @param options - Optional parameters for generation, such as pagination, repeatCount, or strategy.
   * @returns The generated mock data, correctly typed.
   */
  function getZomocGenerator<T extends keyof typeof typeRegistry>(
    typeName: T,
    options: {
      pagination?: {
        itemsKey: string
        totalKey: string
        pageKey?: string
        sizeKey?: string
      }
      repeatCount?: number
      strategy?: "fixed" | "random"
      page?: number
      size?: number
    } = {}
  ) {
    const schema = typeRegistry[typeName]

    if (!schema) {
      // This check is a runtime safeguard, but TypeScript's static analysis should prevent this from being called with an invalid typeName.
      throw new Error(
        `[Zomoc] The type "${String(
          typeName
        )}" is not registered. Please check your mock.json files.`
      )
    }

    const { pagination, page = 1, size = 10, repeatCount, strategy } = options

    let mockData
    if (pagination) {
      const itemSchema = (schema as any).shape[pagination.itemsKey]
      const pageData = createMockDataFromZodSchema(
        itemSchema,
        String(typeName),
        customGenerators,
        size,
        page,
        strategy
      )
      mockData = {
        [pagination.itemsKey]: pageData,
        [pagination.totalKey]: 100, //  Dummy total
        [pagination.pageKey ?? "page"]: page,
        [pagination.sizeKey ?? "size"]: size,
      }
    } else {
      mockData = createMockDataFromZodSchema(
        schema,
        String(typeName),
        customGenerators,
        repeatCount,
        0, // page is not relevant here
        strategy
      )
    }

    // The return type is inferred by TypeScript based on the Zod schema,
    // so we can safely cast it to the expected output type.
    return mockData as z.infer<typeof schema>
  }

  return getZomocGenerator
}
