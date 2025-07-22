#!/usr/bin/env node
/**
 * This shebang line ensures that this file is executed using the Node.js runtime
 * when the script is run directly from the command line.
 * @description 이 shebang 라인은 스크립트가 커맨드 라인에서 직접 실행될 때,
 * Node.js 런타임으로 실행되도록 보장합니다.
 */
import { Command } from "commander"
import { generateRegistryString } from "./core"
import fs from "fs/promises"
import path from "path"

// Initialize the main command from commander.
// @description commander를 사용하여 메인 커맨드를 초기화합니다.
const program = new Command()

// Define the basic properties of the CLI tool.
// @description CLI 도구의 기본 속성을 정의합니다.
program
  .name("zomoc")
  .description("Zomoc: A Type-Safe Mocking Plugin CLI")
  .version("0.1.0")

// Define the `generate` command, its description, and available options.
// @description `generate` 명령어와 그에 대한 설명, 사용 가능한 옵션들을 정의합니다.
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
  // Define the action to be taken when the `generate` command is executed.
  // @description `generate` 명령어가 실행될 때 수행될 액션을 정의합니다.
  .action(async (options) => {
    try {
      console.log("🔄 Generating mock registry...")

      // 1. Run the core engine to get the registry content string.
      // 1단계: 코어 엔진을 실행하여 레지스트리 내용 문자열을 가져옵니다.
      const projectRoot = process.cwd()
      const registryContent = await generateRegistryString(projectRoot, {
        mockPaths: options.mockPaths,
        interfacePaths: options.interfacePaths,
      })

      // 2. Define output paths and create the `.zomoc` directory if it doesn't exist.
      // 2단계: 출력 경로를 정의하고, `.zomoc` 디렉토리가 없으면 생성합니다.
      const zomocDir = path.join(projectRoot, ".zomoc")
      const registryPath = path.join(zomocDir, "registry.ts")
      await fs.mkdir(zomocDir, { recursive: true })

      // 3. Write the generated content to the registry file.
      // 3단계: 생성된 내용을 레지스트리 파일에 씁니다.
      await fs.writeFile(registryPath, registryContent)

      console.log(`✅ Mock registry generated successfully at: ${registryPath}`)

      // 4. Ensure the `.zomoc` directory is included in `.gitignore`.
      // 4단계: `.zomoc` 디렉토리가 `.gitignore`에 포함되도록 처리합니다.
      const gitignorePath = path.join(projectRoot, ".gitignore")
      try {
        const gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
        if (!gitignoreContent.includes(".zomoc")) {
          // If .gitignore exists but doesn't include .zomoc, append it.
          // @description .gitignore 파일이 존재하지만 .zomoc을 포함하지 않는 경우, 추가합니다.
          await fs.appendFile(
            gitignorePath,
            "\n\n# Zomoc auto-generated files\n.zomoc\n"
          )
          console.log("📝 Added .zomoc to .gitignore")
        }
      } catch (e) {
        // If .gitignore does not exist, create it and add .zomoc.
        // @description .gitignore 파일이 존재하지 않는 경우, 새로 생성하고 .zomoc을 추가합니다.
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

// Parse the command-line arguments and execute the corresponding actions.
// @description 커맨드 라인 인수를 파싱하고 해당하는 액션을 실행합니다.
program.parse(process.argv)
