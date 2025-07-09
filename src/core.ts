import { glob } from "glob"
import { generate } from "ts-to-zod"
import fs from "fs/promises"
import { z } from "zod"
import camelCase from "camelcase"

export interface ZomocCoreOptions {
  mockPaths?: string[]
  interfacePaths?: string[]
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

  for (const mockFile of mockFiles) {
    try {
      const mockFileContent = await fs.readFile(mockFile, "utf-8")
      const urlMap: MockUrlMap = schema.parse(JSON.parse(mockFileContent))

      for (const [urlAndMethod, interfaceName] of Object.entries(urlMap)) {
        const interfaceFile = interfaceLocationMap.get(interfaceName)
        if (!interfaceFile) {
          console.warn(
            `[Zomoc] Warning: Interface "${interfaceName}" specified in ${mockFile} was not found in any of the scanned interface paths.`
          )
          continue
        }

        if (!allSchemaDefinitions.has(interfaceFile)) {
          try {
            const sourceText = await fs.readFile(interfaceFile, "utf-8")
            const zodSchemasFileContent = generate({
              sourceText,
              keepComments: false,
            }).getZodSchemasFile("")
            const schemasWithoutImport = zodSchemasFileContent.replace(
              /import { z } from "zod";\s*/,
              ""
            )
            allSchemaDefinitions.set(interfaceFile, schemasWithoutImport)
          } catch (e) {
            console.warn(
              `[Zomoc] Could not generate schema from file: ${interfaceFile}`,
              e
            )
          }
        }

        const schemaVariableName = camelCase(interfaceName, {
          preserveConsecutiveUppercase: true,
        })
        const finalSchemaName = `${
          schemaVariableName.charAt(0).toLowerCase() +
          schemaVariableName.slice(1)
        }Schema`
        urlToSchemaNameMap[urlAndMethod] = finalSchemaName
      }
    } catch (error) {
      console.warn(`[Zomoc] Warning: Failed to process ${mockFile}.`, error)
    }
  }

  let finalRegistryString = `// Zomoc: Auto-generated mock registry. Do not edit.\nimport { z } from 'zod';\n\n`
  for (const schemaFileContent of allSchemaDefinitions.values()) {
    finalRegistryString += `${schemaFileContent}\n`
  }

  const schemaEntries = Object.entries(urlToSchemaNameMap)
    .map(([urlAndMethod, schemaName]) => `  '${urlAndMethod}': ${schemaName}`)
    .join(",\n")

  finalRegistryString += `\nexport const finalSchemaUrlMap = {\n${schemaEntries}\n};\n`

  return finalRegistryString
}
