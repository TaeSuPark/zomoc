#!/usr/bin/env node
import { Command } from "commander"
import { generateRegistryString } from "./core"
import fs from "fs/promises"
import path from "path"

const program = new Command()

program
  .name("zomoc")
  .description("Zomoc: A Type-Safe Mocking Plugin CLI")
  .version("0.0.1")

program
  .command("generate")
  .description("Generates the mock registry file (.zomoc/registry.ts)")
  .option(
    "-m, --mock-paths <paths...>",
    "Glob patterns for mock definition files",
    ["**/mock.json"]
  )
  .option(
    "-i, --interface-paths <paths...>",
    "Glob patterns for TypeScript interface files",
    ["**/interface.ts", "**/type.ts"]
  )
  .action(async (options) => {
    try {
      console.log("🔄 Generating mock registry...")
      const projectRoot = process.cwd()
      const registryContent = await generateRegistryString(projectRoot, {
        mockPaths: options.mockPaths,
        interfacePaths: options.interfacePaths,
      })

      const zomocDir = path.join(projectRoot, ".zomoc")
      const registryPath = path.join(zomocDir, "registry.ts")

      // Ensure .zomoc directory exists
      await fs.mkdir(zomocDir, { recursive: true })

      // Write the registry file
      await fs.writeFile(registryPath, registryContent)

      console.log(`✅ Mock registry generated successfully at: ${registryPath}`)

      // Bonus: Ensure .zomoc is in .gitignore
      const gitignorePath = path.join(projectRoot, ".gitignore")
      try {
        const gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
        if (!gitignoreContent.includes(".zomoc")) {
          await fs.appendFile(
            gitignorePath,
            "\n\n# Zomoc auto-generated files\n.zomoc\n"
          )
          console.log("📝 Added .zomoc to .gitignore")
        }
      } catch (e) {
        // .gitignore doesn't exist, create it
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          await fs.writeFile(
            gitignorePath,
            "# Zomoc auto-generated files\n.zomoc\n"
          )
          console.log("📝 Created .gitignore and added .zomoc")
        }
      }
    } catch (error) {
      console.error("❌ An error occurred during registry generation:", error)
      process.exit(1)
    }
  })

program.parse(process.argv)
