import fetch from 'node-fetch';
import Cors from 'micro-cors';

const cors = Cors({
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-api-key'],
    origin: 'https://fichajekotrik.web.app'
});

async function handler(req, res) {
    // 🔸 Si es preflight OPTIONS, respondemos OK
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 🔸 Comprobamos la clave secreta
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // 🔸 Solo aceptamos GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Only GET allowed' });
    }

    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const siteUrl = process.env.SITE_URL;

    try {
        // 🔸 Obtener token
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'https://graph.microsoft.com/.default'
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 🔸 Llamada para obtener Site info
        const siteInfoResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/kotrik.sharepoint.com:/sites/KOTRIKINDUSTRIAL`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!siteInfoResponse.ok) {
            const errorData = await siteInfoResponse.text();
            return res.status(500).json({ error: 'Failed to get site info', details: errorData });
        }

        const siteInfoData = await siteInfoResponse.json();
        return res.status(200).json({ success: true, site: siteInfoData });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default cors(handler);
