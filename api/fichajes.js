// /api/fichajes.js

export default async function handler(req, res) {
  // Leer variables de entorno
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const siteUrl = process.env.SITE_URL;
  const listName = process.env.LIST_NAME;

  // Leer parámetro "cliente"
  const clienteParam = req.query.cliente;

  if (!clienteParam) {
    return res.status(400).json({ error: "Falta parámetro ?cliente=" });
  }

  try {
    // Paso 1: Obtener token de Microsoft Graph
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "https://graph.microsoft.com/.default",
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Error obteniendo token", details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // Paso 2: Obtener Site ID
    const siteResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteUrl)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const siteData = await siteResponse.json();

    const siteId = siteData.id;
    if (!siteId) {
      return res.status(500).json({ error: "Error obteniendo Site ID", details: siteData });
    }

    // Paso 3: Obtener List ID
    const listResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const listData = await listResponse.json();
    const listId = listData.id;
    if (!listId) {
      return res.status(500).json({ error: "Error obteniendo List ID", details: listData });
    }

    // Paso 4: Obtener items de la lista
    const itemsResponse = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=1000`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const itemsData = await itemsResponse.json();

    if (!itemsData.value) {
      return res.status(500).json({ error: "Error obteniendo items", details: itemsData });
    }

    // Paso 5: Filtrar y mapear resultados
    const fichajes = itemsData.value
      .map(item => item.fields)
      .filter(item => item.Cliente === clienteParam)
      .map(item => ({
        Nombre: item.Nombre || "",
        Cliente: item.Cliente || "",
        Pasaporte: item.Pasaporte || "",
        FechaHora: item.FechaHora || "",
        TipoFichaje: item.TipoFichaje || "",
        HorasTrabajadas: item.HorasTrabajadas || 0,
        MinutosTrabajados: item.MinutosTrabajados || 0
      }));

    // Devolver resultado
    return res.status(200).json(fichajes);

  } catch (error) {
    console.error("Error en /api/fichajes:", error);
    return res.status(500).json({ error: "Error en /api/fichajes", details: error.message });
  }
}
