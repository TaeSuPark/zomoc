# Zomoc: Zod-based Mocking for Axios

Zomoc is an automatic API mocking tool for `axios`. It uses your TypeScript interfaces to generate mock data with `zod`, and intercepts API calls with an `axios` interceptor.

It's designed to be simple: define your data shapes once, and get automatic, type-safe mocks during development.

<details>
<summary>한국어 설명 보기</summary>

## Zomoc: Zod 기반의 Axios 목킹 도구

Zomoc은 `axios`를 위한 자동 API 목킹 도구입니다. TypeScript 인터페이스를 사용하여 `zod`로 목 데이터를 생성하고, `axios` 인터셉터를 통해 API 호출을 가로챕니다.

한 번만 데이터 형태를 정의하면, 개발 중에 타입이 보장되는 목 데이터를 자동으로 얻을 수 있도록 간단하게 설계되었습니다.

</details>

## Features

- **Automatic Mock Data**: Generates mock data based on your TypeScript interfaces.
- **URL Matching**: Supports static and dynamic URL matching (e.g., `/users/:id`).
- **CLI for Generation**: A simple `gen` command to create all necessary files.
- **Non-invasive**: Uses an `axios` interceptor, leaving your core `axios` setup untouched.
- **Clean**: Generated files can be easily cleaned and are not part of your source code repository.

<details>
<summary>한국어 설명 보기</summary>

### 주요 기능

- **자동 목 데이터 생성**: TypeScript 인터페이스를 기반으로 목 데이터를 자동으로 생성합니다.
- **URL 매칭**: 정적 및 동적 URL 매칭 (예: `/users/:id`)을 지원합니다.
- **CLI 명령어**: `gen` 명령어로 필요한 모든 파일을 간단하게 생성합니다.
- **비침투적 설계**: `axios` 인터셉터를 사용하므로, 기존 `axios` 설정을 수정할 필요가 없습니다.
- **깔끔함**: 생성된 파일들은 쉽게 정리할 수 있으며, 소스 코드 저장소에 포함되지 않습니다.

</details>

## Installation

```bash
npm install zomoc
# or
yarn add zomoc
```

`zomoc` has `axios` and `zod` as peer dependencies, so they will be installed automatically if not already present in your project. The CLI also requires `ts-to-zod` to be available.

```bash
npm install ts-to-zod
# or
yarn add ts-to-zod
```

<details>
<summary>한국어 설명 보기</summary>

### 설치 방법

```bash
npm install zomoc
# 또는
yarn add zomoc
```

`zomoc`은 `axios`와 `zod`를 peer dependency로 가지고 있으므로, 프로젝트에 해당 패키지가 없는 경우 자동으로 함께 설치됩니다. 또한 CLI를 사용하려면 `ts-to-zod`가 필요합니다.

```bash
npm install ts-to-zod
# 또는
yarn add ts-to-zod
```

</details>

## How it works

1.  You define a `mock.json` file next to your API definitions, mapping URLs to TypeScript interface names.
2.  You run the `zomoc gen` command.
3.  `zomoc` finds all `mock.json` files, converts the corresponding `interface.ts` files into `interface.zod.ts` schemas using `ts-to-zod`.
4.  It then creates a central `mock.registry.ts` file that imports all zod schemas and maps them to the URLs from your `mock.json` files.
5.  In your app, you import `setupMockingInterceptor` from `zomoc` and attach it to your `axios` instance.
6.  When an API call is made, the interceptor checks if the URL is in the registry. If it is, it returns a mocked response. Otherwise, it lets the request proceed as normal.

<details>
<summary>한국어 설명 보기</summary>

### 동작 방식

1.  API 정의 파일 옆에 `mock.json` 파일을 만들고, URL과 TypeScript 인터페이스 이름을 매핑합니다.
2.  `zomoc gen` 명령어를 실행합니다.
3.  `zomoc`은 모든 `mock.json` 파일을 찾아서, 연결된 `interface.ts` 파일을 `ts-to-zod`를 이용해 `interface.zod.ts` 스키마로 변환합니다.
4.  그 후, 모든 zod 스키마를 import하고 `mock.json`의 URL과 매핑하는 중앙 `mock.registry.ts` 파일을 생성합니다.
5.  당신의 앱에서, `zomoc`으로부터 `setupMockingInterceptor`를 import하여 `axios` 인스턴스에 연결합니다.
6.  API가 호출되면, 인터셉터는 해당 URL이 레지스트리에 있는지 확인합니다. 만약 있다면, 목 응답을 반환합니다. 없다면, 요청이 정상적으로 실제 서버로 전달되도록 합니다.

</details>

## Usage

### 1. File Structure Convention

`zomoc` assumes a conventional file structure for your features. For each feature, you should have:

```
src/
└── entities/
    └── MyFeature/
        ├── api/
        │   └── mock.json  <-- Mock configuration for the feature
        └── model/
            └── interface.ts <-- TypeScript interfaces for the feature
```

### 2. Create `mock.json`

In your feature's `api` directory, create a `mock.json` file. This file maps API endpoints to the names of the TypeScript interfaces for their response data.

**Example:** `src/entities/MyFeature/api/mock.json`

