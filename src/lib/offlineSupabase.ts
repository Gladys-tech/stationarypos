// Offline-compatible Supabase wrapper
import { localDB } from './database';

// Define interfaces that match Supabase's API structure
interface OfflineQueryBuilder {
  select: (columns?: string) => OfflineSelectBuilder;
  insert: (data: any) => OfflineInsertBuilder;
  update: (data: any) => OfflineUpdateBuilder;
  delete: () => OfflineDeleteBuilder;
}

interface OfflineSelectBuilder {
  eq: (column: string, value: any) => Promise<{ data: any[] | null; error: any }>;
  order: (column: string, options?: any) => Promise<{ data: any[] | null; error: any }>;
  gte: (column: string, value: any) => Promise<{ data: any[] | null; error: any }>;
  lt: (column: string, value: any) => Promise<{ data: any[] | null; error: any }>;
  in: (column: string, values: any[]) => Promise<{ data: any[] | null; error: any }>;
  single: () => Promise<{ data: any | null; error: any }>;
  then: (callback: any) => Promise<any>;
}

interface OfflineInsertBuilder {
  select: (columns?: string) => OfflineInsertSelectBuilder;
  single: () => Promise<{ data: any | null; error: any }>;
}

interface OfflineInsertSelectBuilder {
  single: () => Promise<{ data: any | null; error: any }>;
  then: (callback: any) => Promise<any>;
}

interface OfflineUpdateBuilder {
  eq: (column: string, value: any) => Promise<{ data: any | null; error: any }>;
}

interface OfflineDeleteBuilder {
  eq: (column: string, value: any) => Promise<{ data: any | null; error: any }>;
}

class OfflineSupabase {
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Generic method to handle database operations
  from(table: string): OfflineQueryBuilder {
    return {
      select: (columns = '*') => this.createSelectBuilder(table, columns),
      insert: (data: any) => this.createInsertBuilder(table, data),
      update: (data: any) => this.createUpdateBuilder(table, data),
      delete: () => this.createDeleteBuilder(table)
    };
  }

  private createSelectBuilder(table: string, columns: string): OfflineSelectBuilder {
    return {
      eq: (column: string, value: any) => this.handleSelect(table, columns, { [column]: value }),
      order: (column: string, options?: any) => this.handleSelect(table, columns, null, { column, ...options }),
      gte: (column: string, value: any) => this.handleSelect(table, columns, { [`${column}_gte`]: value }),
      lt: (column: string, value: any) => this.handleSelect(table, columns, { [`${column}_lt`]: value }),
      in: (column: string, values: any[]) => this.handleSelect(table, columns, { [`${column}_in`]: values }),
      single: () => this.handleSelectSingle(table, columns),
      then: (callback: any) => this.handleSelect(table, columns).then(callback)
    };
  }

  private createInsertBuilder(table: string, data: any): OfflineInsertBuilder {
    return {
      select: (columns = '*') => ({
        single: () => this.handleInsertWithSelect(table, data, columns, true),
        then: (callback: any) => this.handleInsertWithSelect(table, data, columns, false).then(callback)
      }),
      single: () => this.handleInsertWithSelect(table, data, '*', true)
    };
  }

  private createUpdateBuilder(table: string, data: any): OfflineUpdateBuilder {
    return {
      eq: (column: string, value: any) => this.handleUpdate(table, data, { [column]: value })
    };
  }

  private createDeleteBuilder(table: string): OfflineDeleteBuilder {
    return {
      eq: (column: string, value: any) => this.handleDelete(table, { [column]: value })
    };
  }

