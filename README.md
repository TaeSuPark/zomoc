# Zomoc: The Zero-Effort Mocking Companion for Vite

Zomoc is a Vite plugin that automatically generates API mocks based on your TypeScript interfaces. It's designed for a seamless developer experience: define your data shapes once, and get type-safe mocks during development with zero manual steps.

## Features

- **Seamless Vite Integration**: A true Vite plugin for a zero-effort setup.
- **Fully Automated**: No more manual CLI commands. Mocks are auto-generated and updated on file changes.
- **Zero Source Code Pollution**: Creates no files in your project. Everything is handled in memory via a virtual module.
- **Type-Safe Mocks**: Leverages `zod` to create mocks that are always in sync with your TypeScript interfaces.
- **Dynamic Route Matching**: Uses `path-to-regexp` under the hood to support dynamic URL patterns like `/users/:id`.
- **Flexible File Structure**: No more rigid folder structures. Zomoc finds your interface files wherever they are in your project.
- **Custom Data Generators**: Hook in your own data generation logic (e.g., using `@faker-js/faker`) for more realistic mock data.
- **Hot Module Replacement (HMR)**: Mocks are automatically updated when you change your mock files or interfaces, without a page reload.

## Installation

```bash
npm install -D zomoc
```

`zomoc` has `axios` and `zod` as peer dependencies. npm 7+ will install them automatically if they are not already in your project.

## How it works

1.  You add the `zomoc()` plugin to your `vite.config.ts`.
2.  The plugin scans your project for TypeScript files (e.g., `interface.ts`, `type.ts`) to create an index of all exported interfaces and their file locations. This is done quickly with regular expressions, not a full AST parse.
3.  It then finds your mock definition files (e.g., `mock.json`) based on the patterns you provide.
4.  For each API endpoint in your mock files, it looks up the required interface name in its index, reads the corresponding file, and generates a Zod schema from the interface **in-memory** using `ts-to-zod`.
5.  It creates a virtual module, `virtual:zomoc`, which exports the `finalSchemaUrlMap` object containing all your mock data schemas.
6.  You import `setupMockingInterceptor` from `zomoc` and the `finalSchemaUrlMap` from the virtual module to configure your `axios` instance.
7.  Whenever you change a mock or interface file, the plugin automatically regenerates the mocks and reloads your app.

## Usage

### 1. Configure Vite

Add the `zomoc` plugin to your `vite.config.ts`.

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import zomoc from "zomoc/vite"

export default defineConfig({
  plugins: [
    react(),
    // Add zomoc plugin
    zomoc({
      // Optional: Specify where your mock definition files are.
      // Defaults to ['**/mock.json']
      mockPaths: ["src/features/**/mock.json"],

      // Optional: Specify where your interface/type definition files are.
      // Zomoc scans these to find the source of your interfaces.
      // Defaults to ['**/interface.ts', '**/type.ts']
      interfacePaths: ["src/features/**/model/*.ts"],
    }),
  ],
})
```

### 2. Configure TypeScript

To make TypeScript aware of the `virtual:zomoc` module, add `zomoc/client` to the `types` array in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    // ... other options
    "types": ["zomoc/client"]
  }
}
```

### 3. Create Mock and Interface Files

With Zomoc, you are free to structure your project however you like. Zomoc will find your mock and interface files as long as they match the glob patterns provided in the Vite config.

For example, you could organize by feature:

```
src/
└── features/
    └── User/
        ├── api/
        │   └── mock.json
        └── model/
            └── types.ts
```

**`mock.json`**

This file maps API endpoints (including the HTTP method) to the names of the TypeScript interfaces for their response data.

Example: `src/features/User/api/mock.json`

```json
{
  "GET /users": "IUserListResponse",
  "GET /users/:id": "IUserDetailResponse",
  "POST /users": "ICreateUserResponse"
}
```

**`types.ts`**

This file contains the actual TypeScript interface definitions.

Example: `src/features/User/model/types.ts`

```typescript
export interface IUser {
  id: string
  name: string
  email: string
}

// An interface can extend another
export interface IUserDetailResponse extends IUser {
  profile: string
  lastLogin: string
}

export interface IUserListResponse {
  users: IUser[]
  total: number
}

export interface ICreateUserResponse {
  success: boolean
  userId: string
}
```

### 4. Setup the Interceptor

In your central `axios` configuration file, import from `zomoc` and the `virtual:zomoc` module.

```typescript
// src/shared/api/index.ts
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"
// Import the registry from the virtual module provided by the plugin
import { finalSchemaUrlMap } from "virtual:zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  setupMockingInterceptor(instance, {
    // The interceptor is only active in development mode.
    enabled: import.meta.env.DEV,
    registry: finalSchemaUrlMap,
    // Optional: Log mocked requests to the console for easy debugging.
    debug: true,
  })

  return instance
}

export const api = createApiInstance()
```
