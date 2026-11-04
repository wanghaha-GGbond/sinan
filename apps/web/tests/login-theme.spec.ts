import { expect, test, type Locator } from "@playwright/test"

async function contrast(locator: Locator, placeholder = false) {
  return locator.evaluate((element, placeholder) => {
    const context = document.createElement("canvas").getContext("2d")!
    const chain: Element[] = []
    for (let node: Element | null = element; node; node = node.parentElement) chain.unshift(node)
    context.fillStyle = "white"; context.fillRect(0, 0, 1, 1)
    for (const node of chain) {
      context.fillStyle = getComputedStyle(node).backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    const luminance = () => {
      const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
        const c = channel / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    const background = luminance()
    context.fillStyle = getComputedStyle(element, placeholder ? "::placeholder" : null).color
    context.fillRect(0, 0, 1, 1)
    const foreground = luminance()
    return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05)
  }, placeholder)
}

for (const width of [390, 1280]) for (const theme of ["light", "dark"]) {
  test(`login remains readable in ${theme} at ${width}px, including focus and errors`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
    await page.route("**/api/auth/login", route => route.fulfill({ status: 401, json: { error: "邮箱或密码错误" } }))
    await page.goto("/login?next=%2Fme")
    const main = page.getByRole("main")
    const emailTab = main.getByRole("button", { name: "邮箱", exact: true })
    const phoneTab = main.getByRole("button", { name: "手机", exact: true })
    await expect(emailTab).toHaveAttribute("aria-pressed", "true")
    await expect.poll(() => contrast(emailTab)).toBeGreaterThanOrEqual(4.5)
    for (const tab of [phoneTab, emailTab]) {
      await tab.click()
      await expect(tab).toHaveAttribute("aria-pressed", "true")
      await expect.poll(() => contrast(tab)).toBeGreaterThanOrEqual(4.5)
      const field = page.getByLabel(tab === phoneTab ? "手机号" : "邮箱", { exact: true })
      await field.focus()
      await expect(field).toBeFocused()
      await expect.poll(() => contrast(field)).toBeGreaterThanOrEqual(4.5)
      await expect.poll(() => contrast(field, true)).toBeGreaterThanOrEqual(4.5)
    }
    const email = page.getByLabel("邮箱", { exact: true })
    await email.fill("invalid")
    await page.getByLabel("密码", { exact: true }).focus()
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect.poll(() => contrast(page.locator("#login-email-error"))).toBeGreaterThanOrEqual(4.5)
    await email.fill("test@example.invalid")
    const password = page.getByLabel("密码", { exact: true })
    await password.fill("test-only-password")
    await expect.poll(() => contrast(password)).toBeGreaterThanOrEqual(4.5)
    const submit = main.getByRole("button", { name: "登录", exact: true })
    await expect.poll(() => contrast(submit)).toBeGreaterThanOrEqual(4.5)
    await submit.click()
    await expect(main.getByRole("alert")).toHaveText("邮箱或密码错误")
    await expect.poll(() => contrast(main.getByRole("alert"))).toBeGreaterThanOrEqual(4.5)
    await expect(page).toHaveURL(/\/login\?next=%2Fme/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`login-${theme}-${width}.png`), fullPage: true })
  })
}
