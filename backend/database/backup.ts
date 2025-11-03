// database/backup.ts
import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";

const DB_PATH: string = process.env.DATABASE_PATH || "./database/stories.db";
const BACKUP_DIR: string = "./database/backups";

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup(): string {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(BACKUP_DIR, `stories-backup-${timestamp}.db`);

    // Create backup using SQLite backup API
    const sourceDb = new Database(DB_PATH, { readonly: true });
    const backupDb = new Database(backupPath);

    // @ts-expect-error - better-sqlite3 backup method typing
    sourceDb.backup(backupDb);

    sourceDb.close();
    backupDb.close();

    console.log(`Database backup created: ${backupPath}`);

    // Clean up old backups (keep last 7 days)
    cleanupOldBackups();

    return backupPath;
  } catch (error) {
    console.error("Backup failed:", error);
    throw error;
  }
}

function cleanupOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files
      .filter(
        (file) => file.startsWith("stories-backup-") && file.endsWith(".db"),
      )
      .map((file) => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Keep only the 7 most recent backups
    const filesToDelete = backupFiles.slice(7);

    filesToDelete.forEach((file) => {
      fs.unlinkSync(file.path);
      console.log(`Deleted old backup: ${file.name}`);
    });
  } catch (error) {
    console.error("Error cleaning up old backups:", error);
  }
}

function restoreBackup(backupPath: string): boolean {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Create a backup of current database before restoring
    const currentBackupPath = path.join(
      BACKUP_DIR,
      `stories-pre-restore-${Date.now()}.db`,
    );
    fs.copyFileSync(DB_PATH, currentBackupPath);
    console.log(`Current database backed up to: ${currentBackupPath}`);

    // Restore the backup
    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`Database restored from: ${backupPath}`);

    return true;
  } catch (error) {
    console.error("Restore failed:", error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "create":
      createBackup();
      break;
    case "restore":
      {
        const backupPath = process.argv[3];
        if (!backupPath) {
          console.error("Usage: node backup.js restore <backup-file-path>");
          process.exit(1);
        }
        restoreBackup(backupPath);
      }
      break;
    case "list":
      {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter(
            (file) =>
              file.startsWith("stories-backup-") && file.endsWith(".db"),
          )
          .map((file) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
              created: stats.mtime.toISOString(),
            };
          });
        console.table(files);
      }
      break;
    default:
      console.log("Usage:");
      console.log("  node backup.js create - Create a new backup");
      console.log(
        "  node backup.js restore <backup-file-path> - Restore from backup",
      );
      console.log("  node backup.js list - List available backups");
  }
}

export { createBackup, restoreBackup, cleanupOldBackups };