```json
{
  "/my-feature": "IMyFeatureResponse",
  "/my-feature/:id": "IMyFeatureDetailResponse"
}
```

### 3. Run the generator

Run the `gen` command in your project's root directory.

```bash
npx zomoc gen
```

This will:

1.  Create `interface.zod.ts` files next to your `interface.ts` files.
2.  Create a `mock.registry.ts` file in your project root.

### 4. Setup the Interceptor

In your central `axios` configuration file, import and call `setupMockingInterceptor`. You are now responsible for passing the `enabled` flag based on your project's environment variables.

**For Vite:**

```typescript
// Example: src/shared/lib/axiosConfig.ts
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  // Pass the enabled flag from Vite's env variables
  setupMockingInterceptor(instance, {
    enabled: import.meta.env.VITE_MOCKING_ENABLED === "true",
  })

  return instance
}

export const api = createApiInstance()
```

**For Next.js:**

```typescript
// Example: src/lib/axiosConfig.ts
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  // Pass the enabled flag from Next.js's env variables
  setupMockingInterceptor(instance, {
    enabled: process.env.NEXT_PUBLIC_MOCKING_ENABLED === "true",
  })

  return instance
}

export const api = createApiInstance()
```

### 5. Enable Mocking

The interceptor is only active when you pass `enabled: true` to the setup function. You control this logic.

For example, in a `.env.local` file for Next.js or a `.env` file for Vite:

```
# For Next.js
NEXT_PUBLIC_MOCKING_ENABLED=true

# For Vite
VITE_MOCKING_ENABLED=true
```

Now, when you run your development server, API calls to `/my-feature` will be intercepted and will return mock data.

<details>
<summary>한국어 설명 보기</summary>

### 사용법

#### 1. 파일 구조 규칙

`zomoc`은 각 기능별로 다음과 같은 파일 구조를 따를 것을 권장합니다.

```
src/
└── entities/
    └── MyFeature/
        ├── api/
        │   └── mock.json  <-- 기능별 목킹 설정 파일
        └── model/
            └── interface.ts <-- 기능별 TypeScript 인터페이스
```

#### 2. `mock.json` 생성

기능(feature)의 `api` 디렉토리 안에, `mock.json` 파일을 생성합니다. 이 파일은 API 엔드포인트와 응답 데이터의 TypeScript 인터페이스 이름을 매핑합니다.

**예시:** `src/entities/MyFeature/api/mock.json`

```json
{
  "/my-feature": "IMyFeatureResponse",
  "/my-feature/:id": "IMyFeatureDetailResponse"
}
```

#### 3. 파일 생성기 실행

프로젝트의 루트 디렉토리에서 `gen` 명령어를 실행하세요.

```bash
npx zomoc gen
```

이 명령어는 다음을 수행합니다:

1.  `interface.ts` 파일 옆에 `interface.zod.ts` 파일을 생성합니다.
2.  프로젝트 루트에 `mock.registry.ts` 파일을 생성합니다.

#### 4. 인터셉터 설정

중앙 `axios` 설정 파일에서 `setupMockingInterceptor`를 import하여 호출합니다. 이때, 프로젝트의 환경 변수를 직접 확인하여 `enabled` 플래그를 전달해야 합니다.

**Vite 환경의 경우:**

```typescript
// 예시: src/shared/lib/axiosConfig.ts
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  // Vite의 환경 변수를 확인하여 enabled 플래그 전달
  setupMockingInterceptor(instance, {
    enabled: import.meta.env.VITE_MOCKING_ENABLED === "true",
  })

  return instance
}

export const api = createApiInstance()
```

**Next.js 환경의 경우:**

```typescript
// 예시: src/lib/axiosConfig.ts
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  // Next.js의 환경 변수를 확인하여 enabled 플래그 전달
  setupMockingInterceptor(instance, {
    enabled: process.env.NEXT_PUBLIC_MOCKING_ENABLED === "true",
  })

  return instance
}

export const api = createApiInstance()
```

#### 5. 목킹 활성화

인터셉터는 `setupMockingInterceptor` 함수에 `enabled: true`를 전달했을 때만 활성화됩니다. 이제 이 로직은 사용자가 직접 제어합니다.

예를 들어, Next.js의 `.env.local` 파일이나 Vite의 `.env` 파일에 아래와 같이 변수를 설정합니다.

```
# Next.js용
NEXT_PUBLIC_MOCKING_ENABLED=true

# Vite용
VITE_MOCKING_ENABLED=true
```

이제 개발 서버를 실행하면, `/my-feature`로 보내는 API 요청이 가로채져 목 데이터를 반환할 것입니다.

</details>

## Cleaning up

The generated files (`*.zod.ts`, `mock.registry.ts`) are temporary and should not be committed to your repository. Add them to your `.gitignore` file.

```
# .gitignore

# Zomoc
**/*.zod.ts
mock.registry.ts
```

<details>
<summary>한국어 설명 보기</summary>

### 뒷정리

생성된 파일들(`*.zod.ts`, `mock.registry.ts`)은 임시 파일이므로 저장소에 커밋해서는 안 됩니다. `.gitignore` 파일에 추가해주세요.

```
# .gitignore

# Zomoc
**/*.zod.ts
mock.registry.ts
```

</details>
