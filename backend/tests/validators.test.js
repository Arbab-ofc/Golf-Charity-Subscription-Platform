import test from 'node:test';
import assert from 'node:assert/strict';
import { signupSchema } from '../src/utils/validators.js';

test('signupSchema accepts valid payload', () => {
  const parsed = signupSchema.parse({
    email: 'demo@example.com',
    password: 'Strong#123',
    fullName: 'Demo User',
  });

  assert.equal(parsed.email, 'demo@example.com');
});

test('signupSchema rejects weak password', () => {
  assert.throws(() => {
    signupSchema.parse({
      email: 'demo@example.com',
      password: 'weak',
      fullName: 'Demo User',
    });
  });
});
