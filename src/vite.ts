import type { Plugin } from "vite"
import { generateViteVirtualModule } from "./core"
import type { ZomocVitePluginOptions } from "./types"
import micromatch from "micromatch"

const VIRTUAL_MODULE_ID = "virtual:zomoc"
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

/**
 * The main Vite plugin for Zomoc.
 * It creates a virtual module `virtual:zomoc` that provides the auto-generated Zod schemas
 * and mock registries. It also handles Hot Module Replacement (HMR) to regenerate the
 * module when relevant source files (`mock.json`, interfaces) are changed.
 * @description Zomoc을 위한 메인 Vite 플러그인입니다.
 * 자동으로 생성된 Zod 스키마와 Mock 레지스트리를 제공하는 가상 모듈 `virtual:zomoc`을 생성합니다.
 * 또한, 관련된 소스 파일(`mock.json`, 인터페이스 파일 등)이 변경될 때
 * 모듈을 재생성하기 위해 HMR(Hot Module Replacement)을 처리합니다.
 *
 * @param options - Plugin options to specify paths for mock files and interfaces.
 */
export default function zomoc(options: ZomocVitePluginOptions = {}): Plugin {
  const {
    mockPaths = ["**/mock.json"],
    interfacePaths = ["**/interface.ts", "**/type.ts"],
    ...restOptions
  } = options

  const finalOptions = {
    mockPaths,
    interfacePaths,
    ...restOptions,
  }

  return {
    name: "zomoc-vite-plugin",

    /**
     * Vite hook to handle resolution of the virtual module ID.
     * When Vite encounters `import ... from 'virtual:zomoc'`, this hook intercepts it
     * and returns a resolved ID, signaling that this plugin will handle loading it.
     * @description 가상 모듈 ID의 resolve를 처리하는 Vite 훅입니다.
     * Vite가 `import ... from 'virtual:zomoc'` 구문을 만나면, 이 훅이 해당 요청을 가로채
     * resolve된 ID를 반환함으로써, 이 플러그인이 모듈 로딩을 처리할 것임을 알립니다.
     */
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      return null
    },

    /**
     * Vite hook to provide the content of the virtual module.
     * When the resolved virtual module ID is requested, this hook runs the Zomoc core engine
     * (`generateViteVirtualModule`) to generate the registry code on-the-fly.
     * @description 가상 모듈의 내용을 제공하는 Vite 훅입니다.
     * resolve된 가상 모듈 ID가 요청되면, 이 훅은 Zomoc 코어 엔진(`generateViteVirtualModule`)을 실행하여
     * 레지스트리 코드를 동적으로 생성합니다.
     */
    async load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const projectRoot = process.cwd()
        const registryString = await generateViteVirtualModule(projectRoot, {
          mockPaths: finalOptions.mockPaths,
          interfacePaths: finalOptions.interfacePaths,
        })
        console.log(
          "\n\x1b[35m[Zomoc] Generated Virtual Module Content:\n\x1b[0m",
          registryString
        )
        return registryString
      }
      return null
    },

    /**
     * Vite hook to handle Hot Module Replacement (HMR).
     * It watches for changes in any of the user-specified mock or interface files.
     * If a change is detected, it invalidates the virtual module, forcing Vite
     * to re-request it, and triggers a full page reload.
     * @description HMR(Hot Module Replacement)을 처리하는 Vite 훅입니다.
     * 사용자가 지정한 mock 또는 인터페이스 파일의 변경을 감시합니다.
     * 변경이 감지되면, 가상 모듈을 무효화하여 Vite가 모듈을 다시 요청하게 만들고,
     * 전체 페이지를 새로고침하도록 합니다.
     */
    async handleHotUpdate({ file, server }) {
      const isMockFile = micromatch.isMatch(file, finalOptions.mockPaths)
      const isInterfaceFile = micromatch.isMatch(
        file,
        finalOptions.interfacePaths
      )

      if (isMockFile || isInterfaceFile) {
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
