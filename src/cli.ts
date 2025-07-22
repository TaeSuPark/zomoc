/**
 * Zomoc Library Entry Point for CLI and Tooling
 *
 * This file serves as a secondary entry point, primarily intended for use
 * in command-line interfaces (CLI) or other build-time tooling.
 * It exports the same public APIs as the main `index.ts` but allows for
 * separate module resolution strategies depending on the environment.
 *
 * @description Zomoc 라이브러리 CLI 및 도구용 진입점
 *
 * 이 파일은 주로 커맨드 라인 인터페이스(CLI)나 빌드 시점의 다른 도구에서
 * 사용하기 위한 보조 진입점 역할을 합니다.
 * 메인 `index.ts`와 동일한 공개 API를 노출하지만,
 * 환경에 따라 다른 모듈 해석 전략을 사용할 수 있도록 합니다.
 */

export { setupMockingInterceptor } from "./interceptor"
export { createGenerator } from "./public"

export type {
  SetupMockingInterceptorOptions,
  CustomGenerators,
  RegistryValue,
} from "./types"
