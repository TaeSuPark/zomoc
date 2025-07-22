/**
 * Zomoc Library Main Entry Point
 *
 * This file serves as the main entry point for the Zomoc library.
 * It exposes the primary public APIs, including functions for setting up mock interception,
 * creating data generators, and all necessary TypeScript types for configuration and usage.
 *
 * @description Zomoc 라이브러리 메인 진입점
 *
 * 이 파일은 Zomoc 라이브러리의 메인 진입점 역할을 합니다.
 * Mock 인터셉터 설정, 데이터 생성기 생성 등 핵심 기능의 함수와
 * 설정 및 사용에 필요한 모든 타입스크립트 타입을 포함하는 기본 공개 API를 노출합니다.
 */

// --- Public Functions ---
export { setupMockingInterceptor } from "./interceptor"
export { createGenerator } from "./public"

// --- Public Types ---
export type {
  SetupMockingInterceptorOptions,
  CustomGenerators,
  RegistryValue,
} from "./types"
