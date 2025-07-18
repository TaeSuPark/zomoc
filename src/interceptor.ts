// src/shared/lib/mockingInterceptor.ts
import { createMockDataFromZodSchema } from "./generator"
import type { AxiosInstance } from "axios"
import { match } from "path-to-regexp"
import type { SetupMockingInterceptorOptions } from "./types"

export function setupMockingInterceptor(
  instance: AxiosInstance,
  options: SetupMockingInterceptorOptions
) {
  const { enable = true, registry, debug = false, customGenerators } = options

  if (!enable) {
    return
  }

  const onFulfilled = async (config: any) => {
    const { url, method } = config

    if (!url || !method) return config

    const requestMethod = method.toUpperCase()

    for (const key in registry) {
      const parts = key.split(" ")
      if (parts.length < 2) continue

      const mockMethod = parts[0].toUpperCase()
      const mockUrlPattern = parts.slice(1).join(" ")

      if (requestMethod !== mockMethod) {
        continue
      }

      const matchFn = match(mockUrlPattern, { decode: decodeURIComponent })
      const matchResult = matchFn(url)

      if (matchResult) {
        const { schema, pagination, strategy, repeatCount } = registry[key]

        let mockData
        if (pagination) {
          const pageKey = pagination.pageKey ?? "page"
          const sizeKey = pagination.sizeKey ?? "size"

          const page = config.params?.[pageKey] ?? config.data?.[pageKey] ?? 1
          const size = config.params?.[sizeKey] ?? config.data?.[sizeKey] ?? 10

          const itemSchema = (schema as any).shape[pagination.itemsKey]
          const pageData = createMockDataFromZodSchema(
            itemSchema,
            "",
            customGenerators,
            size,
            page,
            strategy
          )

          mockData = {
            [pagination.itemsKey]: pageData,
            [pagination.totalKey]: 100, //  Dummy total
            [pageKey]: page,
          }
        } else {
          mockData = createMockDataFromZodSchema(
            schema,
            "",
            customGenerators,
            repeatCount,
            0,
            strategy
          )
        }

        if (debug) {
          const isServer = typeof window === "undefined"

          if (isServer) {
            // 서버 환경 (Node.js)에서는 groupCollapsed를 사용할 수 없으므로 단순 로그 사용
            console.log(`[Zomoc] Mocked Request: ${requestMethod} ${url}`)
            console.log(`  - Pattern: ${key}`)
            if (Object.keys(matchResult.params).length > 0) {
              console.log("  - Matched Params:", matchResult.params)
            }
            // 서버에서는 객체를 보기 좋게 출력하기 위해 JSON.stringify 사용
            console.log(
              "  - Generated Mock Data:",
              JSON.stringify(mockData, null, 2)
            )
          } else {
            // 브라우저 환경에서는 기존의 보기 좋은 그룹 로그 사용
            console.groupCollapsed(
              `%c[Zomoc] Mocked Request: %c${requestMethod} ${url}`,
              "color: #6e28d9; font-weight: bold;",
              "color: #10b981;"
            )
            console.log("%cURL Pattern:", "font-weight: bold;", key)
            if (Object.keys(matchResult.params).length > 0) {
              console.log(
                "%cMatched Params:",
                "font-weight: bold;",
                matchResult.params
              )
            }
            console.log(
              "%cGenerated Mock Data:",
              "font-weight: bold;",
              mockData
            )
            console.log("%cUsed Zod Schema:", "font-weight: bold;", schema)
            console.groupEnd()
          }
        }

        config.adapter = (config: any) => {
          return new Promise((resolve) => {
            const res = {
              data: mockData,
              status: 200,
              statusText: "OK",
              headers: { "x-zomoc-mocked": "true" },
              config,
              request: {},
            }
            resolve(res as any)
          })
        }
        break // Stop after finding the first matching pattern
      }
    }

    return config
  }

  const onRejected = (error: any) => {
    return Promise.reject(error)
  }

  instance.interceptors.request.use(onFulfilled, onRejected)
}
