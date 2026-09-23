/* v8 ignore file -- @preserve */
import { createDefaultApplication } from './composition-root'
import { formatDatabaseStartupFailure, formatServerListenFailure } from './startup-failure'

const port = 3000

try {
  const runtime = await createDefaultApplication()
  runtime.application.listen(port, async (error) => {
    if (error) {
      console.error(formatServerListenFailure(error, port))
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
  console.error(formatDatabaseStartupFailure(error))
  process.exitCode = 1
}
