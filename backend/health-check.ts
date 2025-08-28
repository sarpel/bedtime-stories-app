// health-check.ts
import * as http from 'http';

const PORT: string | number = process.env.PORT || 3001;

interface HealthCheckResult {
  status: 'healthy';
  data: any;
}

// Health check configuration
const healthCheck = (): Promise<HealthCheckResult> => {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  return new Promise<HealthCheckResult>((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ status: 'healthy', data: JSON.parse(data) });
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.setTimeout(options.timeout);
    req.end();
  });
};

// Run health check if called directly
if (require.main === module) {
  healthCheck()
    .then((result) => {
      console.log('✓ Health check passed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Health check failed:', error.message);
      process.exit(1);
    });
}

export default healthCheck;
