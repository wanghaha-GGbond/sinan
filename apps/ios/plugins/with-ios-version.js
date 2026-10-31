const { withXcodeProject } = require("@expo/config-plugins")

/**
 * Keep Xcode's build-settings version in sync with Expo's single version
 * source. Expo writes the same values to Info.plist, but the generated
 * project otherwise keeps the template's 1.0 marketing version.
 */
module.exports = function withIosVersion(config) {
  return withXcodeProject(config, (projectConfig) => {
    const project = projectConfig.modResults
    const version = String(config.version ?? "1.0.0")
    const buildNumber = String(config.ios?.buildNumber ?? "1")
    const section = project.pbxXCBuildConfigurationSection()

    for (const entry of Object.values(section)) {
      if (!entry || typeof entry !== "object" || !entry.buildSettings) continue
      entry.buildSettings.MARKETING_VERSION = version
      entry.buildSettings.CURRENT_PROJECT_VERSION = buildNumber
    }

    return projectConfig
  })
}
