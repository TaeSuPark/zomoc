[English](./README.md) | [한국어](./README.ko.md)

---

# Zomoc: A Type-Safe Mocking Plugin for Decoupling Your Frontend in Vite

Zomoc is a Vite plugin designed for one primary purpose: to **decouple** your frontend development from a backend API that is unstable, in flux, or not yet available. By automatically generating mock data that strictly adheres to your TypeScript interfaces, Zomoc ensures you can continue building UIs with confidence, knowing your data structures are always in sync.

It's not a zero-config tool, but a "low-config" one. With a few lines in your `vite.config.ts`, you gain a powerful, type-safe development track, allowing you to work independently of backend changes or availability.

## Features

- **Reliable API Decoupling**: Keep developing your UI without interruption, even when the real API is down or changing.
- **Structural Type-Safety**: Guarantees your mock data's structure always matches your TypeScript interfaces, preventing data-shape-related bugs.
- **Highly Automated**: Scans your code to generate mock data, keeping it in sync with your type definitions.
- **Flexible File Structure**: Locate your mock definitions and interface files anywhere in your project using glob patterns.
- **Dynamic Route Matching**: Supports dynamic URL patterns like `/users/:id` out of the box.
- **HMR for Mocks**: Mocks are automatically updated on the fly when you change your definitions.
- **Pagination Support**: Automatically generates paginated responses and intelligently handles both paginated and regular array types.
- **Custom Data Generators**: Hook in your own data generation logic (e.g., using `@faker-js/faker`) for more realistic mock data.

## Installation

```bash
npm install -D zomoc
```

`zomoc` has `axios` and `zod` as peer dependencies. npm 7+ will install them automatically if they are not already in your project.

## 🚀 Getting Started

Here’s how to get Zomoc up and running in 3 steps.

### 1. Configure Vite & TypeScript

Add `zomoc` to your `vite.config.ts` and update `tsconfig.json` to recognize the virtual module.

**`vite.config.ts`**

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import zomoc from "zomoc/vite"

export default defineConfig({
  plugins: [
    zomoc(), // Add the plugin
  ],
})
```

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    // ... other options
    "types": ["zomoc/client"]
  }
}
```

### 2. Create a Mock and an Interface

Create a `mock.json` file and a corresponding `types.ts` file.

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

### 3. Activate the Interceptor

In your central `axios` configuration, set up the interceptor.

```typescript
// src/shared/api/index.ts
import axios from "axios"
import { setupMockingInterceptor } from "zomoc"
import { finalSchemaUrlMap } from "virtual:zomoc" // Import from the virtual module

const api = axios.create({ baseURL: "https://api.example.com" })

// Zomoc will now intercept calls made with this instance
setupMockingInterceptor(api, {
  enabled: import.meta.env.DEV, // Active only in development
  registry: finalSchemaUrlMap,
  debug: true, // Optional: log mocked requests
})

export { api }
```

That's it! Now, when your app calls `api.get('/users')` in dev mode, Zomoc will serve a type-safe mock response.

## 📚 In-Depth Guide

This section covers advanced configuration and features.

### Pagination Mocking

Zomoc can intelligently mock paginated API responses. When a `pagination` configuration is provided for a specific endpoint, Zomoc will read the page and size from the request (query params or body) and generate the exact number of items requested.

**1. Configure the `pagination` object in your mock definition:**

In your `mock.json`, instead of just a type name string, use an object with a `responseType` and a `pagination` key.

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

- `itemsKey`: The key in your response object that holds the array of items (e.g., `users`).
- `totalKey`: The key for the total number of items (e.g., `total`).
- `pageKey`: The key for the page number in the request's query params or body.
- `sizeKey`: The key for the page size in the request's query params or body.

**2. Make an API call with pagination params:**

```typescript
// e.g., GET /users?page=1&size=10
api.get("/users", { params: { page: 1, size: 10 } })
```

Zomoc will intercept this call and return a response where the `users` array contains exactly 10 mock items.

> **Note**: If an endpoint is configured for pagination, `zomoc` will generate the requested number of items. For regular array responses (like `IUser[]`) that are **not** configured for pagination, it will automatically generate a random number of items (1-3) to make the data feel more dynamic.

### Customizing File Paths

By default, Zomoc searches for `**/mock.json`, `**/interface.ts`, and `**/type.ts`. You can override this in your Vite config.

```typescript
// vite.config.ts
import zomoc from "zomoc/vite"

export default {
  plugins: [
    zomoc({
      // Glob patterns for your mock definition files.
      mockPaths: ["src/features/**/mock.json"],
      // Glob patterns for your TypeScript interface files.
      interfacePaths: ["src/features/**/model/*.ts"],
    }),
  ],
}
```

### Custom Data Generators

By default, `zomoc` generates simple placeholder data. For more realistic mocks, you can provide your own generator functions using the `customGenerators` option. This is powerful when combined with a library like [`@faker-js/faker`](https://fakerjs.dev/).

**1. First, install faker:**

```bash
npm install -D @faker-js/faker
```

**2. Then, pass your custom generators to the interceptor:**

```typescript
// src/shared/api/index.ts
import { setupMockingInterceptor, type CustomGenerators } from "zomoc"
import { faker } from "@faker-js/faker"

// Define your custom generator functions
const customGenerators: CustomGenerators = {
  string: (key) => {
    if (key.toLowerCase().includes("email")) return faker.internet.email()
    if (key.toLowerCase().includes("name")) return faker.person.fullName()
    return faker.lorem.sentence()
  },
  number: () => faker.number.int({ max: 1000 }),
}

setupMockingInterceptor(api, {
  // ...other options
  customGenerators,
})
```

With this setup, `zomoc` will call your functions to generate context-aware data.

## License

This project is licensed under the MIT License.
