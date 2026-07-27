import type { Metadata } from "next"

import { AccountSettingsClient } from "./account-settings-client"

export const metadata: Metadata = { title: "账号与数据 | 司南" }

export default function AccountSettingsPage() {
  return <AccountSettingsClient />
}
