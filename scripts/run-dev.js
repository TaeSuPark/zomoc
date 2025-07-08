// scripts/run-dev.js
import { spawn, execSync } from "child_process"

function runScript(scriptName, ...args) {
  console.log(`\n[Run-Dev] Running "npm run ${scriptName}"...`)
  try {
    execSync(`npm run ${scriptName} ${args.join(" ")}`, { stdio: "inherit" })
  } catch (error) {
    console.error(
      `\n[Run-Dev] Error running script "npm run ${scriptName}". Exiting.`
    )
    process.exit(1)
  }
}

function cleanup() {
  console.log("\n[Run-Dev] Cleaning up temporary files...")
  runScript("zod:clean")
  console.log("[Run-Dev] Cleanup finished.")
  process.exit(0)
}

// 1. 모든 Zod 스키마 자동 생성
runScript("zod:gen-all")

// 2. Mock 레지스트리 생성
runScript("generate:mock-registry")

// 3. Vite 개발 서버 실행
console.log("\n[Run-Dev] Starting Vite development server...")
const viteProcess = spawn("npm", ["run", "start"], { stdio: "inherit" })

// 4. 종료 신호 감지 및 정리 작업 수행
process.on("SIGINT", () => {
  console.log("\n[Run-Dev] SIGINT signal received. Shutting down...")
  viteProcess.kill()
  cleanup()
})

process.on("SIGTERM", () => {
  console.log("\n[Run-Dev] SIGTERM signal received. Shutting down...")
  viteProcess.kill()
  cleanup()
})
