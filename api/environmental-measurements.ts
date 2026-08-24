import { supabaseFetch, json } from './_lib/supabase.js';

function getId(req: any) {
  const value = req?.query?.id;
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: any, res: any) {
  const id = getId(req);
  try {
    if (req.method === 'GET') {
      const alerts = String(req?.query?.alerts || '') === '1';
      const filter = alerts
        ? `&reminder_enabled=eq.true&next_measurement_date=not.is.null&next_measurement_date=lte.${new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0,10)}`
        : '';
      const idFilter = id ? `&id=eq.${encodeURIComponent(String(id))}` : '';
      const response = await supabaseFetch(
        `/rest/v1/environmental_measurements?select=*&order=next_measurement_date.asc.nullslast${filter}${idFilter}`,
        { method: 'GET' },
      );
      const body = await response.text();
      const data = body ? JSON.parse(body) : [];
      if (id && Array.isArray(data) && data.length === 0) return json(res, 404, { error: 'Measurement not found' });
      return json(res, response.status, id && Array.isArray(data) && data.length === 1 ? data[0] : data);
    }

    if (req.method === 'POST' && !id) {
      const response = await supabaseFetch('/rest/v1/environmental_measurements?select=*', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(req.body || {}),
      });
      const body = await response.text();
      const data = body ? JSON.parse(body) : [];
      if (response.ok) await supabaseFetch('/rest/v1/rpc/process_environmental_measurement_reminders', { method: 'POST', body: '{}' }).catch(() => undefined);
      return json(res, response.status, Array.isArray(data) && data.length === 1 ? data[0] : data);
    }

    if (req.method === 'PATCH' && id) {
      const response = await supabaseFetch(`/rest/v1/environmental_measurements?id=eq.${encodeURIComponent(String(id))}&select=*`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...(req.body || {}), updated_at: new Date().toISOString() }),
      });
      const body = await response.text();
      const data = body ? JSON.parse(body) : [];
      if (response.ok) await supabaseFetch('/rest/v1/rpc/process_environmental_measurement_reminders', { method: 'POST', body: '{}' }).catch(() => undefined);
      if (response.ok && Array.isArray(data) && data.length === 0) return json(res, 404, { error: 'Measurement not found' });
      return json(res, response.status, Array.isArray(data) && data.length === 1 ? data[0] : data);
    }

    if (req.method === 'DELETE' && id) {
      const response = await supabaseFetch(`/rest/v1/environmental_measurements?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      });
      const body = await response.text();
      const data = body ? JSON.parse(body) : [];
      if (!response.ok) return json(res, response.status, { error: data?.message || 'Delete failed' });
      if (Array.isArray(data) && data.length === 0) return json(res, 404, { error: 'Measurement not found' });
      return json(res, 200, { ok: true, deleted: Array.isArray(data) ? data.length : 1 });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { error: 'Method not allowed' });
  } catch (error: any) {
    return json(res, error?.statusCode || 500, { error: error?.message || 'Unexpected error' });
  }
}
