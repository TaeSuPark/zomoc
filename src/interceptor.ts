// src/shared/lib/mockingInterceptor.ts
import { createMockDataFromZodSchema } from "./generator"
import type { AxiosInstance, AxiosResponse } from "axios"
import { match } from "path-to-regexp"
import type { SetupMockingInterceptorOptions } from "./types"

const STATUS_TEXTS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
}

/**
 * Sets up an axios request interceptor to mock API responses.
 * When an outgoing request matches a URL pattern in the registry, the interceptor
 * hijacks the request and returns a mock response generated from the associated Zod schema,
 * instead of making an actual network call.
 * @description API 응답을 모킹하기 위한 axios 요청 인터셉터를 설정합니다.
 * 나가는 요청이 레지스트리에 등록된 URL 패턴과 일치하면, 인터셉터는 실제 네트워크 호출 대신
 * 연결된 Zod 스키마로부터 생성된 Mock 응답을 반환합니다.
 *
 * @param instance - The axios instance to attach the interceptor to.
 * @param options - Configuration options for the interceptor.
 */
export function setupMockingInterceptor(
  instance: AxiosInstance,
  options: SetupMockingInterceptorOptions
) {
  const { enabled = true, registry, debug = false, customGenerators } = options

  // The interceptor is disabled, do nothing.
  // @description 인터셉터가 비활성화되어 있으면 아무 작업도 수행하지 않습니다.
  if (!enabled) {
    return
  }

  // This is the core interception logic that runs for every request.
  // @description 모든 요청에 대해 실행되는 핵심 인터셉트 로직입니다.
  const onFulfilled = async (config: any) => {
    const { url, method } = config

    if (!url || !method) return config

    const requestMethod = method.toUpperCase()

    // Iterate over all registered URL patterns in the registry.
    // @description 레지스트리에 등록된 모든 URL 패턴을 순회합니다.
    for (const registeredPattern in registry) {
      const parts = registeredPattern.split(" ")
      if (parts.length < 2) continue

      const mockMethod = parts[0].toUpperCase()
      const mockUrlPattern = parts.slice(1).join(" ")

      // Skip if the HTTP method does not match.
      // @description HTTP 메소드가 일치하지 않으면 건너뜁니다.
      if (requestMethod !== mockMethod) {
        continue
      }

      // Use path-to-regexp to check if the request URL matches the pattern.
      // @description `path-to-regexp`를 사용하여 요청 URL이 패턴과 일치하는지 확인합니다.
      const matchFn = match(mockUrlPattern, { decode: decodeURIComponent })
      const matchResult = matchFn(url)

      // If a match is found, proceed to generate mock data.
      // @description 일치하는 패턴을 찾으면, Mock 데이터 생성을 진행합니다.
      if (matchResult) {
        const {
          schema,
          responseBody,
          status,
          pagination,
          strategy,
          repeatCount,
        } = registry[registeredPattern]

        let mockData

        if (responseBody !== undefined) {
          mockData = responseBody
        } else if (schema) {
          if (pagination) {
            const pageKey = pagination.pageKey ?? "page"
            const sizeKey = pagination.sizeKey ?? "size"

            const page = config.params?.[pageKey] ?? config.data?.[pageKey] ?? 1
            const size =
              config.params?.[sizeKey] ?? config.data?.[sizeKey] ?? 10

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
              [pagination.totalKey]: 100, // Dummy total
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
        } else {
          mockData = {
            message: `[Zomoc] No responseBody or schema found for this route. Defaulting response.`,
          }
        }

        if (debug) {
          const isServer = typeof window === "undefined"
          if (isServer) {
            console.log(`[Zomoc] Mocked Request: ${requestMethod} ${url}`)
            console.log(`  - Pattern: ${registeredPattern}`)
            if (Object.keys(matchResult.params).length > 0) {
              console.log("  - Matched Params:", matchResult.params)
            }
            console.log(
              "  - Generated Mock Data:",
              JSON.stringify(mockData, null, 2)
            )
          } else {
            console.groupCollapsed(
              `%c[Zomoc] Mocked Request: %c${requestMethod} ${url}`,
              "color: #6e28d9; font-weight: bold;",
              "color: #10b981;"
            )
            console.log(
              "%cURL Pattern:",
              "font-weight: bold;",
              registeredPattern
            )
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
            console.groupEnd()
          }
        }

        config.adapter = (config: any) => {
          return new Promise((resolve, reject) => {
            const res: AxiosResponse = {
              data: mockData,
              status: status,
              statusText: STATUS_TEXTS[status] ?? "Unknown Status",
              headers: { "x-zomoc-mocked": "true" },
              config,
              request: {},
            }

            if (status >= 400) {
              // Mimic AxiosError structure for better compatibility
              const error = {
                isAxiosError: true,
                response: res,
                config: config,
                toJSON: () => ({
                  message: `Request failed with status code ${status}`,
                  name: "AxiosError",
                  config,
                  response: {
                    data: res.data,
                    status: res.status,
                    headers: res.headers,
                  },
                }),
              }
              reject(error)
            } else {
              resolve(res)
            }
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
