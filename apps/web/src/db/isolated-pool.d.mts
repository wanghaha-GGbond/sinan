export function withIsolatedPool<Pool extends { end(): Promise<void> }, Result>(
  createPool: () => Pool,
  operation: (pool: Pool) => Promise<Result>,
): Promise<Result>
