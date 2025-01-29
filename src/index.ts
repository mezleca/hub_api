import dontenv from 'dotenv';

import { routes } from './routes/routes';
import { MongoDB } from './services/mongo';

dontenv.config();

const mongo = MongoDB.get_instance();
await mongo.connect();

Bun.serve({
    port: process.env.SERVER_PORT || 3000,
    async fetch (req) {

        const url = new URL(req.url);
        const route = routes[url.pathname];

        console.log(url.pathname);
        
        // make sure the route is valid
        if (!route) {
            return new Response('Not Found', { 
                status: 404,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                }
            });
        }

        // make sure the method is valid
        if (route.method !== req.method) {
            return new Response('Method Not Allowed', { 
                status: 405,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                }
            });
        }

        // execute the route callback
        const response = await route.callback(req);

        // set the CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

        return response;
    }
});