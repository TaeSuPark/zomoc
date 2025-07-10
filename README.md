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

Create a `mock.json` file and a corresponding `interface.ts` file.

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

- `itemsKey`: The key in the response object that holds the array of items.
- `totalKey`: The key for the total number of items.
- `pageKey`: The name of the parameter for the page number (defaults to `"page"`).
- `sizeKey`: The name of the parameter for the page size (defaults to `"size"`).

If you don't provide these parameters in your API call, Zomoc will use default values (`page: 1`, `size: 10`).

**2. Make an API call with pagination params:**

```typescript
// e.g., GET /users?page=1&size=10
api.get("/users", { params: { page: 1, size: 10 } })
```

Zomoc will intercept this call and return a response where the `users` array contains exactly 10 mock items.

> **Note**: If an endpoint is configured for pagination, `zomoc` will generate the requested number of items. For regular array responses (like `IUser[]`) that are **not** configured for pagination, it will automatically generate a random number of items (1-3) to make the data feel more dynamic.

### Controlling Array Length

For non-paginated endpoints that return an array, you can specify the exact number of items to generate using the `repeatCount` option. If not provided, a random number of items (1-3) will be generated.

Unlike paginated responses which are objects containing an array, this feature is for APIs that **directly return an array**.

To use this, you must first explicitly define and export a `type` for your array in your interface file. This is because Zomoc needs to find a Zod schema that corresponds to an array (`ZodArray`) to apply the `repeatCount` logic correctly.

**1. Define and export the array type:**

**`interface.ts`**

```typescript
export interface ITag {
  id: number
  name: string
}

// Explicitly define and export the array type.
export type ITagList = ITag[]
```

**2. Use the array type's name in `mock.json`:**

**`mock.json`**

```json
{
  "GET /api/tags": {
    "responseType": "ITagList",
    "repeatCount": 5
  }
}
```

This configuration will always return an array containing exactly 5 mock `ITag` items.

> **Key Difference: `repeatCount` vs. `pagination`**
> It's important to understand when to use `repeatCount` and when to use `pagination`.
>
> - **Use `repeatCount`** when the API response **is an array itself**. The `responseType` must be an array type (e.g., `type MyArray = Item[]`).
> - **Use `pagination`** when the API response **is an object that contains an array**. The `responseType` must be an object type.
>
> Applying `repeatCount` to a `responseType` that is an object will **not** affect the length of arrays inside that object. Those arrays will default to a random length of 1-3 items.

### Putting It All Together: A Quick Guide

Here’s a summary table to help you decide which configuration to use based on your API's response shape.

| Your API Response...                                            | Your Goal                        | `mock.json` Configuration    | Result                                               |
| :-------------------------------------------------------------- | :------------------------------- | :--------------------------- | :--------------------------------------------------- |
| **Is an object with an array**<br/>(e.g., `{ users: [], ... }`) | Control array length via request | Use **`pagination`** object  | Array length matches the `size` param in the request |
| **Is an object with an array**<br/>(e.g., `{ users: [], ... }`) | Let Zomoc decide the length      | Omit `pagination` object     | Inner array gets a random length (1-3)               |
| **Is an array itself**<br/>(e.g., `[{}, {}]`)                   | Set a fixed array length         | Use **`repeatCount`** number | Array length matches `repeatCount`                   |
| **Is an array itself**<br/>(e.g., `[{}, {}]`)                   | Let Zomoc decide the length      | Omit `repeatCount` number    | Array gets a random length (1-3)                     |

**Important:** Do not use `pagination` for a `responseType` that is an array, and do not expect `repeatCount` to work on a `responseType` that is an object. Mixing them will lead to unexpected behavior or errors.

### Mocking Strategy: Fixed vs. Random

For `union` types (`'a' | 'b'`) or `enum` types in your interfaces, you can control how `zomoc` generates mock data. This is particularly useful for creating predictable tests.

**1. Configure the `mockingStrategy` in your `mock.json`:**

```json
{
  "GET /api/status": {
    "responseType": "IStatus",
    "mockingStrategy": "fixed"
  }
}
```

- **`mockingStrategy`**: (Optional) Specifies how to generate data for `ZodUnion` or `ZodEnum` types.
  - `"random"` (default): Randomly selects one of the union/enum options. This is great for discovering edge cases.
  - `"fixed"`: Always selects the **first** option defined in the union/enum. This is essential for creating predictable and stable tests where you need to rely on a specific value.

**Example `interface.ts`:**

```typescript
export type Status = "Pending" | "Success" | "Failed"

export interface IStatus {
  status: Status
}
```

With `mockingStrategy: "fixed"`, the `status` field will always be `"Pending"`. With `"random"`, it could be any of the three values.

### URL Matching and Priority

Zomoc uses `path-to-regexp` for URL matching, which is the same engine used by frameworks like Express.js. This allows you to define dynamic URL paths.

**Key Principles:**

1.  **Dynamic Segments:** Use colons (`:`) to define dynamic parts of a URL (e.g., `GET /api/users/:userId`).
2.  **Query Strings:** Query strings (`?key=value`) are ignored during matching, so you only need to define the URL path.
3.  **Matching Order:** Rules in `mock.json` are evaluated from top to bottom. The **first rule that matches** the incoming request will be used, and the evaluation will stop.

This means the order of your rules is critical. **More specific paths must always be placed before more general, dynamic paths.**

**Example of incorrect order:**

```json
{
  "GET /api/users/:userId": "IUserProfile",
  "GET /api/users/me": "IMyProfile"
}
```

In this case, a request to `/api/users/me` will be incorrectly matched by the first rule (`GET /api/users/:userId`), with `userId` being `"me"`.

**Example of correct order:**

```json
{
  "GET /api/users/me": "IMyProfile",
  "GET /api/users/:userId": "IUserProfile"
}
```

With this order, a request to `/api/users/me` is correctly caught by the first, more specific rule.

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

## Limitations

While Zomoc is a powerful tool, it has some limitations you should be aware of:

- **Generic Types:** Zomoc relies on `ts-to-zod` to convert TypeScript interfaces into Zod schemas. This conversion may not work for complex or deeply nested generic types (e.g., `interface PaginatedResponse<T> { ... }`). For reliable mocking, it is recommended to use specific, concrete interface types rather than generic ones.

- **External & Unpredictable URLs:** Zomoc's interceptor is tied to a specific `axios` instance and its `baseURL`. It cannot mock requests made to external domains or URLs that are not known in advance, such as AWS S3 presigned URLs for file uploads. The recommended approach for such cases is to mock the API endpoint that _provides_ the presigned URL, not the upload request itself.

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or pull request, please feel free to open an issue or PR.

## License

This project is licensed under the MIT License.
