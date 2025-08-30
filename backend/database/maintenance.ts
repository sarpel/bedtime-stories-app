// @ts-nocheck
// database/maintenance.ts
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH: string = process.env.STORIES_DB_PATH || path.join(__dirname, 'stories.db');

/**
 * Database Maintenance Module
 * Provides comprehensive database maintenance, optimization, and cleanup functions
 */

interface VacuumResult {
  success: boolean;
  originalSize?: number;
  newSize?: number;
  spaceSaved?: number;
  error?: string;
}

interface AnalyzeResult {
  success: boolean;
  stats?: any;
  error?: string;
}

interface ReindexResult {
  success: boolean;
  indexesReindexed?: number;
  error?: string;
}

interface CleanupResult {
  success: boolean;
  totalCleaned?: number;
  orphanedAudio?: number;
  orphanedQueue?: number;
  orphanedSeriesRefs?: number;
  error?: string;
}

class DatabaseMaintenance {
  public dbPath: string;
  public db: Database.Database | null;

  constructor(dbPath: string = DB_PATH) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Connect to database
   */
  connect(): Database.Database {
    if (this.db) {
      return this.db;
    }
    this.db = new Database(this.dbPath);
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Vacuum database to reclaim space and optimize storage
   */
  vacuum(): VacuumResult {
    const db = this.connect();
    console.log('Starting database vacuum...');

    try {
      const startSize = fs.statSync(this.dbPath).size;
      db.exec('VACUUM;');
      const endSize = fs.statSync(this.dbPath).size;
      const savedBytes = startSize - endSize;

      console.log(`Database vacuum completed:`);
      console.log(`  Original size: ${(startSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  New size: ${(endSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Space saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);

      return {
        success: true,
        originalSize: startSize,
        newSize: endSize,
        spaceSaved: savedBytes
      };
    } catch (error) {
      console.error('Database vacuum failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Analyze database and update query statistics
   */
  analyze(): AnalyzeResult {
    const db = this.connect();
    console.log('Starting database analysis...');

    try {
      // Analyze all tables
      db.exec('ANALYZE;');

      // Get table statistics
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      const stats: any = {};
      tables.forEach((table: any) => {
        const tableStats = db.prepare(`
          SELECT
            COUNT(*) as row_count,
            SUM(pgsize) as total_size
          FROM ${table.name}
        `).get();

        stats[table.name] = tableStats;
      });

      console.log('Database analysis completed');
      return { success: true, stats };
    } catch (error) {
      console.error('Database analysis failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Reindex database tables for optimal performance
   */
  reindex(): ReindexResult {
    const db = this.connect();
    console.log('Starting database reindex...');

    try {
      // Get all indexes
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();

      // Reindex each index
      indexes.forEach((index: any) => {
        db.exec(`REINDEX ${index.name};`);
        console.log(`Reindexed: ${index.name}`);
      });

      console.log('Database reindex completed');
      return { success: true, indexesReindexed: indexes.length };
    } catch (error) {
      console.error('Database reindex failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Clean up orphaned records and optimize database integrity
   */
  cleanup(): CleanupResult {
    const db = this.connect();
    console.log('Starting database cleanup...');

    try {
      let totalCleaned = 0;

      // Clean up orphaned audio files (audio_files without corresponding stories)
      const orphanedAudio = db.prepare(`
        DELETE FROM audio_files
        WHERE story_id NOT IN (SELECT id FROM stories)
      `).run();

      totalCleaned += orphanedAudio.changes;
      if (orphanedAudio.changes > 0) {
        console.log(`Cleaned up ${orphanedAudio.changes} orphaned audio records`);
      }

      // Clean up orphaned queue items (queue items without corresponding stories)
      const orphanedQueue = db.prepare(`
        DELETE FROM queue
        WHERE story_id NOT IN (SELECT id FROM stories)
      `).run();

      totalCleaned += orphanedQueue.changes;
      if (orphanedQueue.changes > 0) {
        console.log(`Cleaned up ${orphanedQueue.changes} orphaned queue items`);
      }

      // Clean up orphaned series references in stories
      const orphanedSeriesRefs = db.prepare(`
        UPDATE stories
        SET series_id = NULL, series_order = NULL, series_title = NULL
        WHERE series_id NOT IN (SELECT id FROM series)
      `).run();

      totalCleaned += orphanedSeriesRefs.changes;
      if (orphanedSeriesRefs.changes > 0) {
        console.log(`Cleaned up ${orphanedSeriesRefs.changes} orphaned series references`);
      }

      // Profile feature removed: no profile reference cleanup

      console.log(`Database cleanup completed. Total records cleaned: ${totalCleaned}`);
      return {
        success: true,
        totalCleaned,
        orphanedAudio: orphanedAudio.changes,
        orphanedQueue: orphanedQueue.changes,
        orphanedSeriesRefs: orphanedSeriesRefs.changes
      };
    } catch (error) {
      console.error('Database cleanup failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check database integrity
   */
  integrityCheck() {
    const db = this.connect();
    console.log('Starting database integrity check...');

    try {
      const result = db.prepare('PRAGMA integrity_check;').get();
// @ts-expect-error - SQLite pragma result typing
      const isValid = result['integrity_check'] === 'ok';

      if (isValid) {
        console.log('Database integrity check passed');
      } else {
        console.error('Database integrity check failed:', result);
      }

      return { success: isValid, result: result['integrity_check'] };
    } catch (error) {
      console.error('Database integrity check failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    const db = this.connect();

    try {
      const stats = {};

      // Table row counts
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      tables.forEach(table => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        stats[table.name] = { rowCount: count.count };
      });

      // Database file size
      const dbStats = fs.statSync(this.dbPath);
      stats.fileSize = {
        bytes: dbStats.size,
        mb: (dbStats.size / 1024 / 1024).toFixed(2)
      };

      // Page statistics
      const pageStats = db.prepare('PRAGMA page_count; PRAGMA page_size; PRAGMA freelist_count;').all();
      stats.pages = {
        total: pageStats[0]['page_count'],
        size: pageStats[1]['page_size'],
        free: pageStats[2]['freelist_count'],
        used: pageStats[0]['page_count'] - pageStats[2]['freelist_count']
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run full maintenance suite
   */
  async fullMaintenance(): Promise<{ success: boolean; error?: string }> {
    console.log('Starting full database maintenance...');

    try {
      await Promise.resolve(); // Ensure async consistency
      const results = {
        integrity: this.integrityCheck(),
        cleanup: this.cleanup(),
        analyze: this.analyze(),
        reindex: this.reindex(),
        vacuum: this.vacuum(),
        stats: this.getStats()
      };

      console.log('Full database maintenance completed');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Optimize database for production use
   */
  optimize() {
    const db = this.connect();
    console.log('Starting database optimization...');

    try {
      // Set optimal pragmas for production
      db.exec(`
        PRAGMA synchronous = FULL;
        PRAGMA journal_mode = WAL;
        PRAGMA wal_autocheckpoint = 1000;
        PRAGMA cache_size = -2000;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 268435456;
      `);

      console.log('Database optimization completed');
      return { success: true };
    } catch (error) {
      console.error('Database optimization failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export functions for CLI usage
function runMaintenance(command) {
  const maintenance = new DatabaseMaintenance();

  switch (command) {
    case 'vacuum':
      return maintenance.vacuum();
    case 'analyze':
      return maintenance.analyze();
    case 'reindex':
      return maintenance.reindex();
    case 'cleanup':
      return maintenance.cleanup();
    case 'integrity':
      return maintenance.integrityCheck();
    case 'stats':
      return maintenance.getStats();
    case 'full':
      return maintenance.fullMaintenance();
    case 'optimize':
      return maintenance.optimize();
    default:
      console.log('Available commands:');
      console.log('  vacuum   - Reclaim disk space');
      console.log('  analyze  - Update query statistics');
      console.log('  reindex  - Rebuild indexes');
      console.log('  cleanup  - Remove orphaned records');
      console.log('  integrity- Check database integrity');
      console.log('  stats    - Show database statistics');
      console.log('  full     - Run complete maintenance');
      console.log('  optimize - Optimize for production');
      return;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const result = runMaintenance(command);

  if (result) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(0);
}

module.exports = DatabaseMaintenance;
