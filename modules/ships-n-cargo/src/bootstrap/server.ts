/* v8 ignore file -- @preserve */
import { createDefaultApplication } from './composition-root'

const application = createDefaultApplication()
const port = 3000

application.listen(port, (error) => {
  if (error) {
    console.error(error)
    process.exitCode = 1
    return
  }
  console.log(`API listening at http://localhost:${port}`)
})
