import type { Plugin, ResolvedConfig, HmrContext } from "vite"
import { generateRegistryString, ZomocCoreOptions } from "./core"

const VIRTUAL_MODULE_ID = "virtual:zomoc"
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID

export interface ZomocVitePluginOptions extends ZomocCoreOptions {}

export default function zomoc(options?: ZomocVitePluginOptions): Plugin {
  let projectRoot: string

  return {
    name: "zomoc-vite-plugin",

    // 1. Vite 설정이 확정되면, 프로젝트 루트 경로를 저장합니다.
    configResolved(config: ResolvedConfig) {
      projectRoot = config.root
    },

    // 2. 'virtual:zomoc' 모듈 ID를 우리만의 고유 ID로 해석(resolve)합니다.
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },

    // 3. 고유 ID에 해당하는 모듈을 요청받으면, 코어 엔진을 실행하여 내용을 생성합니다.
    async load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return generateRegistryString(projectRoot, options)
      }
    },

    // 4. mock 파일이나 interface 파일이 변경되면, 가상 모듈을 다시 로드하도록 Vite에 알립니다.
    async handleHotUpdate({ file, server }: HmrContext) {
      const mockMapPattern = options?.mockMapPattern || "**/mock.json"

      // A more robust check is needed, this is a simplification
      if (file.endsWith("mock.json") || file.endsWith("interface.ts")) {
        const module = server.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_MODULE_ID
        )
        if (module) {
          server.moduleGraph.invalidateModule(module)
          server.ws.send({
            type: "full-reload",
            path: "*",
          })
        }
      }
    },
  }
}
