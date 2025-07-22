import { z } from "zod"
import type { CustomGenerators, RegistryValue } from "./types"
import { createMockDataFromZodSchema } from "./generator"

/**
 * Creates a type-safe mock data generator function based on a provided registry.
 *
 * @param registry - The mock data registry, typically `finalSchemaUrlMap` from `virtual:zomoc` or a generated file.
 * @param customGenerators - Optional custom data generators to override default behavior.
 * @returns A `getZomocGenerator` function.
 */
export function createGenerator(
  registry: Record<string, RegistryValue>,
  customGenerators?: CustomGenerators
) {
  /**
   * Generates mock data for a given registered type name.
   * Provides full type-safety and IDE autocompletion for the type names.
   *
   * @example
   * const user = getZomocGenerator('IUser'); // `user` is correctly typed
   * const wrong = getZomocGenerator('WrongType'); // IDE error!
   *
   * @param typeName - The name of the type registered in your `mock.json` files. Must be a key in the registry.
   * @param options - Optional parameters for generation, like repeatCount or strategy.
   * @returns The generated mock data, correctly typed.
   */
  function getZomocGenerator<T extends keyof typeof registry>(
    typeName: T,
    options: {
      repeatCount?: number
      strategy?: "fixed" | "random"
      page?: number
      size?: number
    } = {}
  ) {
    const registryValue = registry[typeName]

    if (!registryValue) {
      // This check is a runtime safeguard, but TypeScript's static analysis should prevent this from being called with an invalid typeName.
      throw new Error(
        `[Zomoc] The type "${String(
          typeName
        )}" is not registered for mocking. Please check your mock.json and interface files.`
      )
    }

    const { schema, pagination } = registryValue
    const { page = 1, size = 10, repeatCount, strategy } = options

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
      }
    } else {
      const finalRepeatCount = repeatCount ?? registryValue.repeatCount
      const finalStrategy = strategy ?? registryValue.strategy
      mockData = createMockDataFromZodSchema(
        schema,
        String(typeName),
        customGenerators,
        finalRepeatCount,
        0, // page is not relevant here
        finalStrategy
      )
    }

    // The return type is inferred by TypeScript based on the Zod schema,
    // so we can safely cast it to the expected output type.
    return mockData as z.infer<typeof schema>
  }

  return getZomocGenerator
}
