import { describe, it, expect } from 'vitest';
import { homeForRole } from './role-routing';

// Assignment requirement: "בדיקת ניתוב לפי role (client→/today, admin→/catalog)".
describe('homeForRole — post sign-up/sign-in routing', () => {
  it('sends an admin to /catalog', () => {
    expect(homeForRole('admin')).toBe('/catalog');
  });
  it('sends a client to /today', () => {
    expect(homeForRole('client')).toBe('/today');
  });
  it('treats any unrecognised role as client, defensively', () => {
    expect(homeForRole('something-unexpected')).toBe('/today');
  });
});
