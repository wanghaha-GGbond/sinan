export const DEPARTMENT_K_THRESHOLD = 5

export type DepartmentVisibilityInput = {
  verifiedAuthorCount: number
}

export function canExposeDepartment(input: DepartmentVisibilityInput): boolean {
  return input.verifiedAuthorCount >= DEPARTMENT_K_THRESHOLD
}

export function publicDepartmentLabel(
  departmentName: string | null,
  input: DepartmentVisibilityInput
): string | null {
  if (!departmentName) return null
  return canExposeDepartment(input) ? departmentName : null
}

export function anonymizeAuthorLabel(
  label: string,
  input: DepartmentVisibilityInput
): string {
  if (canExposeDepartment(input)) return label
  return label
    .replace(/\bL\d+\b/gi, "高职级")
    .replace(/\bP\d+\b/gi, "高职级")
    .replace(/\bM\d+\b/gi, "管理岗")
}
