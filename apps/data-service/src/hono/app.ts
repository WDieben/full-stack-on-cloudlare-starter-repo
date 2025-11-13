import { Hono} from 'hono';
import { getLink } from '@repo/data-ops/queries/links';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";


export const App = new Hono<{ Bindings: Env}>();

App.get('/click-socket/:accountId', async (c) => {
    const upgradeHeader = c.req.header('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return c.text('Expected Upgrade: websocket', 426);
    }
    const accountId = c.req.header('accountId');
    if (!accountId) return c.text('No Headers', 404);
    const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId)
    const stub = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId)
    return await stub.fetch(c.req.raw)
})

// zelfde als in fastapi maar dan :name ipv {name}
App.get('/do/:name', async (c) => {
    const name = c.req.param("name")
    const doId = c.env.EVALUATION_SCHEDULER.idFromName(name)
    const stub = c.env.EVALUATION_SCHEDULER.get(doId)
    return c.json({

    })
})

App.get('/:id', async (c) => {
    const id = c.req.param('id');

    const linkInfo = await getRoutingDestinations(c.env, id)
    if (!linkInfo) {
        return c.text('Destination not found', 404);
    }
    const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf)
    if (!cfHeader.success) {
        return c.text('Invalid Cloudflare Headers', 400);
    }

    const headers = cfHeader.data
    const destination = getDestinationForCountry(linkInfo, headers.country)

    const queueMessage: LinkClickMessageType = {
        "type": "LINK_CLICK",
        data: { 
            id: id,
            country: headers.country,
            destination: destination,
            accountId: linkInfo.accountId,
            latitude: headers.latitude,
            longitude: headers.longitude,
            timestamp: new Date().toISOString(),
        }

    }
    c.executionCtx.waitUntil(
        c.env.QUEUE.send(queueMessage, {
            delaySeconds: 10 * 60 // 10 minutes
        })
    )
    return c.redirect(destination);
})