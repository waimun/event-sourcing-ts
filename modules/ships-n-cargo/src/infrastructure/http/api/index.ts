/* v8 ignore file -- @preserve */
import { createApplication } from './application'

const application = createApplication()
const port = 3000

application.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
