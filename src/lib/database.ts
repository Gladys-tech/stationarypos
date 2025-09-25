// Local database implementation for offline functionality
// This will work alongside Supabase for desktop app

export interface LocalDB {
  products: any[];
  sales: any[];
  expenses: any[];
  categories: any[];
  users: any[];
}

class LocalDatabase {
  private dbName = 'stapos-local-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('barcode', 'barcode', { unique: false });
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('sale_number', 'sale_number', { unique: true });
          salesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('sale_items')) {
          const saleItemsStore = db.createObjectStore('sale_items', { keyPath: 'id' });
          saleItemsStore.createIndex('sale_id', 'sale_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expensesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('categories')) {
          const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoriesStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('user_profiles')) {
          const usersStore = db.createObjectStore('user_profiles', { keyPath: 'id' });
          usersStore.createIndex('email', 'email', { unique: true });
        }
      };
    });
  }

  async get(storeName: string, key?: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = key ? store.get(key) : store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async query(storeName: string, indexName: string, value: any): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async exportData(): Promise<LocalDB> {
    const data: LocalDB = {
      products: await this.get('products'),
      sales: await this.get('sales'),
      expenses: await this.get('expenses'),
      categories: await this.get('categories'),
      users: await this.get('user_profiles')
    };
    return data;
  }

  async importData(data: LocalDB): Promise<void> {
    // Clear existing data
    await this.clear('products');
    await this.clear('sales');
    await this.clear('expenses');
    await this.clear('categories');
    await this.clear('user_profiles');

    // Import new data
    for (const product of data.products || []) {
      await this.put('products', product);
    }
    for (const sale of data.sales || []) {
      await this.put('sales', sale);
    }
    for (const expense of data.expenses || []) {
      await this.put('expenses', expense);
    }
    for (const category of data.categories || []) {
      await this.put('categories', category);
    }
    for (const user of data.users || []) {
      await this.put('user_profiles', user);
    }
  }
}

export const localDB = new LocalDatabase();

// Initialize the database when the module loads
localDB.init().catch(console.error);