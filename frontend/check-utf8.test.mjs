import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectText } from './check-utf8.mjs';

const samples = [
  'Tái cấu trúc UI Dashboard Figma',
  'Xác minh lược đồ cơ sở dữ liệu SQL Server',
  'Huỳnh Lê Thành Nhân',
  'Tất cả phòng ban',
  'Theo dõi trạng thái công việc',
];

test('representative Vietnamese survives source and JSON round trips', () => {
  const roundTrip = JSON.parse(JSON.stringify(samples));
  assert.deepEqual(roundTrip, samples);
  assert.deepEqual(inspectText(roundTrip.join('\n')), []);
});

test('literal question marks embedded in Vietnamese words are rejected', () => {
  const findings = inspectText('Tái c?u trúc UI Dashboard Figma'); // utf8-check: intentional-corrupt-fixture
  assert.equal(findings[0]?.reason, 'question-mark-inside-vietnamese-word');
});

test('known mojibake is rejected', () => {
  const broken = '\u00c3\u00a1';
  assert.equal(inspectText(broken)[0]?.reason, 'known-mojibake-sequence');
});
