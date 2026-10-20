const AR = 'https://turbo-gateway.com/raw/';
const WALRUS = 'https://aggregator.walrus-mainnet.walrus.space/v1/blobs/';

function paramsOf(req) {
  const raw = req.url || '';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  const search = new URLSearchParams(query);
  return {
    tx: search.get('tx') || req.query?.tx || '',
    blob: search.get('blob') || req.query?.blob || '',
  };
}

export default async function handler(req, res) {
  try {
    const { tx, blob } = paramsOf(req);
    const id = tx || blob;
    if (!id) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('需要 tx 或 blob');
      return;
    }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) {
      res.statusCode = 400;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('编号不对');
      return;
    }
    const upstream = await fetch(tx ? `${AR}${tx}` : `${WALRUS}${blob}`);
    const body = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=30');
    res.end(body);
  } catch {
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('后台没有连上存储');
  }
}
