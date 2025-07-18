[English](./README.md) | [한국어](./README.ko.md)

---

# Zomoc: 타입-안전 API 모킹 도구

Zomoc은 TypeScript 인터페이스를 기반으로 실제와 같은 목(mock) 데이터를 자동으로 생성하여, 불안정한 백엔드 API로부터 프론트엔드 개발을 분리해주는 도구입니다. **Next.js, Create React App 등 Vite를 사용하지 않는 환경에서도 CLI를 통해 적용**할 수 있으며, **Vite 환경에서는 플러그인으로 긴밀하게 통합**되어 편리한 개발 경험을 제공합니다.

Zomoc은 '설정이 전혀 없는(zero-config)' 도구는 아닙니다. 대신 **'최소한의 설정(low-config)'**으로 최대의 효과를 내는 것을 목표로 합니다. 몇 줄의 설정만으로 백엔드의 상태와 상관없이 독립적으로 프론트엔드 개발을 이어나갈 수 있는 강력한 타입-안전 개발 환경이 만들어집니다.

## ✨ Zomoc, 이럴 때 사용하면 좋아요!

- **안정적인 개발 환경**: 실제 API 서버가 불안정하거나 갑자기 바뀌어도, 프론트엔드 개발 흐름이 끊기지 않도록 보호해줍니다.
- **신뢰할 수 있는 데이터 구조**: 목 데이터의 구조가 항상 최신 TypeScript 인터페이스와 일치함을 보장하여, 데이터 타입 불일치로 인한 버그를 원천적으로 차단합니다.
- **높은 자동화**: 여러분의 타입 정의에 맞춰 목 데이터를 자동으로 생성하고 항상 최신 상태로 동기화합니다.
- **유연한 파일 관리**: Glob 패턴을 지원하여, 프로젝트 어디에든 원하는 방식으로 목 정의 파일과 타입 파일을 둘 수 있습니다.
- **동적 경로 지원**: `/users/:id` 와 같은 동적 URL 패턴을 별도 설정 없이 바로 사용할 수 있습니다.
- **페이지네이션 지원**: 페이지네이션 API 응답을 자동으로 생성하며, 일반 배열과 페이지네이션 배열 타입을 모두 지능적으로 처리합니다.
- **커스텀 데이터 생성**: `@faker-js/faker`와 같은 라이브러리를 연결하여, 실제 데이터처럼 풍부한 목 데이터를 만들 수 있습니다.

## 📦 설치하기

```bash
npm install -D zomoc
```

> **참고**: `zomoc`은 `axios`, `zod`를 peer 의존성으로 사용합니다. npm 7버전 이상에서는 이 패키지들이 프로젝트에 없다면 자동으로 함께 설치됩니다.

## 🚀 시작하기 (CLI)

Vite를 사용하지 않는 환경(Next.js, Create React App 등)에서는 CLI를 통해 `zomoc`을 사용할 수 있습니다. 이 방식은 Vite의 가상 모듈 대신, 실제 설정 파일을 생성하여 작동합니다.

### 1단계: 목 데이터와 타입 정의하기

`mock.json` 파일과, 여기에 매핑될 `interface.ts` 파일을 만듭니다.

**`src/api/mock.json`**

```json
{
  "GET /users": "IUserListResponse"
}
```

**`src/api/interface.ts`**

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

### 2단계: 레지스트리 파일 생성

터미널에서 `generate` 명령어를 실행하여 목 설정 파일을 생성합니다.

```bash
npx zomoc generate
```

이 명령어는 프로젝트 루트에 `.zomoc/registry.ts` 파일을 생성합니다. `mock.json`이나 타입 파일이 변경될 때마다 이 명령어를 다시 실행해야 합니다.

> **Pro-Tip**: `package.json`의 `scripts`에 `dev` 명령어와 함께 `npx zomoc generate --watch`를 실행하도록 설정하면, 파일 변경 시 자동으로 갱신되어 개발 경험을 크게 향상시킬 수 있습니다.

### 3단계: 인터셉터 설정하기

CLI가 생성한 `.zomoc/registry.ts` 파일을 직접 `import`하여 인터셉터를 설정합니다.

```typescript
// src/shared/api/index.ts
import axios from "axios"
// 'zomoc' 대신 'zomoc/cli'를 사용합니다.
import { setupMockingInterceptor } from "zomoc/cli"
// 생성된 파일을 직접 import 합니다.
import { finalSchemaUrlMap } from "../../.zomoc/registry"

const api = axios.create({ baseURL: "https://api.example.com" })

setupMockingInterceptor(api, {
  enabled: process.env.NODE_ENV === "development",
  registry: finalSchemaUrlMap,
  debug: true, // (선택) 콘솔에 목킹된 요청을 로그로 출력합니다
})

export { api }
```

