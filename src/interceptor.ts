// src/shared/lib/mockingInterceptor.ts
import { createMockDataFromZodSchema } from "./generator"
import type { ZodTypeAny } from "zod"
import type { AxiosInstance } from "axios"

export interface SetupMockingInterceptorOptions {
  enabled: boolean
  registry: Record<string, ZodTypeAny>
  debug?: boolean
}

export function setupMockingInterceptor(
  instance: AxiosInstance,
  options: SetupMockingInterceptorOptions
) {
  const { enabled, registry, debug = false } = options

  if (!enabled) {
    return
  }

  const onFulfilled = async (config: any) => {
    const { url, method } = config

    if (!url || !method) return config

    const requestMethod = method.toUpperCase()
    const requestKey = `${requestMethod} ${url}`

    // Find a matching key in the registry
    if (registry[requestKey]) {
      const schema = registry[requestKey]
      const mockData = createMockDataFromZodSchema(schema)

      if (debug) {
        console.groupCollapsed(
          `%c[Zomoc] Mocked Request: %c${requestMethod} ${url}`,
          "color: #6e28d9; font-weight: bold;",
          "color: #10b981;"
        )
        console.log("%cMatched Key:", "font-weight: bold;", requestKey)
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
    }

    return config
  }

  const onRejected = (error: any) => {
    return Promise.reject(error)
  }

  instance.interceptors.request.use(onFulfilled, onRejected)
}
