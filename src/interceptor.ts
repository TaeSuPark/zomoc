// src/shared/lib/mockingInterceptor.ts
import { AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { z, ZodTypeAny } from "zod"
import { createMockDataFromZodSchema } from "./generator.js"

/**
 * Options for setting up the mocking interceptor.
 */
export interface MockingInterceptorOptions {
  /**
   * A boolean to explicitly enable or disable mocking.
   * The user is responsible for checking their own environment variables.
   */
  enabled?: boolean
  /**
   * The generated mock registry object.
   * The user should import `finalSchemaUrlMap` from the generated `mock.registry.ts`
   * and pass it here.
   */
  registry?: { [key: string]: ZodTypeAny }
}

/**
 * 요청 URL과 finalSchemaUrlMap을 비교하여 일치하는 Zod 스키마를 찾습니다.
 * 동적 경로(:param)를 지원합니다.
 * @param url - 요청 URL
 * @param registry - The mock data registry.
 * @returns 찾은 Zod 스키마 또는 undefined
 */
function findSchemaForUrl(
  url: string,
  registry: { [key: string]: ZodTypeAny }
): z.ZodTypeAny | undefined {
  // 1. 완전 일치하는 URL이 있는지 먼저 확인합니다.
  if (registry[url]) {
    return registry[url]
  }

  // 2. 동적 경로 패턴을 확인합니다.
  const urlParts = url.split("/").filter(Boolean)
  const schemaEntries = Object.entries(registry)

  for (const [pattern, schema] of schemaEntries) {
    const patternParts = pattern.split("/").filter(Boolean)

    if (urlParts.length !== patternParts.length) {
      continue
    }

    const isMatch = patternParts.every((part, index) => {
      // 패턴 부분이 플레이스홀더(:)로 시작하거나, URL 부분과 정확히 일치하면 매칭 성공입니다.
      return part.startsWith(":") || part === urlParts[index]
    })

    if (isMatch) {
      return schema as z.ZodTypeAny
    }
  }

  return undefined
}

/**
 * Axios 인스턴스에 목킹 인터셉터를 설정합니다.
 * 이 인터셉터는 요청을 가로채서 finalSchemaUrlMap에 등록된 URL인 경우,
 * 실제 네트워크 요청 대신 목 데이터를 반환하도록 요청의 어댑터를 동적으로 변경합니다.
 * @param instance - 인터셉터를 추가할 Axios 인스턴스
 * @param options - An options object to configure the interceptor.
 */
export function setupMockingInterceptor(
  instance: AxiosInstance,
  options?: MockingInterceptorOptions
) {
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // 1. 목킹 기능이 명시적으로 활성화되지 않았거나, 레지스트리가 없으면 즉시 요청을 그대로 반환합니다.
      if (options?.enabled !== true || !options.registry) {
        return config
      }

      // 2. 요청 URL에 해당하는 스키마가 목킹 레지스트리에 있는지 확인합니다. (동적 경로 지원)
      const schema = findSchemaForUrl(config.url || "", options.registry)

      // 3. 스키마가 존재한다면 (목킹 대상이라면)
      if (schema) {
        console.log(`[Mock Interceptor] Mocking response for: ${config.url}`)
        const mockData = createMockDataFromZodSchema(schema)

        // 4. 이 '요청 하나에만' 적용될 임시 어댑터를 만들어,
        //    네트워크 요청 대신 목 데이터를 즉시 반환하도록 설정합니다.
        config.adapter = () => {
          return Promise.resolve({
            data: mockData,
            status: 200,
            statusText: "OK (mocked)",
            headers: { "x-mocked": "true" },
            config: config,
          })
        }
      }

      // 5. 스키마가 없으면 (목킹 대상이 아니면) 아무것도 변경하지 않고 요청을 그대로 반환합니다.
      return config
    }
  )
}