---

## 🚀 시작하기 (Vite 플러그인)

Vite 환경에서는 다음 3단계만 따라 하면 Zomoc을 바로 사용할 수 있습니다.

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

`mock.json` 파일과, 여기에 매핑될 `interface.ts` 파일을 만듭니다.

**`src/api/mock.json`**

```json
{
  "GET /users": "IUserListResponse"
}
```

**`src/api/interface.ts`**

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

## Vite 플러그인 vs. CLI: 무엇을 써야 할까요?

| 구분               | Vite 플러그인      | CLI                                            |
| :----------------- | :----------------- | :--------------------------------------------- |
| **워크플로우**     | 완전 자동 (HMR)    | 수동 (`generate` 실행) 또는 반자동 (`--watch`) |
| **설정**           | `vite.config.ts`   | `package.json` 스크립트                        |
| **핵심 정보 전달** | 가상 모듈 (추상적) | 실제 파일 생성 (명시적)                        |

- **Vite 프로젝트를 사용 중이라면,** 고민 없이 **Vite 플러그인**을 사용하세요. 최고의 개발 경험을 제공합니다.
- **Next.js, CRA 등 다른 환경이라면,** **CLI**를 사용하세요. `--watch` 옵션을 함께 사용하면 매우 편리합니다.

## 📚 심층 가이드

이 섹션에서는 고급 설정 및 기능에 대해 설명합니다.

### 페이지네이션 Mocking

Zomoc은 페이지네이션된 API 응답을 지능적으로 할 수 있습니다. 특정 엔드포인트에 `pagination` 구성이 제공되면, Zomoc은 요청(쿼리 파라미터 또는 본문)에서 페이지와 크기를 읽어 요청된 만큼의 아이템을 정확하게 생성합니다.

**1. `mock.json`에서 `pagination` 객체를 설정합니다:**

`mock.json`에서 단순히 타입 이름 문자열 대신, `responseType`과 `pagination` 키를 가진 객체를 사용합니다.

**`src/api/mock.json`**

```json
{
  "GET /users": {
    "responseType": "IUserListResponse",
    "pagination": {
      "itemsKey": "users",
      "totalKey": "total",
      "pageKey": "page",
      "sizeKey": "size"
    }
  }
}
```

- `itemsKey`: 응답 객체에서 실제 아이템 배열을 담고 있는 키 (예: `users`).
- `totalKey`: 전체 아이템 개수를 나타내는 키 (예: `total`).
- `pageKey`: 요청의 쿼리 파라미터나 본문에 있는 페이지 번호 키 (기본값: `"page"`).
- `sizeKey`: 요청의 쿼리 파라미터나 본문에 있는 페이지 크기 키 (기본값: `"size"`).

만약 API 호출 시 이 파라미터들을 제공하지 않으면, Zomoc은 기본값(`page: 1`, `size: 10`)을 사용합니다.

**2. 페이지네이션 파라미터와 함께 API를 호출합니다:**

```typescript
// 예: GET /users?page=1&size=10
api.get("/users", { params: { page: 1, size: 10 } })
```

Zomoc이 이 요청을 가로채고, `users` 배열에 정확히 10개의 목 아이템이 담긴 응답을 반환할 것입니다.

> **참고**: 페이지네이션이 설정된 엔드포인트의 경우, `zomoc`은 요청된 수만큼의 아이템을 생성합니다. 페이지네이션이 설정되지 않은 일반 배열 응답(예: `IUser[]`)의 경우, 데이터가 더 동적으로 느껴지도록 1~3개 사이의 임의의 개수 아이템을 자동으로 생성합니다.

### 배열 길이 제어하기

페이지네이션이 적용되지 않은 배열을 반환하는 엔드포인트의 경우, `repeatCount` 옵션을 사용하여 생성할 아이템의 정확한 개수를 지정할 수 있습니다. 이 옵션이 제공되지 않으면 1~3개의 무작위 개수의 아이템이 생성됩니다.

페이지네이션 응답(객체 안에 배열이 포함된 형태)과는 달리, 이 기능은 **API가 직접 배열을 반환**하는 경우를 위한 것입니다.

