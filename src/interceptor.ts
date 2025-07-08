// src/shared/lib/mockingInterceptor.ts
import { createMockDataFromZodSchema, CustomGenerators } from "./generator"
import type { ZodTypeAny } from "zod"
import type { AxiosInstance } from "axios"
import { match } from "path-to-regexp"

export interface SetupMockingInterceptorOptions {
  enabled: boolean
  registry: Record<string, ZodTypeAny>
  debug?: boolean
  customGenerators?: CustomGenerators
}

export function setupMockingInterceptor(
  instance: AxiosInstance,
  options: SetupMockingInterceptorOptions
) {
  const { enabled, registry, debug = false, customGenerators } = options

  if (!enabled) {
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
        const schema = registry[key]
        const mockData = createMockDataFromZodSchema(
          schema,
          "",
          customGenerators
        )

        if (debug) {
          console.groupCollapsed(
            `%c[Zomoc] Mocked Request: %c${requestMethod} ${url}`,
            "color: #6e28d9; font-weight: bold;",
            "color: #10b981;"
          )
          console.log("%cURL Pattern:", "font-weight: bold;", key)
          console.log(
            "%cMatched Params:",
            "font-weight: bold;",
            matchResult.params
          )
          console.log("%cGenerated Mock Data:", "font-weight: bold;", mockData)
          console.log("%cUsed Zod Schema:", "font-weight: bold;", schema)
          console.groupEnd()
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
