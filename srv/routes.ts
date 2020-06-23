import { Router } from 'https://deno.land/x/oak/mod.ts'
import { getConfig, isAllowed, getDBPath } from './controller.ts'

const router = new Router()
router.get('/config', getConfig)
      .get('/isAllowed/:user', isAllowed)
      .get('/dbpath', getDBPath)

export default router