  private async handleSelect(table: string, columns: string, filters?: any, order?: any) {
    try {
      // Use local database for desktop app
      let data = await localDB.get(table);
      
      // Apply filters
      if (filters && data) {
        data = data.filter((item: any) => {
          return Object.entries(filters).every(([key, value]) => {
            if (key.endsWith('_gte')) {
              const field = key.replace('_gte', '');
              return new Date(item[field]) >= new Date(value as string);
            } else if (key.endsWith('_lt')) {
              const field = key.replace('_lt', '');
              return new Date(item[field]) < new Date(value as string);
            } else if (key.endsWith('_in')) {
              const field = key.replace('_in', '');
              return (value as any[]).includes(item[field]);
            } else {
              return item[key] === value;
            }
          });
        });
      }
      
      // Apply ordering
      if (order && data) {
        data.sort((a: any, b: any) => {
          const aVal = a[order.column];
          const bVal = b[order.column];
          if (order.ascending === false) {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Database error:', error);
      return { data: null, error };
    }
  }

  private async handleSelectSingle(table: string, columns: string) {
    const result = await this.handleSelect(table, columns);
    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  private async handleInsertWithSelect(table: string, data: any, columns: string, single: boolean) {
    try {
      // Add ID if not present
      if (!data.id) {
        data.id = crypto.randomUUID();
      }
      
      // Add timestamps
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      
      // Save locally
      await localDB.put(table, data);
      
      return {
        data: single ? data : [data],
        error: null
      };
    } catch (error) {
      console.error('Insert error:', error);
      return {
        data: null,
        error
      };
    }
  }

  private async handleUpdate(table: string, data: any, filters: any) {
    try {
      // Add updated timestamp
      data.updated_at = new Date().toISOString();
      
      // Update locally
      const localItems = await localDB.get(table);
      const updatedItems = localItems.map((item: any) => {
        const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
        return matches ? { ...item, ...data } : item;
      });
      
      for (const item of updatedItems) {
        await localDB.put(table, item);
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Update error:', error);
      return { data: null, error };
    }
  }

  private async handleDelete(table: string, filters: any) {
    try {
      // Delete locally
      const localItems = await localDB.get(table);
      for (const item of localItems) {
        const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
        if (matches) {
          await localDB.delete(table, item.id);
        }
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('Delete error:', error);
      return { data: null, error };
    }
  }

  // Auth methods (simplified for offline use)
  auth = {
    getSession: async () => {
      // Return cached session or create a default one
      const cachedUser = localStorage.getItem('offline-user');
      if (cachedUser) {
        return {
          data: {
            session: {
              user: JSON.parse(cachedUser)
            }
          },
          error: null
        };
      }
      return { data: { session: null }, error: null };
    },
    
    signInWithPassword: async (credentials: any) => {
      // Offline login - check against local users
      const users = await localDB.get('user_profiles');
      const user = users.find((u: any) => u.email === credentials.email);
      
      if (user) {
        localStorage.setItem('offline-user', JSON.stringify(user));
        return {
          data: { user },
          error: null
        };
      } else {
        return {
          data: { user: null },
          error: { message: 'Invalid credentials' }
        };
      }
    },
    
    signUp: async (credentials: any) => {
      const newUser = {
        id: crypto.randomUUID(),
        email: credentials.email,
        created_at: new Date().toISOString()
      };
      
      // Offline signup
      localStorage.setItem('offline-user', JSON.stringify(newUser));
      return {
        data: { user: newUser },
        error: null
      };
    },
    
    signOut: async () => {
      localStorage.removeItem('offline-user');
      return { error: null };
    },
    
    onAuthStateChange: (callback: any) => {
      // Simulate auth state change for offline mode
      const cachedUser = localStorage.getItem('offline-user');
      if (cachedUser) {
        setTimeout(() => {
          callback('SIGNED_IN', { user: JSON.parse(cachedUser) });
        }, 100);
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },

    updateUser: async (updates: any) => {
      const cachedUser = localStorage.getItem('offline-user');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        const updatedUser = { ...user, ...updates };
        localStorage.setItem('offline-user', JSON.stringify(updatedUser));
        return { data: { user: updatedUser }, error: null };
      }
      return { data: { user: null }, error: { message: 'No user found' } };
    },

    getUser: async () => {
      const cachedUser = localStorage.getItem('offline-user');
      if (cachedUser) {
        return { data: { user: JSON.parse(cachedUser) }, error: null };
      }
      return { data: { user: null }, error: null };
    }
  };

  private async syncData() {
    // Sync local data with online database when connection is restored
    try {
      console.log('Syncing data with online database...');
      // Implementation for syncing pending changes
      // This would involve checking for local changes and pushing them to the server
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

export const offlineSupabase = new OfflineSupabase();