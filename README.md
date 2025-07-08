# Zomoc: The Zero-Effort Mocking Companion for Vite

Zomoc is a Vite plugin that automatically generates API mocks based on your TypeScript interfaces. It's designed for a seamless developer experience: define your data shapes once, and get type-safe mocks during development with zero manual steps.

## Features

- **Seamless Vite Integration**: A true Vite plugin for a zero-effort setup.
- **Fully Automated**: No more manual CLI commands. Mocks are auto-generated and updated on file changes.
- **Zero Source Code Pollution**: Creates no files in your project. Everything is handled in memory via a virtual module.
- **Type-Safe Mocks**: Leverages `zod` to create mocks that are always in sync with your TypeScript interfaces.
- **Flexible Configuration**: Easily target specific mock files using glob patterns.

## Installation

```bash
npm install -D zomoc
```

`zomoc` has `axios`, `zod`, and `vite` as peer dependencies. npm 7+ will install them automatically if they are not already in your project.

## How it works

1.  You add the `zomoc()` plugin to your `vite.config.ts`.
2.  During development, the plugin scans your project for `mock.json` files.
3.  For each `mock.json`, it finds the corresponding `interface.ts` file.
4.  It uses `ts-to-zod` to generate Zod schemas from your interfaces **in-memory**.
5.  It creates a virtual module, `virtual:zomoc`, which exports the `finalSchemaUrlMap` object containing all your mock data schemas.
6.  You import `setupMockingInterceptor` from `zomoc` and the `finalSchemaUrlMap` from the virtual module to configure your `axios` instance.
7.  Whenever you change a `mock.json` or `interface.ts` file, the plugin automatically regenerates the mocks and reloads your app.

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
      // Optional: Specify where your mock files are.
      // Defaults to '/**/mock.json'
      mockMapPattern: "src/entities/**/mock.json",
    }),
  ],
})
```

### 2. File Structure Convention

`zomoc` assumes a conventional file structure for your features. For each feature, you should have:

```
src/
└── entities/
    └── MyFeature/
        ├── api/
        │   └── mock.json
        └── model/
            └── interface.ts
```

### 3. Create `mock.json`

This file maps API endpoints to the names of the TypeScript interfaces for their response data.

**Example:** `src/entities/MyFeature/api/mock.json`

```json
{
  "/my-feature": "IMyFeatureResponse",
  "/my-feature/:id": "IMyFeatureDetailResponse"
}
```

### 4. Setup the Interceptor

In your central `axios` configuration file, import from `zomoc` and the `virtual:zomoc` module.

```typescript
import axios, { AxiosInstance } from "axios"
import { setupMockingInterceptor } from "zomoc"
// Import the registry from the virtual module provided by the plugin
import { finalSchemaUrlMap } from "virtual:zomoc"

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: "https://api.example.com",
  })

  // The interceptor is only active in development mode.
  // The plugin ensures the virtual module is only available during dev.
  setupMockingInterceptor(instance, {
    enabled: import.meta.env.DEV,
    registry: finalSchemaUrlMap,
  })

  return instance
}

export const api = createApiInstance()
```

That's it! Run your dev server, and your API calls will be mocked automatically.