이 기능을 사용하려면, 먼저 인터페이스 파일에서 배열에 대한 `type`을 명시적으로 정의하고 `export`해야 합니다. Zomoc이 `repeatCount` 로직을 올바르게 적용하기 위해서는 배열에 해당하는 Zod 스키마(`ZodArray`)를 찾아야 하기 때문입니다.

**1. 배열 타입을 정의하고 `export` 합니다:**

**`interface.ts`**

```typescript
export interface ITag {
  id: number
  name: string
}

// 배열 타입을 명시적으로 정의하고 export 합니다.
export type ITagList = ITag[]
```

**2. `mock.json`에서 배열 타입의 이름을 사용합니다:**

**`mock.json`**

```json
{
  "GET /api/tags": {
    "responseType": "ITagList",
    "repeatCount": 5
  }
}
```

이 설정은 항상 정확히 5개의 `ITag` 아이템을 가진 배열을 반환합니다.

> **주요 차이점: `repeatCount` vs. `pagination`** > `repeatCount`와 `pagination`을 언제 사용해야 하는지 이해하는 것이 중요합니다.
>
> - **`repeatCount` 사용 경우:** API 응답 자체가 **배열**일 때. `responseType`은 반드시 배열 타입(예: `type MyArray = Item[]`)이어야 합니다.
> - **`pagination` 사용 경우:** API 응답이 **배열을 포함한 객체**일 때. `responseType`은 반드시 객체 타입이어야 합니다.
>
> 객체 타입인 `responseType`에 `repeatCount`를 적용해도 그 객체 내부 배열의 길이에 **영향을 주지 않습니다.** 내부 배열들은 기본적으로 1~3개의 무작위 길이를 갖게 됩니다.

### 한눈에 보기: 빠른 가이드

API 응답 형태에 따라 어떤 설정을 사용해야 할지 결정하는 데 도움이 되는 요약 테이블입니다.

| 여러분의 API 응답...                                  | 여러분의 목표                | `mock.json` 설정            | 결과                                      |
| :---------------------------------------------------- | :--------------------------- | :-------------------------- | :---------------------------------------- |
| **배열을 포함한 객체**<br/>(예: `{ users: [], ... }`) | 요청을 통해 배열 길이 제어   | **`pagination`** 객체 사용  | 배열 길이가 요청의 `size` 파라미터와 일치 |
| **배열을 포함한 객체**<br/>(예: `{ users: [], ... }`) | Zomoc이 길이를 결정하도록 함 | `pagination` 객체 생략      | 내부 배열이 무작위 길이(1-3)를 가짐       |
| **자체가 배열**<br/>(예: `[{}, {}]`)                  | 고정된 배열 길이 설정        | **`repeatCount`** 숫자 사용 | 배열 길이가 `repeatCount`와 일치          |
| **자체가 배열**<br/>(예: `[{}, {}]`)                  | Zomoc이 길이를 결정하도록 함 | `repeatCount` 숫자 생략     | 배열이 무작위 길이(1-3)를 가짐            |

**중요:** 배열인 `responseType`에 `pagination`을 사용하거나, 객체인 `responseType`에 `repeatCount`가 작동할 것으로 기대하지 마세요. 이를 혼용하면 예상치 못한 동작이나 오류가 발생할 수 있습니다.

### Mocking 전략: 고정(Fixed) vs. 무작위(Random)

인터페이스의 `union` 타입(`'a' | 'b'`)이나 `enum` 타입을 위해 `zomoc`이 Mocking 데이터를 생성하는 방식을 제어할 수 있습니다. 이는 예측 가능한 테스트를 작성할 때 특히 유용합니다.

**1. `mock.json`에서 `mockingStrategy`를 설정합니다:**

```json
{
  "GET /api/status": {
    "responseType": "IStatus",
    "mockingStrategy": "fixed"
  }
}
```

- **`mockingStrategy`**: (선택 사항) `ZodUnion` 또는 `ZodEnum` 타입에 대한 데이터 생성 방식을 지정합니다.
  - `"random"` (기본값): 유니온/열거형 옵션 중 하나를 무작위로 선택합니다. 엣지 케이스를 발견하는 데 좋습니다.
  - `"fixed"`: 유니온/열거형에 정의된 **첫 번째** 옵션을 항상 선택합니다. 특정 값에 의존해야 하는 예측 가능하고 안정적인 테스트를 만드는 데 필수적입니다.

**`interface.ts` 예시:**

```typescript
export type Status = "Pending" | "Success" | "Failed"

export interface IStatus {
  status: Status
}
```

