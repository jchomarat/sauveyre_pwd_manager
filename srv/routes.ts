import { Router } from '../deps.ts';
import { getConfig, isAllowed, getDBPath } from './controller.ts'

const router = new Router()
router.get('/config', getConfig)
      .get('/isAllowed/:user', isAllowed)
      .get('/dbpath', getDBPath)

export default router