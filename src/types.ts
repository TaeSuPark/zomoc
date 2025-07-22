import { ZodType } from "zod"

export interface ZomocCoreOptions {
  mockPaths?: string[]
  interfacePaths?: string[]
}

export interface ZomocVitePluginOptions extends ZomocCoreOptions {}

export interface CustomGenerators {
  string?: (key: string) => string
  number?: () => number
  boolean?: () => boolean
  dateTime?: () => string
}

export interface RegistryValue {
  schema: ZodType
  pagination?: {
    itemsKey: string
    totalKey: string
    pageKey?: string
    sizeKey?: string
  }
  strategy?: "random" | "fixed"
  repeatCount?: number
}

export type MockDataRegistry = Record<string, RegistryValue>
export type UrlRegistry = Record<string, RegistryValue>
export type TypeRegistry = Record<string, ZodType>

export interface SetupMockingInterceptorOptions {
  /**
   * @description mocking interceptor를 활성화할지 여부를 결정합니다.
   * @default true
   */
  enabled?: boolean
  /**
   * @description zomoc으로 생성된 registry 객체를 전달합니다.
   */
  registry: UrlRegistry
  /**
   * @description zomoc의 디버그 모드를 활성화합니다.
   * @default false
   */
  debug?: boolean
  /**
   * @description zod-mock의 generator를 커스텀할 수 있습니다.
   */
  customGenerators?: CustomGenerators
}