`mockingStrategy: "fixed"`를 사용하면 `status` 필드는 항상 `"Pending"`이 됩니다. `"random"`을 사용하면 세 가지 값 중 하나가 될 수 있습니다.

### URL 매칭 및 우선순위

Zomoc은 URL 매칭을 위해 Express.js와 같은 프레임워크에서 사용하는 것과 동일한 엔진인 `path-to-regexp`를 사용합니다. 이를 통해 동적 URL 경로를 정의할 수 있습니다.

**주요 원칙:**

1.  **동적 세그먼트:** 콜론(`:`)을 사용하여 URL의 동적인 부분을 정의할 수 있습니다. (예: `GET /api/users/:userId`)
2.  **쿼리 스트링:** 쿼리 스트링(`?key=value`)은 매칭 과정에서 무시됩니다. 따라서 URL 경로 부분만 정의하면 됩니다.
3.  **매칭 순서:** `mock.json`에 정의된 규칙은 위에서 아래 순서로 평가됩니다. 요청과 **가장 먼저 일치하는 규칙 하나만** 사용되며, 일치하는 규칙을 찾으면 평가는 즉시 중단됩니다.

이는 규칙의 순서가 매우 중요하다는 것을 의미합니다. **반드시 더 구체적인 경로를 더 일반적이고 동적인 경로보다 위에 배치해야 합니다.**

**잘못된 순서의 예:**

```json
{
  "GET /api/users/:userId": "IUserProfile",
  "GET /api/users/me": "IMyProfile"
}
```

이 경우, `/api/users/me`로 요청을 보내면 첫 번째 규칙인 `GET /api/users/:userId`에 잘못 매칭되어 `userId`가 `"me"`로 인식됩니다.

**올바른 순서의 예:**

```json
{
  "GET /api/users/me": "IMyProfile",
  "GET /api/users/:userId": "IUserProfile"
}
```

이렇게 순서를 바꾸면, `/api/users/me` 요청은 더 구체적인 첫 번째 규칙에 올바르게 매칭됩니다.

### 파일 경로 변경하기

기본적으로 Zomoc은 `**/mock.json`, `**/interface.ts`, `**/type.ts` 패턴으로 파일을 검색합니다. CLI 또는 Vite 설정을 통해 이 경로를 원하는 대로 바꿀 수 있습니다.

#### CLI

`generate` 명령어에 `--mock-paths`와 `--interface-paths` 옵션을 전달하여 경로를 지정할 수 있습니다. 각 옵션은 공백으로 구분하여 여러 개의 경로 패턴을 받을 수 있습니다.

```bash
# --mock-paths에 2개의 패턴, --interface-paths에 1개의 패턴 전달
npx zomoc generate \
  --mock-paths "src/mocks/api.json" "src/features/**/mock.json" \
  --interface-paths "src/types/**/*.ts"
```

#### Vite 플러그인

`vite.config.ts`에서 플러그인에 옵션을 직접 전달하여 경로를 설정할 수 있습니다.

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

## 한계점

Zomoc은 유용한 도구이지만, 사용 전 알아두어야 할 몇 가지 한계점이 있습니다.

- **제네릭 타입(Generic Types):** Zomoc은 TypeScript 인터페이스를 Zod 스키마로 변환하기 위해 `ts-to-zod` 라이브러리에 의존합니다. 이 변환 과정은 복잡하거나 깊게 중첩된 제네릭 타입(예: `interface PaginatedResponse<T> { ... }`)에 대해서는 원활하게 작동하지 않을 수 있습니다. 안정적인 모킹을 위해서는 제네릭 타입 대신 구체적인 타입을 정의하여 사용하는 것을 권장합니다.

- **외부 및 예측 불가능한 URL:** Zomoc의 인터셉터는 특정 `axios` 인스턴스와 해당 인스턴스의 `baseURL`에 바인딩됩니다. 따라서 AWS S3의 presigned URL과 같이 사전에 경로를 알 수 없거나 외부 도메인으로 향하는 요청은 모킹할 수 없습니다. 이런 경우, 파일 업로드 요청 자체를 모킹하는 대신, presigned URL을 _제공하는_ API 엔드포인트를 모킹하는 방식을 사용하는 것이 좋습니다.

## 🤝 기여하기

Zomoc은 여러분의 기여를 기다립니다. 새로운 기능 제안, 버그 리포트, Pull Request 등 어떤 형태의 기여도 환영합니다.

## License

This project is licensed under the MIT License.
