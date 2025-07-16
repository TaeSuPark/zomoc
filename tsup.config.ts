import { defineConfig } from "tsup"

export default defineConfig([
  // 일반 라이브러리 파일들
  {
    entry: ["src/index.ts", "src/vite.ts", "src/next.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
  },
  // CLI 파일
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    platform: "node",
    // 'commander' 같은 외부 패키지는 번들에 포함하지 않고, import 구문을 그대로 둡니다.
    // 이렇게 해야 Node.js가 런타임에 node_modules에서 해당 패키지를 찾습니다.
    external: ["commander", "glob", "ts-to-zod", "camelcase"],
    dts: false,
    clean: false,
  },
])
