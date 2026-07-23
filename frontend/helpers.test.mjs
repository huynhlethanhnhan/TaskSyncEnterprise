import assert from 'node:assert/strict';
import test from 'node:test';
import { getPermissionsForUser } from './src/utils/permissions.ts';
import { safeEscapeCsvValue } from './src/utils/csv.ts';

test('permission helper maps correct flags based on roles', () => {
  // Admin permissions check
  const adminPerms = getPermissionsForUser({ role: 'admin', role_id: 1 });
  assert.equal(adminPerms.canCreateEmployee, true);
  assert.equal(adminPerms.canViewAuditLogs, true);

  // Manager permissions check
  const managerPerms = getPermissionsForUser({ role: 'manager', role_id: 2 });
  assert.equal(managerPerms.canCreateEmployee, false);
  assert.equal(managerPerms.canCreateProject, true);

  // Employee/Staff permissions check
  const employeePerms = getPermissionsForUser({ role: 'employee', role_id: 3 });
  assert.equal(employeePerms.canCreateEmployee, false);
  assert.equal(employeePerms.canViewAuditLogs, false);
  assert.equal(employeePerms.canCreateProject, false);
});

test('CSV safe escaper neutralizes Excel formula injections', () => {
  // Standard strings untouched
  assert.equal(safeEscapeCsvValue('Normal text'), 'Normal text');
  assert.equal(safeEscapeCsvValue(123), '123');

  // Excel injection characters neutralized
  assert.equal(safeEscapeCsvValue('=1+2'), "'=1+2");
  assert.equal(safeEscapeCsvValue('+44123'), "'+44123");
  assert.equal(safeEscapeCsvValue('-100'), "'-100");
  assert.equal(safeEscapeCsvValue('@test'), "'@test");

  // Strings containing commas wrapped in double quotes
  assert.equal(safeEscapeCsvValue('Hello, World'), '"Hello, World"');
});

test('project progress helper computes correct completion rate', () => {
  const computeProgress = (total, completed) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  assert.equal(computeProgress(0, 0), 0);
  assert.equal(computeProgress(5, 0), 0);
  assert.equal(computeProgress(10, 5), 50);
  assert.equal(computeProgress(3, 1), 33);
});
