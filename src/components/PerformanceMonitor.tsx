import React, { useEffect, useState } from 'react';
import { SystemIntegrationManager, SystemHealth } from '@/services/systemIntegrationManager';
import { SystemResources } from '@/services/resourceMonitor';
import { logger } from '@/utils/logger';

// Performance monitoring dashboard for Pi Zero 2W
interface PerformanceData {
  systemHealth: SystemHealth;
  resources: SystemResources | null;
  errorStats: any;
  audioBufferStats: any;
  powerStats: any;
}

interface PerformanceMonitorProps {
  className?: string;
  updateInterval?: number;
  showAdvanced?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  updateInterval = 2000,
  showAdvanced = false
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [systemManager, setSystemManager] = useState<SystemIntegrationManager | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initialize system integration manager
    const manager = SystemIntegrationManager.getInstance();
    setSystemManager(manager);

    // Initial data fetch
    const fetchData = () => {
      try {
        const data = manager.getSystemStats();
        setPerformanceData(data);
        setLastUpdate(new Date());
      } catch (error) {
        logger.error('Failed to fetch performance data', 'PerformanceMonitor', {
          error: (error as Error)?.message
        });
      }
    };

    fetchData();

    // Set up health monitoring callback
    const unsubscribe = manager.onHealthUpdate((health: SystemHealth) => {
      try {
        const data = manager.getSystemStats();
        setPerformanceData(data);
        setLastUpdate(new Date());
      } catch (error) {
        logger.warn('Failed to update performance data', 'PerformanceMonitor', {
          error: (error as Error)?.message
        });
      }
    });

