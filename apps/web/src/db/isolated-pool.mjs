// WebSocket connections belong to the request that created them in Workers.
// End the operation's own pool before resolving, including rollback/error paths.
export async function withIsolatedPool(createPool, operation) {
  const pool = createPool()
  try {
    return await operation(pool)
  } finally {
    await pool.end()
  }
}
