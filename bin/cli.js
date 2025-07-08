#!/usr/bin/env node

import { program } from "commander"
import { execSync } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

program
  .command("gen")
  .description("Generate zod schemas and the mock registry file.")
  .action(() => {
    console.log("Generating zod schemas from mock.json files...")
    try {
      const zodGenScriptPath = path.resolve(
        __dirname,
        "../scripts/run-all-zod-gen.js"
      )
      execSync(`node ${zodGenScriptPath}`, { stdio: "inherit" })

      console.log("\nGenerating mock registry...")
      const registryGenScriptPath = path.resolve(
        __dirname,
        "../scripts/generate-mock-registry.js"
      )
      execSync(`node ${registryGenScriptPath}`, { stdio: "inherit" })

      console.log("\n✅ All files generated successfully!")
    } catch (error) {
      console.error("\n❌ An error occurred during file generation.")
      process.exit(1)
    }
  })

program.parse(process.argv)
