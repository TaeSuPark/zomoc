import { glob } from "glob"
import { generate } from "ts-to-zod"
import fs from "fs/promises"
import { z } from "zod"
import camelCase from "camelcase"
import { ZodTypeAny } from "zod"

export interface ZomocCoreOptions {
  mockPaths?: string[]
  interfacePaths?: string[]
}

interface RegistryValue {
  schema: ZodTypeAny
  pagination?: {
    itemsKey: string
    totalKey: string
    pageKey: string
    sizeKey: string
  }
}

const schema = z.record(z.string())
type MockUrlMap = z.infer<typeof schema>

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
        // match[1] is the interface name
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

export async function generateRegistryString(
  projectRoot: string,
  options?: ZomocCoreOptions
): Promise<string> {
  const interfacePaths = options?.interfacePaths || []
  const interfaceLocationMap = await createInterfaceIndex(
    projectRoot,
    interfacePaths
  )

  const mockPaths = options?.mockPaths || []
  const mockFiles = await glob(mockPaths, {
    cwd: projectRoot,
    absolute: true,
    ignore: "node_modules/**",
  })

  if (mockFiles.length === 0) {
    return `// Zomoc: No mock files found matching "${
      mockPaths.join(", ") || "[]"
    }"\nexport const finalSchemaUrlMap = {};\n`
  }

  const allSchemaDefinitions = new Map<string, string>() // Key: interface FILE PATH, Value: full zod schema string
  const urlToSchemaNameMap: Record<string, string> = {}
  const finalRegistryEntries: string[] = []

  for (const mockFile of mockFiles) {
    try {
      const mockContent = await fs.readFile(mockFile, "utf-8")
      const mockMap = JSON.parse(mockContent)

      for (const [key, value] of Object.entries(mockMap)) {
        let interfaceName: string
        let paginationConfig: any = null
        let mockingStrategy: "random" | "fixed" = "random"
        let repeatCount: number | undefined

        if (typeof value === "string") {
          interfaceName = value
        } else if (typeof value === "object" && value !== null) {
          const mockConfig = value as any
          interfaceName = mockConfig.responseType
          if (
            typeof mockConfig.pagination === "object" &&
            mockConfig.pagination !== null
          ) {
            paginationConfig = mockConfig.pagination
          }
          if (
            mockConfig.mockingStrategy === "fixed" ||
            mockConfig.mockingStrategy === "random"
          ) {
            mockingStrategy = mockConfig.mockingStrategy
          }
          if (typeof mockConfig.repeatCount === "number") {
            repeatCount = mockConfig.repeatCount
          }
        } else {
          continue
        }

        const interfaceFilePath = interfaceLocationMap.get(interfaceName)
        if (interfaceFilePath) {
          if (!allSchemaDefinitions.has(interfaceFilePath)) {
            const sourceText = await fs.readFile(interfaceFilePath, "utf-8")
            const zodSchemaFileContent = generate({
              sourceText,
            }).getZodSchemasFile("")
            // Remove the import statement from each generated schema file
            // to avoid redeclaration errors.
            const contentWithoutImport = zodSchemaFileContent.replace(
              /import\s+{\s*z\s*}\s+from\s+['"]zod['"];\s*/,
              ""
            )
            allSchemaDefinitions.set(interfaceFilePath, contentWithoutImport)
          }

          const schemaName = `${camelCase(interfaceName, {
            preserveConsecutiveUppercase: true,
          })}Schema`
          const definition = `
  '${key}': {
    schema: ${schemaName},
    pagination: ${JSON.stringify(paginationConfig) || "null"},
    strategy: '${mockingStrategy}',
    repeatCount: ${repeatCount ?? "undefined"}
  },`
          finalRegistryEntries.push(definition)
        }
      }
    } catch (e) {
      console.error(`[Zomoc] Error processing mock file ${mockFile}:`, e)
    }
  }

  // Add a single import statement at the very top.
  let finalRegistryString = `// Zomoc: Auto-generated mock registry. Do not edit.\nimport { z } from 'zod';\n\n`
  for (const schemaFileContent of allSchemaDefinitions.values()) {
    finalRegistryString += `${schemaFileContent}\n`
  }

  const schemaEntries = finalRegistryEntries.join("\n")

  finalRegistryString += `\nexport const finalSchemaUrlMap = {\n${schemaEntries}\n};\n`

  return finalRegistryString
}
