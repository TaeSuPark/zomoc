# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-08-06

### Added

- **Advanced Mocking with Response Map**: Users can now define multiple response scenarios for a single API endpoint using the new `responses` object in `mock.json`. This allows for mocking various HTTP status codes (e.g., 200, 404, 500).
- **Status Code Switching**: A new top-level `status` property acts as a "switch" within a `responses` map, allowing developers to easily toggle between different response scenarios (e.g., success and error cases) for testing.
- **Direct Body Injection with `responseBody`**: A new `responseBody` property is now available within a response definition. This allows users to provide a raw JSON object to be returned as the response body, bypassing the schema-based data generation. This is useful for testing specific error messages or edge cases.
- **Dynamic Status Code Handling**: The interceptor now dynamically sets the HTTP status code of the mock response based on the configuration, instead of always returning 200.
- **Axios-Compliant Error Handling**: For responses with a status code of 400 or higher, the interceptor now rejects the promise with an object that mimics the structure of an `AxiosError`, improving compatibility with tools like `react-query` and standard `axios` error handling patterns.

### Changed

- **Mocking Logic in `core.ts`**: The core parsing logic was significantly refactored to distinguish between "Simple Mode" (for backward compatibility) and the new "Response Map Mode".
- **Interceptor Logic in `interceptor.ts`**: The interceptor was updated to handle the new rich data structure from `core.ts`, implementing a priority system (`responseBody` > `responseType` > `default`) for generating the response body.

## [0.1.3] - 2025-07-23

### Added

- Enhanced schema generation logic to improve support for complex TypeScript types.

### Changed

- Corrected the pagination example for `getMock` in the README file.

## [0.1.2] - 2025-07-22

### Fixed

- Removed excessive logging from the Vite virtual module that occurred on every request.

## [0.1.1] - 2025-07-22

### Fixed

- Removed an unnecessary `console.log` of the Zod schema during the interception process.

## [0.1.0] - 2025-07-22

### Added

- Initial release of Zomoc.
- Core features including CLI-based mock generation, Vite plugin with HMR, and an Axios interceptor for API mocking.
- Support for type-safe mock data generation based on TypeScript interfaces and `mock.json` files.
- Standalone data generator (`createGenerator`) for use in environments like Storybook.

### Deprecated

- Nothing

### Removed

- Nothing

### Fixed

- Nothing

### Security

- Nothing
