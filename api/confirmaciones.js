import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 🔸 CORS - Solo permite peticiones desde tu dominio
    res.setHeader('Access-Control-Allow-Origin', 'https://fichajekotrik.web.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

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

    // 🔸 Solo aceptamos POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    const { Cliente, CodigoCliente, Empleado, Mes, Accion } = req.body;

    if (!Cliente || !CodigoCliente || !Empleado || !Mes || !Accion) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const siteUrl = process.env.SITE_URL;
    const listName = 'ConfirmacionesHorarios';

    try {
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

        const listResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteUrl}/lists/${listName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const listData = await listResponse.json();
        const listId = listData.id;

        const createResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteUrl}/lists/${listId}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    Cliente: Cliente,
                    CodigoCliente: CodigoCliente,
                    Empleado: Empleado,
                    Mes: Mes,
                    Accion: Accion
                }
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.text();
            return res.status(500).json({ error: 'Failed to create item', details: errorData });
        }

        const createdItem = await createResponse.json();
        return res.status(200).json({ success: true, item: createdItem });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
