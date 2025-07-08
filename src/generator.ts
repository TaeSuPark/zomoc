// src/shared/lib/mockGenerator.ts
import { z, ZodTypeAny, ZodFirstPartyTypeKind } from "zod"

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
  customGenerators?: CustomGenerators
): unknown {
  // Check for schema existence and definition
  if (!schema?._def) {
    return null
  }

  const typeName = schema._def.typeName

  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodObject: {
      const shape = schema._def.shape()
      const result: { [key: string]: unknown } = {}
      for (const prop in shape) {
        result[prop] = createMockDataFromZodSchema(
          shape[prop],
          prop,
          customGenerators
        )
      }
      return result
    }
    case ZodFirstPartyTypeKind.ZodString:
      if (schema._def.checks?.some((check: any) => check.kind === "datetime")) {
        return customGenerators?.dateTime?.() ?? getRandomDateTime()
      }
      return customGenerators?.string?.(key) ?? getRandomString(key)
    case ZodFirstPartyTypeKind.ZodNumber:
      return customGenerators?.number?.() ?? getRandomNumber()
    case ZodFirstPartyTypeKind.ZodBoolean:
      return customGenerators?.boolean?.() ?? getRandomBoolean()
    case ZodFirstPartyTypeKind.ZodArray:
      // Create an array with 1 to 3 mock elements
      return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
        createMockDataFromZodSchema(schema._def.type, key, customGenerators)
      )
    case ZodFirstPartyTypeKind.ZodOptional:
    case ZodFirstPartyTypeKind.ZodNullable:
      // 50% chance of being null/undefined
      return Math.random() > 0.5
        ? createMockDataFromZodSchema(
            schema._def.innerType,
            key,
            customGenerators
          )
        : null
    case ZodFirstPartyTypeKind.ZodEffects:
      // Handle transformed schemas (e.g., z.preprocess)
      return createMockDataFromZodSchema(
        schema._def.schema,
        key,
        customGenerators
      )
    case ZodFirstPartyTypeKind.ZodDefault:
      return schema._def.defaultValue()
    default:
      console.warn(
        `[Mock Generator] Unhandled Zod type: ${typeName} for key: ${key}`
      )
      return null
  }
}
