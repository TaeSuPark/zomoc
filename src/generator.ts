// src/shared/lib/mockGenerator.ts
import {
  ZodTypeAny,
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
  ZodNativeEnum,
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
  repeatCount?: number,
  seed: number = 0,
  strategy: "random" | "fixed" = "random"
): any {
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return createMockDataFromZodSchema(
      schema._def.innerType,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }
  if (schema instanceof ZodEffects) {
    return createMockDataFromZodSchema(
      schema._def.schema,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }

  if (schema instanceof ZodArray) {
    const itemSchema = schema.element
    // If repeatCount is explicitly provided, use it.
    // Otherwise, generate a random number of items for regular arrays.
    const itemCount =
      typeof repeatCount === "number"
        ? repeatCount
        : Math.floor(Math.random() * 3) + 1

    return Array.from({ length: itemCount }, (_, i) =>
      createMockDataFromZodSchema(
        itemSchema,
        `${key}[${i}]`,
        customGenerators,
        undefined, // Do not pass repeatCount to nested array items
        seed * itemCount + i,
        strategy
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
        customGenerators,
        repeatCount,
        seed,
        strategy
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
        customGenerators,
        repeatCount,
        seed,
        strategy
      ),
      key2: createMockDataFromZodSchema(
        schema.valueSchema,
        "key2",
        customGenerators,
        repeatCount,
        seed,
        strategy
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

  if (schema instanceof ZodNativeEnum) {
    const values = schema._def.values
    if (strategy === "fixed") {
      return values[0]
    }
    const randomIndex = Math.floor(Math.random() * values.length)
    return values[randomIndex]
  }

  if (schema instanceof ZodTuple) {
    return schema.items.map((item: ZodTypeAny, i: number) =>
      createMockDataFromZodSchema(
        item,
        `${key}[${i}]`,
        customGenerators,
        repeatCount,
        seed,
        strategy
      )
    )
  }

  if (schema instanceof ZodEnum) {
    if (strategy === "fixed") {
      return schema.options[0]
    }
    const options = schema.options
    return options[Math.floor(Math.random() * options.length)]
  }

  if (schema instanceof ZodLiteral) {
    return schema.value
  }

  if (schema instanceof ZodUnion) {
    const options = schema.options as ZodTypeAny[]
    if (strategy === "fixed") {
      return createMockDataFromZodSchema(
        options[0],
        key,
        customGenerators,
        repeatCount,
        seed,
        strategy
      )
    }
    // For union types, randomly pick one of the options to mock.
    const randomOption = options[Math.floor(Math.random() * options.length)]
    return createMockDataFromZodSchema(
      randomOption,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }

  if (schema instanceof ZodDiscriminatedUnion) {
    const options: ZodTypeAny[] = Array.from(schema.options.values())
    if (options.length === 0) {
      return "unhandled zod type"
    }

    if (strategy === "fixed") {
      return createMockDataFromZodSchema(
        options[0],
        key,
        customGenerators,
        repeatCount,
        seed,
        strategy
      )
    }

    const randomIndex = Math.floor(Math.random() * options.length)
    return createMockDataFromZodSchema(
      options[randomIndex],
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }

  if (schema instanceof ZodIntersection) {
    // This is a bit tricky. We'll merge the mock data from both schemas.
    const mockLeft = createMockDataFromZodSchema(
      schema._def.left,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
    const mockRight = createMockDataFromZodSchema(
      schema._def.right,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
    // Simple merge, might not be perfect for all cases
    return { ...mockLeft, ...mockRight }
  }

  return "unhandled zod type"
}
