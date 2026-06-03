const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")
const iosNodeModules = path.resolve(projectRoot, "node_modules")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  iosNodeModules,
  path.resolve(workspaceRoot, "node_modules"),
]

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/") || moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [iosNodeModules] }),
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
