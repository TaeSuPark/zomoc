// src/shared/lib/mockGenerator.ts
import {
  ZodTypeAny,
  z,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodArray,
  ZodObject,
  ZodRecord,
  ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodTuple,
  ZodEnum,
  ZodLiteral,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
} from "zod"

// Helper functions for random data
const getRandomString = (key: string) => {
  if (key.toLowerCase().includes("password")) return "••••••••"
  if (key.toLowerCase().includes("url"))
    return `https://example.com/mock-path/${Math.random()
      .toString(36)
      .substring(7)}`
  return `temp text: ${Math.random().toString(36).substring(7)}`
}
const getRandomNumber = () => Math.floor(1000 + Math.random() * 9000)
const getRandomBoolean = () => Math.random() > 0.5
const getRandomDateTime = () => new Date().toISOString()

export interface CustomGenerators {
  string?: (key: string) => string
  number?: () => number
  boolean?: () => boolean
  dateTime?: () => string
}

/**
 * Generates mock data from a Zod schema.
 * @param schema The Zod schema to generate data for.
 * @param key The name of the property being generated.
 * @param customGenerators User-defined functions to override default mock data generation.
 * @returns Mock data corresponding to the schema.
 */
export function createMockDataFromZodSchema(
  schema: ZodTypeAny,
  key: string = "",
  customGenerators?: CustomGenerators,
  repeatCount: number = 1,
  seed: number = 0
): any {
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return createMockDataFromZodSchema(
      schema._def.innerType,
      key,
      customGenerators
    )
  }
  if (schema instanceof ZodEffects) {
    return createMockDataFromZodSchema(
      schema._def.schema,
      key,
      customGenerators
    )
  }

  if (schema instanceof ZodArray) {
    const itemSchema = schema.element
    // If repeatCount is explicitly provided (i.e., for pagination), use it.
    // Otherwise, generate a random number of items for regular arrays.
    const itemCount =
      repeatCount > 1 ? repeatCount : Math.floor(Math.random() * 3) + 1

    return Array.from({ length: itemCount }, (_, i) =>
      createMockDataFromZodSchema(
        itemSchema,
        `${key}[${i}]`,
        customGenerators,
        1, //  For nested arrays, always generate 1 item unless specified
        seed * itemCount + i
      )
    )
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape
    const mockData: Record<string, any> = {}
    for (const field in shape) {
      mockData[field] = createMockDataFromZodSchema(
        shape[field],
        field,
        customGenerators
      )
    }
    return mockData
  }

  if (schema instanceof ZodRecord) {
    // Generate a few key-value pairs for the record
    return {
      key1: createMockDataFromZodSchema(
        schema.valueSchema,
        "key1",
        customGenerators
      ),
      key2: createMockDataFromZodSchema(
        schema.valueSchema,
        "key2",
        customGenerators
      ),
    }
  }

  // Handle primitive types
  if (schema instanceof ZodString) {
    if (customGenerators?.string) {
      return customGenerators.string(key)
    }
    return getRandomString(key)
  }
  if (schema instanceof ZodNumber) {
    return customGenerators?.number
      ? customGenerators.number()
      : getRandomNumber()
  }
  if (schema instanceof ZodBoolean) {
    return customGenerators?.boolean
      ? customGenerators.boolean()
      : getRandomBoolean()
  }
  if (schema instanceof ZodDate) {
    return customGenerators?.dateTime
      ? customGenerators.dateTime()
      : getRandomDateTime()
  }

  if (schema instanceof ZodTuple) {
    return schema.items.map((item: ZodTypeAny, i: number) =>
      createMockDataFromZodSchema(item, `${key}[${i}]`, customGenerators)
    )
  }

  if (schema instanceof ZodEnum) {
    return schema.options[0]
  }

  if (schema instanceof ZodLiteral) {
    return schema.value
  }

  if (schema instanceof ZodUnion) {
    // For simplicity, always use the first type in the union
    return createMockDataFromZodSchema(schema.options[0], key, customGenerators)
  }

  if (schema instanceof ZodDiscriminatedUnion) {
    // For simplicity, always use the first option
    const firstOption = schema.options.get(schema.options.keys().next().value)
    return createMockDataFromZodSchema(firstOption, key, customGenerators)
  }

  if (schema instanceof ZodIntersection) {
    // This is a bit tricky. We'll merge the mock data from both schemas.
    const mockLeft = createMockDataFromZodSchema(
      schema._def.left,
      key,
      customGenerators
    )
    const mockRight = createMockDataFromZodSchema(
      schema._def.right,
      key,
      customGenerators
    )
    // Simple merge, might not be perfect for all cases
    return { ...mockLeft, ...mockRight }
  }

  return "unhandled zod type"
}
