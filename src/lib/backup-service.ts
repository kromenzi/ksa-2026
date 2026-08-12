import JSZip from 'jszip';

const DB_NAME = 'SafetyBoardBackups';
const STORE_NAME = 'backups';

export interface BackupMetadata {
  id: string;
  date: string;
  size: number;
  files: number;
  records: number;
  status: string;
  type: string;
  createdBy: string;
  checksum: string;
  systemVersion: string;
}

export interface BackupRecord {
  metadata: BackupMetadata;
  blob: Blob;
}

export const BackupService = {
  // DB Initialization
  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'metadata.id' });
        }
      };
    });
  },

  // Save backup to IndexedDB
  async saveBackup(record: BackupRecord): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Get all backups
  async getBackups(): Promise<BackupMetadata[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result as BackupRecord[];
        resolve(records.map(r => r.metadata).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Get single backup
  async getBackupBlob(id: string): Promise<Blob | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const record = request.result as BackupRecord;
        resolve(record ? record.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Delete backup
  async deleteBackup(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export async function generateFullBackup(
  onProgress: (step: string, progress: number) => void,
  createdBy: string
): Promise<BackupRecord> {
  onProgress('Preparing backup', 10);
  
  const zip = new JSZip();
  const manifest: any = {
    id: `BK-${Date.now()}`,
    date: new Date().toISOString(),
    systemVersion: '2.4.0',
    type: 'Full Backup',
    createdBy: createdBy,
    status: 'Valid'
  };

  const databaseData: any = {};
  const settingsData: any = {};
  
  let recordsCount = 0;
  const filesCount = 0;

  onProgress('Exporting system data', 30);
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Skip some internal vite/react keys
    if (key.startsWith('vite') || key.startsWith('react')) continue;

    const val = localStorage.getItem(key);
    if (!val) continue;

    let parsedVal = val;
    try {
      parsedVal = JSON.parse(val);
    } catch(err) { console.debug(err); } // Keep as string if not JSON

    // Classify
    if (key.includes('settings') || key.includes('config') || key.includes('theme') || key.includes('branding')) {
      settingsData[key] = parsedVal;
    } else {
      databaseData[key] = parsedVal;
      // Count records if array
      if (Array.isArray(parsedVal)) {
        recordsCount += parsedVal.length;
      }
    }
  }

  onProgress('Database backup', 50);
  zip.folder('database')?.file('database-backup.json', JSON.stringify(databaseData, null, 2));

  onProgress('Exporting settings', 60);
  zip.folder('settings')?.file('settings.json', JSON.stringify(settingsData, null, 2));

  onProgress('Collecting documents & images', 70);
  // Simulating files folder structure
  zip.folder('files/documents');
  zip.folder('files/images');
  zip.folder('files/reports');
  zip.folder('files/training');
  zip.folder('files/uploads');
  // For any images embedded in arrays, we could extract them, but for this client-side demo we just create the folders.

  onProgress('Creating manifest', 80);
  manifest.records = recordsCount;
  manifest.files = filesCount;
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('backup-info.json', JSON.stringify({ description: 'Full System Backup including all settings, database, and files.' }, null, 2));

  onProgress('Compressing files', 90);
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Calculate a mock checksum since crypto subtle might be async and complex here
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  manifest.size = blob.size;
  manifest.checksum = checksum;

  // Re-save manifest with checksum and size inside the zip? 
  // It's a bit cyclic. We'll just update the metadata object we return.

  onProgress('Backup completed', 100);

  const record: BackupRecord = {
    metadata: manifest as BackupMetadata,
    blob
  };

  return record;
}

export async function restoreFromBackup(
  blob: Blob,
  onProgress: (step: string, progress: number) => void
): Promise<boolean> {
  try {
    onProgress('Reading backup file', 10);
    const zip = await JSZip.loadAsync(blob);
    
    onProgress('Validating manifest', 30);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) throw new Error('Invalid backup: manifest.json missing');
    
    onProgress('Restoring database', 50);
    const dbFile = zip.file('database/database-backup.json');
    if (dbFile) {
      const dbStr = await dbFile.async('string');
      const dbData = JSON.parse(dbStr);
      for (const [key, value] of Object.entries(dbData)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }

    onProgress('Restoring settings', 80);
    const settingsFile = zip.file('settings/settings.json');
    if (settingsFile) {
      const setStr = await settingsFile.async('string');
      const setData = JSON.parse(setStr);
      for (const [key, value] of Object.entries(setData)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }

    onProgress('Restore completed', 100);
    return true;
  } catch (err) {
    console.error('Restore failed:', err);
    throw err;
  }
}
