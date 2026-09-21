/* v8 ignore file -- @preserve */
import { createDefaultApplication } from './composition-root'

const application = createDefaultApplication()
const port = 3000

application.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
