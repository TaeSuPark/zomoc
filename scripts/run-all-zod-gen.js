// scripts/run-all-zod-gen.js
import { glob } from "glob"
import { exec } from "child_process"
import path from "path"
import fs from "fs"

const projectRoot = process.cwd()
const mockMapPattern = "**/mock.json"

async function runAllZodGen() {
  console.log(
    "[Zod Gen All] Searching for mock.json files to determine which interfaces to convert..."
  )

  const mockFiles = await glob(mockMapPattern, {
    cwd: projectRoot,
    ignore: "node_modules/**",
  })

  if (mockFiles.length === 0) {
    console.log("[Zod Gen All] No mock.json files found. Nothing to generate.")
    return
  }

  console.log(
    `[Zod Gen All] Found ${mockFiles.length} mock.json file(s). Starting generation...`
  )

  const generationPromises = mockFiles.map((mockFile) => {
    return new Promise((resolve, reject) => {
      // mock.json이 있는 디렉토리를 기준으로 interface.ts를 찾습니다.
      // 예: /path/to/feature/api/mock.json -> /path/to/feature/model/interface.ts
      const featureDir = path.join(path.dirname(mockFile), "..")
      const inputFile = path.join(featureDir, "model", "interface.ts")
      const outputFile = path.join(featureDir, "model", "interface.zod.ts")

      // 입력 파일이 실제로 존재하는지 확인
      if (!fs.existsSync(path.join(projectRoot, inputFile))) {
        console.warn(
          `[Zod Gen All] Skipping: Input file not found for ${mockFile} at ${inputFile}`
        )
        resolve(null)
        return
      }

      const command = `npx ts-to-zod ${inputFile} ${outputFile}`
      console.log(`[Zod Gen All] Running: ${command}`)

      exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `[Zod Gen All] Failed to generate for ${inputFile}: ${stderr}`
          )
          reject(new Error(`Failed for ${inputFile}`))
        } else {
          console.log(`[Zod Gen All] ✅ Successfully generated: ${outputFile}`)
          resolve(outputFile)
        }
      })
    })
  })

  try {
    await Promise.all(generationPromises)
    console.log("[Zod Gen All] All Zod schemas generated successfully.")
  } catch (error) {
    console.error(
      "[Zod Gen All] An error occurred during Zod schema generation. Halting script."
    )
    process.exit(1)
  }
}

runAllZodGen()
