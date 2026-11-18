import test from 'node:test';
import assert from 'node:assert/strict';

test('repository does not claim success after a failed cart write', async () => {
  const { createShopRepository } = await import('../src/services/shopRepository.js');
  const client = {
    rpc: async () => ({ data: null, error: { message: 'Network failure' } }),
  };
  await assert.rejects(createShopRepository(client).adjustCart(2, 36, 1));
});

test('repository confirmation only transmits preferences, not prices or owner', async () => {
  const { createShopRepository } = await import('../src/services/shopRepository.js');
  let request;
  const repository = createShopRepository({
    rpc: async (name, args) => {
      request = { name, args };
      return { data: { id: 'demo', total: 414 }, error: null };
    },
  });
  const order = await repository.confirmOrder('attempt', {
    department: 'Cochabamba',
    method: 'delivery',
    date: '2030-01-01',
    accepted: true,
    price: 0,
    user_id: 'other',
  });
  assert.equal(order.total, 414);
  assert.deepEqual(Object.keys(request.args).sort(), [
    'p_ack',
    'p_date',
    'p_department',
    'p_method',
    'p_request_id',
  ]);
});
