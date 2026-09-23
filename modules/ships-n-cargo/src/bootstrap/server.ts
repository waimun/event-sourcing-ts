/* v8 ignore file -- @preserve */
import { createDefaultApplication } from './composition-root'

const port = 3000

try {
  const runtime = await createDefaultApplication()
  runtime.application.listen(port, async (error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
      try {
        await runtime.close()
      } catch (closeError) {
        console.error(closeError)
      }
      return
    }
    console.log(`API listening at http://localhost:${port}`)
  })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(
    `Server startup failed: ${message}. Check SHIPS_N_CARGO_DATABASE_URL and run npm run db:setup before retrying.`
  )
  process.exitCode = 1
}