    // Set up periodic updates
    const interval = setInterval(fetchData, updateInterval);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [updateInterval]);

  if (!performanceData) {
    return (
      <div className={`performance-monitor loading ${className}`}>
        <div className="loading-indicator">
          <span>📊</span>
          <span>Loading performance data...</span>
        </div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'normal':
        return '#10B981'; // Green
      case 'degraded':
      case 'warning':
        return '#F59E0B'; // Orange
      case 'critical':
      case 'failed':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'normal':
        return '✅';
      case 'degraded':
      case 'warning':
        return '⚠️';
      case 'critical':
      case 'failed':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`performance-monitor ${className}`}>
      <style jsx>{`
        .performance-monitor {
          background: #1F2937;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 16px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          color: #E5E7EB;
          min-width: 300px;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          cursor: pointer;
          user-select: none;
        }

        .monitor-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .overall-status {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          background: #374151;
          font-size: 11px;
        }

        .loading {
          text-align: center;
          padding: 32px;
        }

        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0.7;
        }

        .loading-indicator span:first-child {
          font-size: 24px;
          animation: pulse 2s infinite;
        }

        .monitor-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .monitor-section {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 6px;
          padding: 12px;
        }

        .section-title {
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9CA3AF;
          margin-bottom: 8px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .status-item:last-child {
          margin-bottom: 0;
        }

        .status-label {
          font-size: 11px;
          color: #D1D5DB;
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .metric-bar {
          width: 60px;
          height: 4px;
          background: #374151;
          border-radius: 2px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 2px;
        }

        .expand-toggle {
          font-size: 12px;
          opacity: 0.7;
          transition: transform 0.2s ease;
        }

        .expand-toggle.expanded {
          transform: rotate(180deg);
        }

        .advanced-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #374151;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .stat-item {
          font-size: 10px;
          color: #9CA3AF;
        }

        .stat-value {
          font-weight: 600;
          color: #E5E7EB;
        }

        .last-update {
          font-size: 9px;
          color: #6B7280;
          text-align: center;
          margin-top: 8px;
          font-style: italic;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 480px) {
          .monitor-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="monitor-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="monitor-title">
          <span>📊</span>
          <span>System Monitor</span>
        </div>
        <div className="overall-status" style={{ color: getHealthColor(performanceData.health.overall) }}>
          <span>{getHealthIcon(performanceData.health.overall)}</span>
          <span>{performanceData.health.overall}</span>
        </div>
        <div className={`expand-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </div>
      </div>

      <div className="monitor-grid">
        {/* Services Status */}
        <div className="monitor-section">
          <div className="section-title">Services</div>
          {Object.entries(performanceData.health.services).map(([service, status]) => (
            <div key={service} className="status-item">
              <span className="status-label">{service.toUpperCase()}</span>
              <div className="status-value" style={{ color: getHealthColor(status) }}>
                <span>{getHealthIcon(status)}</span>
                <span>{status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Resources Status */}
        <div className="monitor-section">
          <div className="section-title">Resources</div>
          {Object.entries(performanceData.health.resources).map(([resource, status]) => (
            <div key={resource} className="status-item">
              <span className="status-label">{resource.toUpperCase()}</span>
              <div className="status-value" style={{ color: getHealthColor(status) }}>
                <span>{getHealthIcon(status)}</span>
                <span>{status}</span>
              </div>
            </div>
          ))}
          
          {/* Resource usage bars */}
          {performanceData.resources && (
            <>
              <div className="status-item">
                <span className="status-label">Memory</span>
                <div className="status-value">
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${performanceData.resources.memory?.percentage || 0}%`,
                        backgroundColor: performanceData.resources.memory?.percentage > 80 ? '#EF4444' : 
                                       performanceData.resources.memory?.percentage > 60 ? '#F59E0B' : '#10B981'
                      }}
                    />
                  </div>
                  <span>{performanceData.resources.memory?.percentage}%</span>
                </div>
              </div>
              <div className="status-item">
                <span className="status-label">CPU</span>
                <div className="status-value">
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${performanceData.resources.cpu?.usage || 0}%`,
                        backgroundColor: performanceData.resources.cpu?.usage > 80 ? '#EF4444' : 
                                       performanceData.resources.cpu?.usage > 60 ? '#F59E0B' : '#10B981'
                      }}
                    />
                  </div>
                  <span>{performanceData.resources.cpu?.usage}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="monitor-section" style={{ marginTop: '12px' }}>
        <div className="section-title">System</div>
        <div className="stats-grid">
          <div className="stat-item">
            Uptime: <span className="stat-value">{formatUptime(performanceData.health.uptime)}</span>
          </div>
          {performanceData.resources && (
            <div className="stat-item">
              Memory: <span className="stat-value">
                {performanceData.resources.memory?.used}MB / {performanceData.resources.memory?.total}MB
              </span>
            </div>
          )}
          {performanceData.errorStats && (
            <>
              <div className="stat-item">
                Errors: <span className="stat-value">{performanceData.errorStats.totalErrors}</span>
              </div>
              <div className="stat-item">
                Recovery: <span className="stat-value">{performanceData.errorStats.recoveryRate.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Advanced Section */}
      {(isExpanded || showAdvanced) && (
        <div className="advanced-section">
          {/* Audio Buffer Stats */}
          {performanceData.audioBufferStats && (
            <div className="monitor-section">
              <div className="section-title">Audio Buffers</div>
              <div className="stats-grid">
                <div className="stat-item">
                  Memory: <span className="stat-value">
                    {formatBytes(performanceData.audioBufferStats.totalMemoryUsage)}
                  </span>
                </div>
                <div className="stat-item">
                  Max Size: <span className="stat-value">
                    {performanceData.audioBufferStats.config.maxBufferSize}
                  </span>
                </div>
                <div className="stat-item">
                  Latency: <span className="stat-value">
                    {performanceData.audioBufferStats.config.targetLatency}ms
                  </span>
                </div>
                <div className="stat-item">
                  Compression: <span className="stat-value">
                    {performanceData.audioBufferStats.config.compressionEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Power Stats */}
          {performanceData.powerStats && (
            <div className="monitor-section">
              <div className="section-title">Power Management</div>
              <div className="stats-grid">
                <div className="stat-item">
                  Mode: <span className="stat-value">{performanceData.powerStats.currentMode}</span>
                </div>
                <div className="stat-item">
                  Battery: <span className="stat-value">{performanceData.powerStats.batteryLevel}%</span>
                </div>
                <div className="stat-item">
                  Temp: <span className="stat-value">
                    {performanceData.powerStats.thermalThrottling ? 'HOT' : 'OK'}
                  </span>
                </div>
                <div className="stat-item">
                  Activity: <span className="stat-value">
                    {performanceData.powerStats.activityLevel.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Statistics */}
          {performanceData.errorStats && (
            <div className="monitor-section">
              <div className="section-title">Error Statistics</div>
              <div className="stats-grid">
                <div className="stat-item">
                  Total: <span className="stat-value">{performanceData.errorStats.totalErrors}</span>
                </div>
                <div className="stat-item">
                  Recent: <span className="stat-value">{performanceData.errorStats.recentErrors}</span>
                </div>
                <div className="stat-item">
                  Recovery: <span className="stat-value">{performanceData.errorStats.recoveryRate.toFixed(1)}%</span>
                </div>
                <div className="stat-item">
                  Critical: <span className="stat-value">
                    {performanceData.errorStats.errorsBySeverity?.critical || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="last-update">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PerformanceMonitor;