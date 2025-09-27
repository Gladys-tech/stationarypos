// Offline-compatible Supabase wrapper
import { localDB } from './database';

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
  from(table: string) {
    return {
      select: (columns = '*') => ({
        eq: (column: string, value: any) => this.handleSelect(table, columns, { [column]: value }),
        order: (column: string, options?: any) => this.handleSelect(table, columns, null, { column, ...options }),
        gte: (column: string, value: any) => this.handleSelect(table, columns, { [`${column}_gte`]: value }),
        lt: (column: string, value: any) => this.handleSelect(table, columns, { [`${column}_lt`]: value }),
        single: () => this.handleSelectSingle(table, columns),
        then: (callback: any) => this.handleSelect(table, columns).then(callback)
      }),
      insert: (data: any) => this.handleInsert(table, data),
      update: (data: any) => ({
        eq: (column: string, value: any) => this.handleUpdate(table, data, { [column]: value })
      }),
      delete: () => ({
        eq: (column: string, value: any) => this.handleDelete(table, { [column]: value })
      })
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
      return { data: [], error };
    }
  }

  private async handleSelectSingle(table: string, columns: string) {
    const result = await this.handleSelect(table, columns);
    return {
      data: result.data?.[0] || null,
      error: result.error
    };
  }

  private async handleInsert(table: string, data: any) {
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
      
      // Return an object that mimics Supabase's chainable API
      return {
        data: [data], 
        error: null,
        select: (columns = '*') => ({
          single: () => Promise.resolve({ data: data, error: null }),
          then: (callback: any) => Promise.resolve({ data: [data], error: null }).then(callback)
        }),
        single: () => Promise.resolve({ data: data, error: null })
      };
    } catch (error) {
      console.error('Insert error:', error);
      return {
        data: null, 
        error,
        select: (columns = '*') => ({
          single: () => Promise.resolve({ data: null, error }),
          then: (callback: any) => Promise.resolve({ data: null, error }).then(callback)
        }),
        single: () => Promise.resolve({ data: null, error })
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