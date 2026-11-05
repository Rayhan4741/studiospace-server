import assert from 'assert';

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasCollision(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && eA > sB;
}

console.log('Testing booking collision logic...');
assert.strictEqual(hasCollision('10:00', '14:00', '12:00', '16:00'), true);
assert.strictEqual(hasCollision('10:00', '14:00', '08:00', '11:00'), true);
assert.strictEqual(hasCollision('10:00', '14:00', '11:00', '13:00'), true);
assert.strictEqual(hasCollision('10:00', '14:00', '14:00', '18:00'), false);
assert.strictEqual(hasCollision('10:00', '14:00', '06:00', '10:00'), false);
console.log('All collision logic tests passed!');

