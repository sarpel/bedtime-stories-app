const request = require('supertest');
const app = require('../server');

describe('Smoke Test', () => {
  it('should return health check status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
