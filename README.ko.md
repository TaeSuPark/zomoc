[English](./README.md) | [한국어](./README.ko.md)

---

# Zomoc: 타입-안전 API 모킹을 위한 Vite 플러그인

Zomoc은 불안정하거나, 수시로 변경되거나, 아직 개발이 완료되지 않은 백엔드 API 때문에 프론트엔드 개발이 막히지 않도록 **API와의 의존성을 분리(decouple)**해주는 Vite 플러그인입니다. 여러분이 정의한 TypeScript 인터페이스를 기반으로 목(mock) 데이터를 자동으로 생성해주기 때문에, API의 데이터 구조가 변경되더라도 항상 최신 상태를 유지하며 안심하고 UI 개발에 집중할 수 있습니다.

Zomoc은 '설정이 전혀 없는(zero-config)' 도구는 아닙니다. 대신 **'최소한의 설정(low-config)'**으로 최대의 효과를 내는 것을 목표로 합니다. `vite.config.ts`에 몇 줄만 추가하면, 백엔드의 상태와 상관없이 독립적으로 프론트엔드 개발을 이어나갈 수 있는 강력한 타입-안전 개발 환경이 만들어집니다.

## ✨ Zomoc, 이럴 때 사용하면 좋아요!

- **안정적인 개발 환경**: 실제 API 서버가 불안정하거나 갑자기 바뀌어도, 프론트엔드 개발 흐름이 끊기지 않도록 보호해줍니다.
- **신뢰할 수 있는 데이터 구조**: 목 데이터의 구조가 항상 최신 TypeScript 인터페이스와 일치함을 보장하여, 데이터 타입 불일치로 인한 버그를 원천적으로 차단합니다.
- **높은 자동화**: 여러분의 타입 정의에 맞춰 목 데이터를 자동으로 생성하고 항상 최신 상태로 동기화합니다.
- **유연한 파일 관리**: Glob 패턴을 지원하여, 프로젝트 어디에든 원하는 방식으로 목 정의 파일과 타입 파일을 둘 수 있습니다.
- **동적 경로 지원**: `/users/:id` 와 같은 동적 URL 패턴을 별도 설정 없이 바로 사용할 수 있습니다.
- **실시간 리로딩(HMR)**: 목 데이터나 타입 파일을 수정하면, 페이지 새로고침 없이 즉시 반영됩니다.
- **커스텀 데이터 생성**: `@faker-js/faker`와 같은 라이브러리를 연결하여, 실제 데이터처럼 풍부한 목 데이터를 만들 수 있습니다.

## 📦 설치하기

```bash
npm install -D zomoc
```

> **참고**: `zomoc`은 `axios`, `zod`를 peer 의존성으로 사용합니다. npm 7버전 이상에서는 이 패키지들이 프로젝트에 없다면 자동으로 함께 설치됩니다.

## 🚀 3단계로 시작하기

다음 3단계만 따라 하면 Zomoc을 바로 사용할 수 있습니다.

### 1단계: Vite & TypeScript 설정

`vite.config.ts`에 `zomoc` 플러그인을 추가하고, `tsconfig.json`이 Zomoc의 가상 모듈을 인식할 수 있도록 설정해 주세요.

**`vite.config.ts`**

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import zomoc from "zomoc/vite"

export default defineConfig({
  plugins: [
    zomoc(), // zomoc 플러그인을 추가합니다
  ],
})
```

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    // ... 다른 옵션들
    "types": ["zomoc/client"]
  }
}
```

### 2단계: 목 데이터와 타입 정의하기

`mock.json` 파일과, 여기에 매핑될 `types.ts` 파일을 만듭니다.

**`src/api/mock.json`**

```json
{
  "GET /users": "IUserListResponse"
}
```

**`src/api/types.ts`**

```typescript
export interface IUser {
  id: string
  name: string
  email: string
}

export interface IUserListResponse {
  users: IUser[]
  total: number
}
```

### 3단계: 인터셉터 설정하기

사용하는 `axios` 인스턴스에 Zomoc 인터셉터를 연결합니다.

```typescript
// src/shared/api/index.ts
import axios from "axios"
import { setupMockingInterceptor } from "zomoc"
import { finalSchemaUrlMap } from "virtual:zomoc" // Zomoc이 제공하는 가상 모듈입니다

const api = axios.create({ baseURL: "https://api.example.com" })

// zomoc이 이 axios 인스턴스의 요청을 가로채도록 설정합니다
setupMockingInterceptor(api, {
  enabled: import.meta.env.DEV, // 개발 환경에서만 모킹을 활성화합니다
  registry: finalSchemaUrlMap,
  debug: true, // (선택) 콘솔에 목킹된 요청을 로그로 출력합니다
})

export { api }
```

이제 모든 설정이 끝났습니다! 개발 서버를 실행하고 앱에서 `api.get('/users')`를 호출하면, Zomoc이 타입-안전한 목 데이터를 대신 응답해줄 겁니다.

## 📚 상세 가이드

더 자세한 설정이나 고급 기능이 궁금하신가요?

### 파일 경로 변경하기

기본적으로 Zomoc은 `**/mock.json`, `**/interface.ts`, `**/type.ts` 파일을 찾습니다. `vite.config.ts`에서 이 경로를 원하는 대로 바꿀 수 있습니다.

```typescript
// vite.config.ts
import zomoc from "zomoc/vite"

export default {
  plugins: [
    zomoc({
      // 목 정의 파일의 경로 패턴
      mockPaths: ["src/features/**/mock.json"],
      // 타입 정의 파일의 경로 패턴
      interfacePaths: ["src/features/**/model/*.ts"],
    }),
  ],
}
```

### 더 진짜 같은 데이터 만들기 (Custom Data Generators)

기본적으로 `zomoc`은 간단한 임시 데이터를 생성합니다. `@faker-js/faker` 같은 라이브러리를 사용해 더 현실적인 데이터를 만들고 싶다면, `customGenerators` 옵션을 사용해 보세요.

**1. 먼저, faker를 설치합니다.**

```bash
npm install -D @faker-js/faker
```

**2. 커스텀 생성기를 만들어 인터셉터에 전달합니다.**

```typescript
// src/shared/api/index.ts
import { setupMockingInterceptor, type CustomGenerators } from "zomoc"
import { faker } from "@faker-js/faker"

// 나만의 데이터 생성 규칙을 만듭니다
const customGenerators: CustomGenerators = {
  string: (key) => {
    // 프로퍼티 키(key)에 따라 다른 데이터를 생성
    if (key.toLowerCase().includes("email")) return faker.internet.email()
    if (key.toLowerCase().includes("name")) return faker.person.fullName()
    return faker.lorem.sentence()
  },
  number: () => faker.number.int({ max: 1000 }),
}

setupMockingInterceptor(api, {
  // ...다른 설정들
  customGenerators,
})
```

이렇게 하면, `zomoc`이 데이터를 생성할 때 여러분이 만든 규칙을 따르게 됩니다.
