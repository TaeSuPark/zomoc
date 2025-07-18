// CLI 사용자를 위한 진입점
// Vite의 가상 모듈을 사용하지 않고, 생성된 .zomoc/registry.ts 파일을 직접 사용하려는 환경을 위함

export { setupMockingInterceptor } from "./interceptor"
export type {
  SetupMockingInterceptorOptions,
  CustomGenerators,
  RegistryValue,
} from "./types"
