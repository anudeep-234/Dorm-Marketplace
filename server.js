const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const CLAIM_MS = 2 * 60 * 1000; // 2-minute hold
let nextId = 1;
const items = [];

// Lazy expiry: check on every read/write, so no background timers needed
function refresh(item) {
  if (item.status === 'claimed' && Date.now() > item.claimExpiresAt) {
    item.status = 'available';
    item.claimedBy = null;
    item.claimExpiresAt = null;
  }
  return item;
}

app.get('/api/items', (req, res) => {
  res.json(items.map(refresh));
});

app.post('/api/items', (req, res) => {
  const { title, seller } = req.body;
  if (!title || !seller) return res.status(400).json({ error: 'title and seller required' });
  const item = { id: nextId++, title, seller, status: 'available', claimedBy: null, claimExpiresAt: null };
  items.push(item);
  res.status(201).json(item);
});

// Scenario 1: Concurrency
// Node runs this handler synchronously, so the check and the update happen
// in one step. A second request can't slip in between them.
app.post('/api/items/:id/claim', (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  refresh(item);
  if (item.status !== 'available') {
    return res.status(409).json({ error: 'Item is no longer available' });
  }
  item.status = 'claimed';
  item.claimedBy = req.body.buyer;
  item.claimExpiresAt = Date.now() + CLAIM_MS;
  res.json(item);
});

// Scenario 2: Ghost buyer. Confirm must happen before expiry.
app.post('/api/items/:id/confirm', (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  refresh(item);
  if (item.status !== 'claimed' || item.claimedBy !== req.body.buyer) {
    return res.status(409).json({ error: 'No valid claim to confirm (it may have expired)' });
  }
  item.status = 'sold';
  item.claimExpiresAt = null;
  res.json(item);
});

// Scenario 3: Hallway sale. Seller override.
app.post('/api/items/:id/sold', (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.seller !== req.body.seller) return res.status(403).json({ error: 'Only the seller can do this' });
  item.status = 'sold';
  item.claimedBy = null;
  item.claimExpiresAt = null;
  res.json(item);
});

app.listen(3000, () => console.log('Running at http://localhost:3000'));