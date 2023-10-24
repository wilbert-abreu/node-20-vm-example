import assert from 'node:assert';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { mock, test } from 'node:test';

describe('A thing', () => {
	before(() => console.log('about to run some test'));
	after(() => console.log('finished running tests'));
	beforeEach((t) => t.diagnostic(`about to run ${t.name}`));
	afterEach(() => console.log('finished running a test'));
	it('should work', (t) => {
		t.skip();
		assert.strictEqual(1, 1);
	});
	it('should work', () => {
		assert.strictEqual(1, 1);
	});

	it('should be ok', () => {
		assert.strictEqual(2, 2);
	});

	describe('a nested thing', () => {
		it('should work', () => {
			assert.strictEqual(3, 3);
		});
	});

	describe('mock', () => {
		it('spies on a function', () => {
			const sum = mock.fn((a, b) => {
				return a + b;
			});

			assert.strictEqual(sum.mock.calls.length, 0);
			assert.strictEqual(sum(3, 4), 7);
			assert.strictEqual(sum.mock.calls.length, 1);

			const call = sum.mock.calls[0];
			assert.deepStrictEqual(call.arguments, [3, 4]);
			assert.strictEqual(call.result, 7);
			assert.strictEqual(call.error, undefined);

			// Reset the globally tracked mocks.
			mock.reset();
		});

		test('spies on an object method', (t) => {
			const number = {
				value: 5,
				add(a) {
					return this.value + a;
				},
			};

			t.mock.method(number, 'add');
			assert.strictEqual(number.add.mock.calls.length, 0);
			assert.strictEqual(number.add(3), 8);
			assert.strictEqual(number.add.mock.calls.length, 1);

			const call = number.add.mock.calls[0];

			assert.deepStrictEqual(call.arguments, [3]);
			assert.strictEqual(call.result, 8);
			assert.strictEqual(call.target, undefined);
			assert.strictEqual(call.this, number);
		});
	});
});
