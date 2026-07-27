if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required for database integration tests. Use a disposable staging database."
  )
  process.exit(1)
}
