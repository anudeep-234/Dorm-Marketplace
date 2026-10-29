const base = 'http://localhost:3000/api';
const json = { 'Content-Type': 'application/json' };

async function run() {
  const created = await fetch(`${base}/items`, {
    method: 'POST', headers: json,
    body: JSON.stringify({ title: 'Calc textbook', sellerName: 'Ana' })
  }).then(r => r.json());

  const claim = buyer => fetch(`${base}/items/${created.id}/claim`, {
    method: 'POST', headers: json,
    body: JSON.stringify({ buyer })
  }).then(r => r.status);

  const statuses = await Promise.all([claim('Ben'), claim('Cara')]);
  console.log('Statuses:', statuses);

  const sorted = [...statuses].sort();
  const passed = sorted[0] === 200 && sorted[1] === 409;
  console.log(passed ? 'PASS: one claim succeeded, one was rejected' : 'FAIL: expected [200, 409]');
  process.exitCode = passed ? 0 : 1;
}

run().catch(err => {
  console.error('Test error. Is the server running?', err.message);
  process.exitCode = 1;
});
