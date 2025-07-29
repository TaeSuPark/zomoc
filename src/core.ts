import { glob } from "glob"
import { generate } from "ts-to-zod"
import fs from "fs/promises"
import camelCase from "camelcase"
import type {
  MockConfig,
  ResponseDefinition,
  ResponseMap,
  ZomocCoreOptions,
} from "./types"

/**
 * Scans all specified file paths to find exported TypeScript interfaces and types.
 * It creates a map where the key is the interface/type name and the value is the absolute path to the file.
 * If a duplicate name is found, it logs a warning and keeps the location of the first one encountered.
 * @description 지정된 모든 파일 경로를 스캔하여 `export`된 타입스크립트 인터페이스와 타입을 찾습니다.
 * 인터페이스/타입 이름을 키로, 파일의 절대 경로를 값으로 하는 맵을 생성합니다.
 * 중복된 이름이 발견되면 경고를 출력하고 처음 발견된 위치를 유지합니다.
 */
async function createInterfaceIndex(
  projectRoot: string,
  interfacePaths: string[]
): Promise<Map<string, string>> {
  const interfaceLocationMap = new Map<string, string>()
  const files = await glob(interfacePaths, {
    cwd: projectRoot,
    absolute: true,
    ignore: "node_modules/**",
  })

  const interfaceRegex = /export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf-8")
      let match
      while ((match = interfaceRegex.exec(content)) !== null) {
        if (interfaceLocationMap.has(match[1])) {
          console.warn(
            `[Zomoc] Warning: Duplicate interface name "${
              match[1]
            }" found in ${file}. The one in ${interfaceLocationMap.get(
              match[1]
            )} will be used.`
          )
        } else {
          interfaceLocationMap.set(match[1], file)
        }
      }
    } catch (e) {
      console.warn(`[Zomoc] Failed to read or parse ${file}`, e)
    }
  }

  return interfaceLocationMap
}

/**
 * Generates Zod schemas from TypeScript interfaces based on the "survivor principle".
 * It processes each file individually, sanitizes the source code (e.g., removing generics), generates schemas,
 * and collects only the successfully generated "survivor" schemas into a map.
 * This approach prevents an error in one file from halting the entire process
 * and handles duplicate schema declarations by keeping only the first one encountered.
 * @description "생존자 원칙"에 따라 타입스크립트 인터페이스로부터 Zod 스키마를 생성합니다.
 * 각 파일을 개별적으로 처리하고, 소스 코드를 정제(예: 제네릭 제거)하며, 스키마를 생성한 뒤,
 * 성공적으로 생성된 "생존자" 스키마만 맵에 수집합니다.
 * 이 방식은 한 파일의 오류가 전체 프로세스를 중단시키는 것을 방지하고,
 * 중복 선언된 스키마는 처음 발견된 것을 유지함으로써 처리합니다.
 */
