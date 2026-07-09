const request = require('supertest');
const app = require('../index');

describe('Express Application Route Suite', () => {
  
  // Test 1: Home page loads with 200 OK
  test('GET / should return index.html and respond with 200 OK', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('CI/CD Demonstration Web Application');
  });

  // Test 2: Health check endpoint returns status ok and a valid ISO timestamp
  test('GET /health should return 200 OK with JSON status: ok and a timestamp', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
  });

  // Test 3: Version endpoint responds with the commit SHA
  test('GET /api/version should return 200 OK with the GIT_SHA payload', async () => {
    const response = await request(app).get('/api/version');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('version');
    expect(typeof response.body.version).toBe('string');
  });

  // Test 4: Unknown routes respond with a proper 404 structure
  test('GET /non-existent-route-path should return 404 with error message', async () => {
    const response = await request(app).get('/non-existent-route-path');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Route Not Found');
  });
});
