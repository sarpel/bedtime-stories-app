// monitoring/metrics.ts
import { EventEmitter } from 'events';

interface RequestMetrics {
  total: number;
  success: number;
  error: number;
  rate: number;
}

interface DatabaseMetrics {
  queries: number;
  errors: number;
  avg_time: number;
}

interface MemoryMetrics {
  used: number;
  free: number;
  percentage: number;
}

interface LLMRequestsMetrics {
  total: number;
  success: number;
  error: number;
  avg_time: number;
}

interface TTSRequestsMetrics {
  total: number;
  success: number;
  error: number;
  avg_time: number;
}

interface MetricsData {
  requests: RequestMetrics;
  response_times: number[];
  database: DatabaseMetrics;
  memory: MemoryMetrics;
  llm_requests: LLMRequestsMetrics;
  tts_requests: TTSRequestsMetrics;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  metrics: any;
}

class MetricsCollector extends EventEmitter {
  public metrics: MetricsData;
  public startTime: number;
  public requestWindow: number[];

  constructor() {
    super();
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        rate: 0
      },
      response_times: [],
      database: {
        queries: 0,
        errors: 0,
        avg_time: 0
      },
      memory: {
        used: 0,
        free: 0,
        percentage: 0
      },
      llm_requests: {
        total: 0,
        success: 0,
        error: 0,
        avg_time: 0
      },
      tts_requests: {
        total: 0,
        success: 0,
        error: 0,
        avg_time: 0
      }
    };

    this.startTime = Date.now();
    this.requestWindow = [];

    // Collect system metrics every 30 seconds
    setInterval(() => this.collectSystemMetrics(), 30000);

    // Clean up old request data every minute
    setInterval(() => this.cleanupRequestWindow(), 60000);
  }

  recordRequest(method: string, path: string, statusCode: number, responseTime: number): void {
    this.metrics.requests.total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    this.metrics.response_times.push(responseTime);
    this.requestWindow.push(Date.now());

    // Keep only last 1000 response times for memory efficiency
    if (this.metrics.response_times.length > 1000) {
      this.metrics.response_times.shift();
    }

    this.emit('request', { method, path, statusCode, responseTime });
  }

  recordDatabaseQuery(queryTime: number, error: boolean = false): void {
    this.metrics.database.queries++;
    if (error) {
      this.metrics.database.errors++;
    }

    // Calculate average query time
    const currentAvg = this.metrics.database.avg_time;
    const totalQueries = this.metrics.database.queries;
    this.metrics.database.avg_time = ((currentAvg * (totalQueries - 1)) + queryTime) / totalQueries;

    this.emit('database_query', { queryTime, error });
  }

  recordLLMRequest(responseTime: number, error: boolean = false): void {
    this.metrics.llm_requests.total++;
    if (error) {
      this.metrics.llm_requests.error++;
    } else {
      this.metrics.llm_requests.success++;
    }

    // Calculate average response time
    const successCount = this.metrics.llm_requests.success;
    if (successCount > 0) {
      const currentAvg = this.metrics.llm_requests.avg_time;
      this.metrics.llm_requests.avg_time = ((currentAvg * (successCount - 1)) + responseTime) / successCount;
    }

    this.emit('llm_request', { responseTime, error });
  }

  recordTTSRequest(responseTime: number, error: boolean = false): void {
    this.metrics.tts_requests.total++;
    if (error) {
      this.metrics.tts_requests.error++;
    } else {
      this.metrics.tts_requests.success++;
    }

    // Calculate average response time
    const successCount = this.metrics.tts_requests.success;
    if (successCount > 0) {
      const currentAvg = this.metrics.tts_requests.avg_time;
      this.metrics.tts_requests.avg_time = ((currentAvg * (successCount - 1)) + responseTime) / successCount;
    }

    this.emit('tts_request', { responseTime, error });
  }

  collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Calculate request rate (requests per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestWindow.filter(time => time > oneMinuteAgo);
    this.metrics.requests.rate = recentRequests.length;

    this.emit('system_metrics', this.metrics);
  }

  cleanupRequestWindow(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.requestWindow = this.requestWindow.filter(time => time > oneHourAgo);
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      uptime: Math.round((Date.now() - this.startTime) / 1000), // seconds
      avg_response_time: this.metrics.response_times.length > 0
        ? Math.round(this.metrics.response_times.reduce((a, b) => a + b, 0) / this.metrics.response_times.length)
        : 0
    };
  }

  getHealthStatus(): HealthStatus {
    const metrics = this.getMetrics();

    // Determine health status based on metrics
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    // Check error rate
    const errorRate = metrics.requests.total > 0
      ? (metrics.requests.error / metrics.requests.total) * 100
      : 0;

    if (errorRate > 10) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    } else if (errorRate > 5) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
    }

    // Check memory usage
    if (metrics.memory.percentage > 90) {
      status = 'unhealthy';
      issues.push(`High memory usage: ${metrics.memory.percentage}%`);
    } else if (metrics.memory.percentage > 80) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`High memory usage: ${metrics.memory.percentage}%`);
    }

    // Check average response time
    if (metrics.avg_response_time > 5000) {
      status = 'unhealthy';
      issues.push(`Slow response time: ${metrics.avg_response_time}ms`);
    } else if (metrics.avg_response_time > 2000) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Slow response time: ${metrics.avg_response_time}ms`);
    }

    return {
      status,
      issues,
      metrics
    };
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

// Express middleware for automatic request tracking
const metricsMiddleware = (req: any, res: any, next: any): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req.method, req.path, res.statusCode, responseTime);
  });

  next();
};

export {
  MetricsCollector,
  metricsCollector,
  metricsMiddleware,
  type HealthStatus,
  type MetricsData
};
