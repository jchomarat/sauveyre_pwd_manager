import { Application, send } from 'https://deno.land/x/oak/mod.ts'
import router from './srv/routes.ts'

const env = Deno.env.toObject()
const HOST = env.HOST || '127.0.0.1'
const PORT = env.PORT || 3000

const app = new Application()

// Error handler middleware
app.use(async (context: any, next: any) => {
    try {
        await next();
    }
    catch (e) {
        console.log(e.stack);
    }
});

// Custom routes
app.use(router.routes())
app.use(router.allowedMethods())

// Static pages in www folder
app.use(async (context: any, next: any) => {
    await send(context, context.request.url.pathname, {
        root: `${Deno.cwd()}/www`,
        index: "index.html",
    });
    await next();
});

console.log(`Listening on port ${PORT} ...`)
await app.listen(`${HOST}:${PORT}`)