async function generateSurvivedSchemas(
  interfaceLocationMap: Map<string, string>
): Promise<Map<string, string>> {
  const survivedSchemaDeclarations = new Map<string, string>()
  const uniqueFilePaths = [...new Set(interfaceLocationMap.values())]

  for (const filePath of uniqueFilePaths) {
    try {
      const sourceText = await fs.readFile(filePath, "utf-8")
      let sanitizedSourceText = sourceText

      // 1. "Enum 위장" 전략: ts-to-zod가 처리할 수 있도록 enum을 union 타입으로 변환합니다.
      const enumRegex = /export (?:const\s+)?enum\s+(\w+)\s*{([\s\S]+?)}/g
      sanitizedSourceText = sanitizedSourceText.replace(
        enumRegex,
        (_match, enumName, enumBody) => {
          const enumMemberRegex = /['"]([^'"]+)['"]/g
          const enumMembers: string[] = []
          let memberMatch
          while ((memberMatch = enumMemberRegex.exec(enumBody)) !== null) {
            enumMembers.push(`'${memberMatch[1]}'`)
          }

          if (enumMembers.length === 0) {
            return `/* Zomoc: Non-string enum '${enumName}' is not supported and has been commented out. */`
          }
          return `export type ${enumName} = ${enumMembers.join(" | ")};`
        }
      )

      // 2. 제네릭 타입 주석 처리: ts-to-zod의 오류를 방지합니다.
      const genericTypeRegex =
        /export\s+(interface|type)\s+\w+<.+?>\s*=.+?;|export\s+(interface|type)\s+\w+<.+?>\s*{[\s\S]*?}/gs
      sanitizedSourceText = sanitizedSourceText.replace(
        genericTypeRegex,
        (match) => `/* Zomoc: Generic type commented out\n${match}\n*/`
      )

      // 3. ts-to-zod를 사용하여 Zod 스키마 생성
      const zodSchemaFileContent = generate({
        sourceText: sanitizedSourceText,
      }).getZodSchemasFile("")

      // 4. 리액트 특정 타입 처리: 런타임 오류 방지를 위해 z.any()로 변경합니다.
      const sanitizedContent = zodSchemaFileContent.replace(
        /z\.literal\(React\.\w+\)/g,
        "z.any()"
      )

      // 5. "생존자 원칙": 생성된 스키마 중 유효한 것만 추출하여 저장합니다.
      const declarations = sanitizedContent.split(/\n(?=export const)/g)
      for (const declaration of declarations) {
        const match = declaration.match(/export const (\w+Schema) =/)
        if (match && match[1]) {
          const schemaName = match[1]
          const trimmedDeclaration = declaration.trim()
          if (
            trimmedDeclaration &&
            !survivedSchemaDeclarations.has(schemaName)
          ) {
            survivedSchemaDeclarations.set(schemaName, trimmedDeclaration)
          }
        }
      }
    } catch (error: any) {
      console.warn(
        `[Zomoc] Warning: Skipped processing file '${filePath}' due to an error.`,
        error.message
      )
    }
  }
  return survivedSchemaDeclarations
}

/**
 * Scans files to find all exported interface names (e.g., `IUser`) and maps them
 * to their expected Zod schema variable name (e.g., `iUserSchema`) based on a camelCase convention.
 * @description 모든 파일에서 `export`된 인터페이스 이름을 찾아,
 * 카멜케이스 변환 규칙에 따라 예상되는 Zod 스키마 변수 이름으로 매핑하는 지도를 생성합니다. (예: `IUser` -> `iUserSchema`)
 */
