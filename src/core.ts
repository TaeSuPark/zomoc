import { glob } from "glob"
import { generate } from "ts-to-zod"
import path from "path"
import fs from "fs/promises"
import { z } from "zod"

export interface ZomocCoreOptions {
  /**
   * Glob pattern to find mock definition files.
   * @default '**' /mock.json'
   */
  mockMapPattern?: string
}

const schema = z.record(z.string())
type MockUrlMap = z.infer<typeof schema>

/**
 * Generates the mock registry content as a string based on mock map files.
 * This function is framework-agnostic and does not write to the filesystem.
 *
 * @param projectRoot - The absolute path to the root of the user's project.
 * @param options - Configuration options for the core engine.
 * @returns The content of the virtual `mock.registry.ts` file.
 */
export async function generateRegistryString(
  projectRoot: string,
  options?: ZomocCoreOptions
): Promise<string> {
  const mockMapPattern = options?.mockMapPattern || "**/mock.json"

  const mockFiles = await glob(mockMapPattern, {
    cwd: projectRoot,
    absolute: true,
    ignore: "node_modules/**",
  })

  if (mockFiles.length === 0) {
    return `// Zomoc: No mock files found matching "${mockMapPattern}"\nexport const finalSchemaUrlMap = {};\n`
  }

  const allSchemaDefinitions = new Map<string, string>() // Key: interface file path, Value: full zod schema string
  const urlToSchemaNameMap: Record<string, string> = {}

  for (const mockFile of mockFiles) {
    try {
      const mockFileContent = await fs.readFile(mockFile, "utf-8")
      const urlMap: MockUrlMap = schema.parse(JSON.parse(mockFileContent))

      const interfaceFile = path.resolve(
        path.dirname(mockFile),
        "..",
        "model",
        "interface.ts"
      )

      // Generate schemas only once per interface file to avoid duplication
      if (!allSchemaDefinitions.has(interfaceFile)) {
        try {
          const sourceText = await fs.readFile(interfaceFile, "utf-8")
          const zodSchemasFileContent = generate({
            sourceText,
            keepComments: false,
          }).getZodSchemasFile("")

          // Remove the import statement as we'll add it once manually at the top.
          const schemasWithoutImport = zodSchemasFileContent.replace(
            /import { z } from "zod";\s*/,
            ""
          )
          allSchemaDefinitions.set(interfaceFile, schemasWithoutImport)
        } catch (e) {
          console.warn(
            `[Zomoc] Could not read or process interface file: ${interfaceFile}`
          )
          continue // Skip to next mockFile if interface file is missing
        }
      }

      // Map URLs to their schema variable names
      for (const url in urlMap) {
        const interfaceNameFromJson = urlMap[url]
        const zodSchemaName = `${interfaceNameFromJson}Schema`
        urlToSchemaNameMap[url] = zodSchemaName
      }
    } catch (error) {
      console.warn(`[Zomoc] Warning: Failed to process ${mockFile}.`, error)
    }
  }

  // Build the final registry string
  let finalRegistryString = `// Zomoc: Auto-generated mock registry. Do not edit.\nimport { z } from 'zod';\n\n`

  // 1. Append all schema definitions from all files first.
  // This ensures base schemas are defined before they are extended.
  for (const schemaFileContent of allSchemaDefinitions.values()) {
    finalRegistryString += `${schemaFileContent}\n`
  }

  // 2. Build the final map object that references the schema variables.
  const schemaEntries = Object.entries(urlToSchemaNameMap)
    .map(([url, schemaName]) => {
      return `  '${url}': ${schemaName}`
    })
    .join(",\n")

  finalRegistryString += `\nexport const finalSchemaUrlMap = {\n${schemaEntries}\n};\n`

  return finalRegistryString
}
