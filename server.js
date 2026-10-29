const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const CLAIM_MS = 30_000; // short mock timer for the demo
const items = new Map();
let nextId = 1;

function sweep(now = Date.now()) {
  for (const item of items.values()) {
    if (item.status === 'claimed' && now > item.claimExpiresAt) {
      item.status = 'available';
      item.claimedBy = null;
      item.claimExpiresAt = null;
    }
  }
}
setInterval(sweep, 1000).unref();

app.get('/api/items', (req, res) => {
  sweep();
  res.json([...items.values()].filter(i => i.status !== 'sold'));
});

app.post('/api/items', (req, res) => {
  const body = req.body ?? {};
  const { title, category, condition, sellerName } = body;
  if (!title || !sellerName) return res.status(400).json({ error: 'title and sellerName required' });
  const item = {
    id: String(nextId++), title, category, condition, sellerName,
    status: 'available', claimedBy: null, claimExpiresAt: null
  };
  items.set(item.id, item);
  res.status(201).json(item);
});

app.post('/api/items/:id/claim', (req, res) => {
  sweep();
  const body = req.body ?? {};
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (!body.buyer) return res.status(400).json({ error: 'buyer required' });
  if (body.buyer === item.sellerName) return res.status(400).json({ error: 'You cannot claim your own item' });
  if (item.status !== 'available') return res.status(409).json({ error: 'Item is no longer available' });

  item.status = 'claimed';
  item.claimedBy = body.buyer;
  item.claimExpiresAt = Date.now() + CLAIM_MS;
  res.json(item);
});

app.post('/api/items/:id/confirm', (req, res) => {
  sweep();
  const body = req.body ?? {};
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.status !== 'claimed' || item.claimedBy !== body.buyer) {
    return res.status(409).json({ error: 'No active claim for this buyer (it may have expired)' });
  }
  item.status = 'sold';
  res.json(item);
});

app.post('/api/items/:id/mark-sold', (req, res) => {
  const body = req.body ?? {};
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.sellerName !== body.seller) return res.status(403).json({ error: 'Only the seller can do this' });
  item.status = 'sold';
  res.json(item);
});

app.listen(3000, () => console.log('Running at http://localhost:3000'));