async function buildInterfaceToSchemaNameMap(
  filePaths: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  // Matches both `export interface IUser` and `export type TUser = ...`
  // @description `export interface IUser`와 `export type TUser = ...`를 모두 찾도록 정규식을 수정합니다.
  const interfaceRegex = /\bexport\s+(?:interface|type)\s+([A-Z]\w*)/g

  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, "utf-8")
      let match
      while ((match = interfaceRegex.exec(content)) !== null) {
        const interfaceName = match[1]
        const schemaName =
          camelCase(interfaceName, {
            preserveConsecutiveUppercase: true,
          }) + "Schema"
        if (!map.has(interfaceName)) {
          map.set(interfaceName, schemaName)
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return map
}

/**
 * The main engine of Zomoc. It orchestrates the entire process:
 * 1. Finding interfaces from files.
 * 2. Generating Zod schemas for them (survivor principle).
 * 3. Building mappings between interface names and schema names.
 * 4. Assembling `finalSchemaUrlMap` (for interceptors) and `finalSchemaTypeMap` (for generators).
 * 5. Returning the final code as a single string for the virtual module.
 * @description Zomoc의 핵심 엔진. 다음의 전체 프로세스를 관장합니다:
 * 1. 파일에서 인터페이스 검색.
 * 2. "생존자 원칙"에 따라 Zod 스키마 생성.
 * 3. 인터페이스 이름과 스키마 이름 간의 매핑 생성.
 * 4. 인터셉터용 `finalSchemaUrlMap`과 생성기용 `finalSchemaTypeMap` 빌드.
 * 5. 가상 모듈을 위한 최종 코드를 단일 문자열로 조립하여 반환.
 */
export async function generateRegistryString(
  projectRoot: string,
  options?: ZomocCoreOptions
): Promise<string> {
  // Step 1: Find all interfaces and their file locations.
  // 1단계: 모든 인터페이스와 그 파일 위치를 찾습니다.
  const interfacePaths = options?.interfacePaths || []
  const interfaceLocationMap = await createInterfaceIndex(
    projectRoot,
    interfacePaths
  )

  // Step 2: Generate Zod schemas for all found interfaces.
  // 2단계: 찾아낸 모든 인터페이스에 대해 Zod 스키마를 생성합니다.
  const survivedSchemaDeclarations =
    await generateSurvivedSchemas(interfaceLocationMap)

  // Step 3: Create a map to look up interface names from schema names.
  // 3단계: 스키마 이름으로 인터페이스 이름을 조회하기 위한 역방향 맵을 생성합니다.
  const interfaceToSchemaNameMap = await buildInterfaceToSchemaNameMap([
    ...interfaceLocationMap.values(),
  ])
  const schemaNameToInterfaceNameMap = new Map<string, string>()
  for (const [iName, sName] of interfaceToSchemaNameMap.entries()) {
    schemaNameToInterfaceNameMap.set(sName, iName)
  }

  // Step 4: Log which types failed to generate schemas.
  // 4단계: 스키마 생성에 실패한 타입들의 목록을 기록합니다.
  const allInterfaceNames = new Set(interfaceLocationMap.keys())
  const allGeneratedSchemaNames = new Set(survivedSchemaDeclarations.keys())
  const allExpectedSchemaNames = new Set(interfaceToSchemaNameMap.values())
  const failedInterfaceNames: string[] = []
  for (const interfaceName of allInterfaceNames) {
    const schemaName = `${camelCase(interfaceName, {
      preserveConsecutiveUppercase: true,
    })}Schema`
    if (!allGeneratedSchemaNames.has(schemaName)) {
      failedInterfaceNames.push(interfaceName)
    }
  }

  if (failedInterfaceNames.length > 0) {
    console.warn(
      `\x1b[33m[Zomoc] The following types were skipped (often due to unsupported generics):\x1b[0m`
    )
    console.warn(failedInterfaceNames.map((name) => `  - ${name}`).join("\n"))
  }

  // Step 5: Build the `finalSchemaTypeMap` for the mock generator, using interface names as keys.
  // 5단계: Mock 생성기를 위해, 인터페이스 이름을 키로 사용하는 `finalSchemaTypeMap`을 빌드합니다.
  const typeMapEntries: string[] = []
  for (const schemaName of survivedSchemaDeclarations.keys()) {
    const interfaceName = schemaNameToInterfaceNameMap.get(schemaName)
    if (interfaceName) {
      typeMapEntries.push(`'${interfaceName}': ${schemaName},`)
    }
  }

  // Step 6: Build the `finalSchemaUrlMap` for the axios interceptor from mock.json files.
  // 6단계: `mock.json` 파일들로부터 axios 인터셉터용 `finalSchemaUrlMap`을 빌드합니다.
  const urlMapEntries: string[] = []
  const mockPaths = options?.mockPaths || []
  const mockFiles = await glob(mockPaths, {
    cwd: projectRoot,
    absolute: true,
    ignore: "node_modules/**",
  })

  if (mockFiles.length > 0) {
    for (const mockFile of mockFiles) {
      try {
        const mockContent = await fs.readFile(mockFile, "utf-8")
        const mockMap = JSON.parse(mockContent)

        for (const [key, value] of Object.entries(mockMap)) {
          const mockConfig = value as MockConfig

          // --- Response Map Mode ---
          if (
            typeof mockConfig === "object" &&
            mockConfig !== null &&
            "responses" in mockConfig
          ) {
            const responseMap = mockConfig as ResponseMap
            const activeStatusKey = String(responseMap.status)
            let activeResponse: ResponseDefinition | undefined =
              responseMap.responses[activeStatusKey]
            let finalStatus = responseMap.status

            // Fallback to the first available response if the activeStatus is not found
            if (!activeResponse) {
              const fallbackStatusKey = Object.keys(responseMap.responses)[0]
              if (fallbackStatusKey) {
                activeResponse = responseMap.responses[fallbackStatusKey]
                finalStatus = Number(fallbackStatusKey)
                console.warn(
                  `[Zomoc] Warning: status ${activeStatusKey} not found in responses for '${key}'. Falling back to the first available status: ${finalStatus}.`
                )
              }
            }

            if (!activeResponse) continue

            const schemaName = activeResponse.responseType
              ? `${camelCase(activeResponse.responseType, {
                  preserveConsecutiveUppercase: true,
                })}Schema`
              : undefined

            if (schemaName && !survivedSchemaDeclarations.has(schemaName)) {
              continue
            }

            const registryValueObject = `{
    schema: ${schemaName || "undefined"},
    responseBody: ${
      activeResponse.responseBody
        ? JSON.stringify(activeResponse.responseBody)
        : "undefined"
    },
    status: ${finalStatus},
    pagination: ${
      activeResponse.pagination
        ? JSON.stringify(activeResponse.pagination)
        : "undefined"
    },
    strategy: '${activeResponse.mockingStrategy || "random"}',
    repeatCount: ${activeResponse.repeatCount ?? "undefined"}
  }`
            const urlEntry = `'${key}': ${registryValueObject},`
            urlMapEntries.push(urlEntry)
          }
          // --- Simple Mode (for backward compatibility) ---
          else {
            let responseDef: Omit<ResponseDefinition, "responseBody"> & {
              status?: number
            } = {}

            if (typeof mockConfig === "string") {
              responseDef = { responseType: mockConfig, status: 200 }
            } else if (typeof mockConfig === "object" && mockConfig !== null) {
              const { responseBody, ...rest } = mockConfig as any
              if (responseBody) {
                console.warn(
                  `[Zomoc] Warning: 'responseBody' is not supported in simple mode for '${key}'. Please use the 'responses' map structure.`
                )
              }
              responseDef = { ...rest, status: rest.status || 200 }
            } else {
              continue
            }

            const schemaName = responseDef.responseType
              ? `${camelCase(responseDef.responseType, {
                  preserveConsecutiveUppercase: true,
                })}Schema`
              : undefined

            if (schemaName && !survivedSchemaDeclarations.has(schemaName)) {
              continue
            }

            const registryValueObject = `{
    schema: ${schemaName || "undefined"},
    status: ${responseDef.status},
    pagination: ${
      responseDef.pagination
        ? JSON.stringify(responseDef.pagination)
        : "undefined"
    },
    strategy: '${responseDef.mockingStrategy || "random"}',
    repeatCount: ${responseDef.repeatCount ?? "undefined"}
  }`
            const urlEntry = `'${key}': ${registryValueObject},`
            urlMapEntries.push(urlEntry)
          }
        }
      } catch (e) {
        console.error(`[Zomoc] Error processing mock file ${mockFile}:`, e)
      }
    }
  }

  // Step 7: Assemble the final registry string from all parts.
  // 7단계: 모든 부분들을 조립하여 최종 레지스트리 문자열을 만듭니다.
  let finalRegistryString = `// Zomoc: Auto-generated mock registry. Do not edit.\nimport { z } from 'zod';\n\n`
  finalRegistryString += [...survivedSchemaDeclarations.values()].join("\n")

  const urlSchemaEntries = urlMapEntries.join("\n")
  const typeSchemaEntries = typeMapEntries.join("\n")

  finalRegistryString += `\n\nexport const finalSchemaUrlMap = {\n${urlSchemaEntries}\n} as const;\n`
  finalRegistryString += `\nexport const finalSchemaTypeMap = {\n${typeSchemaEntries}\n} as const;\n`

  return finalRegistryString
}

/**
 * Prepares the registry string for Vite's virtual module.
 * It removes `as const` to create plain JavaScript objects, maximizing compatibility.
 * @description Vite 가상 모듈을 위해 레지스트리 문자열을 준비합니다.
 * `as const`를 제거하여 순수한 JavaScript 객체로 만들어, 가상 모듈의 호환성을 극대화합니다.
 */
export async function generateViteVirtualModule(
  projectRoot: string,
  options?: ZomocCoreOptions
): Promise<string> {
  const registryString = await generateRegistryString(projectRoot, options)
  // `as const` is a TypeScript-specific construct for creating readonly values.
  // We remove it to ensure the output is a plain JavaScript object for the virtual module.
  // @description `as const`는 TypeScript에서 읽기 전용 값을 만들기 위한 구문입니다.
  // 가상 모듈을 위해, 이를 제거하여 순수한 JavaScript 객체로 만듭니다.
  return registryString.replace(/ as const/g, "")
}
