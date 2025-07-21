// src/shared/lib/mockGenerator.ts
import {
  ZodType,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodDate,
  ZodArray,
  ZodObject,
  ZodRecord,
  ZodOptional,
  ZodNullable,
  ZodTuple,
  ZodEnum,
  ZodLiteral,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
} from "zod"
import { CustomGenerators } from "./types"

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

/**
 * Generates mock data from a Zod schema.
 * @param schema The Zod schema to generate data for.
 * @param key The name of the property being generated.
 * @param customGenerators User-defined functions to override default mock data generation.
 * @returns Mock data corresponding to the schema.
 */
export function createMockDataFromZodSchema(
  schema: ZodType,
  key: string = "",
  customGenerators?: CustomGenerators,
  repeatCount?: number,
  seed: number = 0,
  strategy: "random" | "fixed" = "random"
): any {
  // 내부 구조는 Zod v4에서 _def → _zod.def로 옮겨가는 과도기 구조이므로, 둘 다 체크
  const def = (schema as any)._def ?? (schema as any)._zod?.def

  // ZodOptional/ZodNullable
  // 예시: z.string().optional(), z.number().nullable()
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return createMockDataFromZodSchema(
      def.innerType as any,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }
  // ZodEffects (transform/refine 등)
  // 예시: z.string().transform(val => val.length), z.number().refine(n => n > 0)
  if ("schema" in def) {
    return createMockDataFromZodSchema(
      (def as any).schema,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
  }

  // ZodArray
  // 예시: z.array(z.string())
  if (schema instanceof ZodArray) {
    const itemSchema = schema.element
    const itemCount =
      typeof repeatCount === "number"
        ? repeatCount
        : Math.floor(Math.random() * 3) + 1

    return Array.from({ length: itemCount }, (_, i) =>
      createMockDataFromZodSchema(
        itemSchema as any,
        `${key}[${i}]`,
        customGenerators,
        undefined,
        seed * itemCount + i,
        strategy
      )
    )
  }

  // ZodObject
  // 예시: z.object({ name: z.string(), age: z.number() })
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

  // ZodRecord
  // 예시: z.record(z.string(), z.number())
  if (schema instanceof ZodRecord) {
    return {
      key1: createMockDataFromZodSchema(
        def.valueType as any,
        "key1",
        customGenerators,
        repeatCount,
        seed,
        strategy
      ),
      key2: createMockDataFromZodSchema(
        def.valueType as any,
        "key2",
        customGenerators,
        repeatCount,
        seed,
        strategy
      ),
    }
  }

  // ZodString
  // 예시: z.string()
  if (schema instanceof ZodString) {
    if (customGenerators?.string) {
      return customGenerators.string(key)
    }
    return getRandomString(key)
  }
  // ZodNumber
  // 예시: z.number()
  if (schema instanceof ZodNumber) {
    return customGenerators?.number
      ? customGenerators.number()
      : getRandomNumber()
  }
  // ZodBoolean
  // 예시: z.boolean()
  if (schema instanceof ZodBoolean) {
    return customGenerators?.boolean
      ? customGenerators.boolean()
      : getRandomBoolean()
  }
  // ZodDate
  // 예시: z.date()
  if (schema instanceof ZodDate) {
    return customGenerators?.dateTime
      ? customGenerators.dateTime()
      : getRandomDateTime()
  }

  // ZodNativeEnum
  // 예시: z.nativeEnum(MyEnum)
  if (def.typeName === "ZodNativeEnum") {
    const values = (schema as any).getValues
      ? (schema as any).getValues()
      : def.values
    if (strategy === "fixed") {
      return values[0]
    }
    const randomIndex = Math.floor(Math.random() * values.length)
    return values[randomIndex]
  }

  // ZodTuple
  // 예시: z.tuple([z.string(), z.number()])
  if (schema instanceof ZodTuple) {
    return (def.items as any[]).map((item: ZodType, i: number) =>
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

  // ZodEnum
  // 예시: z.enum(["A", "B", "C"])
  if (schema instanceof ZodEnum) {
    if (strategy === "fixed") {
      return schema.options[0]
    }
    const options = schema.options
    return options[Math.floor(Math.random() * options.length)]
  }

  // ZodLiteral
  // 예시: z.literal("foo")
  if (schema instanceof ZodLiteral) {
    return schema.value
  }

  // ZodUnion
  // 예시: z.union([z.string(), z.number()])
  if (schema instanceof ZodUnion) {
    const options = schema.options as ZodType[]
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

  // ZodDiscriminatedUnion
  // 예시: z.discriminatedUnion("type", [z.object({ type: z.literal("a"), ... }), ...])
  if (schema instanceof ZodDiscriminatedUnion) {
    const options: ZodType[] = Array.from((schema.options as any).values())
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

  // ZodIntersection
  // 예시: z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() }))
  if (schema instanceof ZodIntersection) {
    const mockLeft = createMockDataFromZodSchema(
      def.left as any,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
    const mockRight = createMockDataFromZodSchema(
      def.right as any,
      key,
      customGenerators,
      repeatCount,
      seed,
      strategy
    )
    return { ...mockLeft, ...mockRight }
  }

  return "unhandled zod type"
}
