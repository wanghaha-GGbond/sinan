import { CompanyDirectory } from "./company-directory"

export function CompanyDirectoryPanel() {
  return <section className="px-4 py-6 sm:px-6">
    <h2 className="mb-6 text-2xl font-semibold">公司</h2>
    <CompanyDirectory />
  </section>
}
