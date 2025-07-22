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
 * Recursively traverses a Zod schema and generates mock data that conforms to it.
 * It supports a wide range of Zod types, including primitives, objects, arrays, and complex types like unions and intersections.
 * @description Zod 스키마를 재귀적으로 순회하며 해당 스키마 구조에 맞는 Mock 데이터를 생성합니다.
 * 원시 타입, 객체, 배열을 포함하여 유니온, 인터섹션과 같은 복잡한 타입까지 광범위한 Zod 타입을 지원합니다.
 *
 * @param schema The Zod schema to generate data from. // Mock 데이터를 생성할 Zod 스키마
 * @param key The name of the property being generated (used for context-aware generation, e.g., for passwords or URLs). // 현재 생성 중인 속성의 이름 (예: 비밀번호, URL 등 문맥에 맞는 데이터 생성에 사용됨)
 * @param customGenerators User-defined functions to override default mock data generation. // 기본 Mock 데이터 생성을 재정의하는 사용자 정의 함수
 * @param repeatCount The number of items to generate for arrays. If undefined, a random number of items will be generated. // 배열에 대해 생성할 항목의 수. 지정되지 않으면 랜덤 개수 생성.
 * @param seed A number used to add variability to random generation, especially within loops. // 특히 루프 내에서 랜덤 생성에 변화를 주기 위한 시드값
 * @param strategy Determines the generation strategy. 'random' for random values, 'fixed' for predictable values (e.g., first enum value). // 생성 전략. 'random'은 랜덤 값, 'fixed'는 예측 가능한 값 (예: enum의 첫 번째 값)
 * @returns Mock data corresponding to the schema. // 스키마에 해당하는 Mock 데이터
 */
export function createMockDataFromZodSchema(
  schema: ZodType,
  key: string = "",
  customGenerators?: CustomGenerators,
  repeatCount?: number,
  seed: number = 0,
  strategy: "random" | "fixed" = "random"
): any {
  // Access the schema definition. This handles a transitional phase in Zod's internal API.
  // @description Zod의 내부 API 과도기에 대응하기 위해 `_def`와 `_zod.def`를 모두 확인합니다.
  const def = (schema as any)._def ?? (schema as any)._zod?.def

  // For optional or nullable types, we simply generate data for the inner type.
  // Example: z.string().optional(), z.number().nullable()
  // @description optional 또는 nullable 타입의 경우, 내부 타입에 대해 데이터를 생성합니다.
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
  // For types with effects (e.g., transform, refine), we bypass the effect and use the underlying schema.
  // Example: z.string().transform(...), z.number().refine(...)
  // @description transform, refine 등 effect가 있는 타입의 경우, effect를 우회하고 내부 스키마를 사용합니다.
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

  // Handles ZodArray types.
  // Example: z.array(z.string())
  // @description ZodArray 타입을 처리합니다.
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

  // Handles ZodObject types.
  // Example: z.object({ name: z.string(), age: z.number() })
  // @description ZodObject 타입을 처리합니다.
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

  // Handles ZodRecord types.
  // Example: z.record(z.string(), z.number())
  // @description ZodRecord 타입을 처리합니다.
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

  // Handles ZodString.
  // @description ZodString 타입을 처리합니다.
  if (schema instanceof ZodString) {
    if (customGenerators?.string) {
      return customGenerators.string(key)
    }
    return getRandomString(key)
  }
  // Handles ZodNumber.
  // @description ZodNumber 타입을 처리합니다.
  if (schema instanceof ZodNumber) {
    return customGenerators?.number
      ? customGenerators.number()
      : getRandomNumber()
  }
  // Handles ZodBoolean.
  // @description ZodBoolean 타입을 처리합니다.
  if (schema instanceof ZodBoolean) {
    return customGenerators?.boolean
      ? customGenerators.boolean()
      : getRandomBoolean()
  }
  // Handles ZodDate.
  // @description ZodDate 타입을 처리합니다.
  if (schema instanceof ZodDate) {
    return customGenerators?.dateTime
      ? customGenerators.dateTime()
      : getRandomDateTime()
  }

  // Handles ZodNativeEnum.
  // Example: z.nativeEnum(MyTSEnum)
  // @description ZodNativeEnum 타입을 처리합니다.
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

  // Handles ZodTuple types.
  // Example: z.tuple([z.string(), z.number()])
  // @description ZodTuple 타입을 처리합니다.
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

  // Handles ZodEnum types.
  // Example: z.enum(["A", "B", "C"])
  // @description ZodEnum 타입을 처리합니다.
  if (schema instanceof ZodEnum) {
    if (strategy === "fixed") {
      return schema.options[0]
    }
    const options = schema.options
    return options[Math.floor(Math.random() * options.length)]
  }

  // Handles ZodLiteral types.
  // Example: z.literal("hello")
  // @description ZodLiteral 타입을 처리합니다.
  if (schema instanceof ZodLiteral) {
    return schema.value
  }

  // Handles ZodUnion types.
  // Example: z.union([z.string(), z.number()])
  // @description ZodUnion 타입을 처리합니다.
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

  // Handles ZodDiscriminatedUnion types.
  // Example: z.discriminatedUnion("type", [z.object({ type: z.literal("a") }), ...])
  // @description ZodDiscriminatedUnion 타입을 처리합니다.
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

  // Handles ZodIntersection types.
  // Example: z.intersection(z.object({ a: ... }), z.object({ b: ... }))
  // @description ZodIntersection 타입을 처리합니다.
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
