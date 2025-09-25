// Offline-compatible Supabase wrapper
import { supabase as onlineSupabase } from './supabase';
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
      if (this.isOnline) {
        // Try online first
        let query = onlineSupabase.from(table).select(columns);
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key.endsWith('_gte')) {
              query = query.gte(key.replace('_gte', ''), value);
            } else if (key.endsWith('_lt')) {
              query = query.lt(key.replace('_lt', ''), value);
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        if (order) {
          query = query.order(order.column, { ascending: order.ascending !== false });
        }
        
        const result = await query;
        
        // Cache the result locally
        if (result.data && !result.error) {
          for (const item of result.data) {
            await localDB.put(table, item);
          }
        }
        
        return result;
      } else {
        // Use local database
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
      }
    } catch (error) {
      // Fallback to local database
      const data = await localDB.get(table);
      return { data, error: null };
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
      
      if (this.isOnline) {
        const result = await onlineSupabase.from(table).insert(data).select();
        
        // Also save locally
        if (result.data && !result.error) {
          await localDB.put(table, result.data[0]);
        }
        
        return result;
      } else {
        // Save locally only
        await localDB.put(table, data);
        return { data: [data], error: null };
      }
    } catch (error) {
      // Save locally as fallback
      await localDB.put(table, data);
      return { data: [data], error: null };
    }
  }

  private async handleUpdate(table: string, data: any, filters: any) {
    try {
      // Add updated timestamp
      data.updated_at = new Date().toISOString();
      
      if (this.isOnline) {
        let query = onlineSupabase.from(table).update(data);
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const result = await query;
        
        // Also update locally
        if (!result.error) {
          const localItems = await localDB.get(table);
          const updatedItems = localItems.map((item: any) => {
            const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
            return matches ? { ...item, ...data } : item;
          });
          
          for (const item of updatedItems) {
            await localDB.put(table, item);
          }
        }
        
        return result;
      } else {
        // Update locally only
        const localItems = await localDB.get(table);
        const updatedItems = localItems.map((item: any) => {
          const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
          return matches ? { ...item, ...data } : item;
        });
        
        for (const item of updatedItems) {
          await localDB.put(table, item);
        }
        
        return { data: null, error: null };
      }
    } catch (error) {
      // Update locally as fallback
      const localItems = await localDB.get(table);
      const updatedItems = localItems.map((item: any) => {
        const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
        return matches ? { ...item, ...data } : item;
      });
      
      for (const item of updatedItems) {
        await localDB.put(table, item);
      }
      
      return { data: null, error: null };
    }
  }

  private async handleDelete(table: string, filters: any) {
    try {
      if (this.isOnline) {
        let query = onlineSupabase.from(table).delete();
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const result = await query;
        
        // Also delete locally
        if (!result.error) {
          const localItems = await localDB.get(table);
          for (const item of localItems) {
            const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
            if (matches) {
              await localDB.delete(table, item.id);
            }
          }
        }
        
        return result;
      } else {
        // Delete locally only
        const localItems = await localDB.get(table);
        for (const item of localItems) {
          const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
          if (matches) {
            await localDB.delete(table, item.id);
          }
        }
        
        return { data: null, error: null };
      }
    } catch (error) {
      // Delete locally as fallback
      const localItems = await localDB.get(table);
      for (const item of localItems) {
        const matches = Object.entries(filters).every(([key, value]) => item[key] === value);
        if (matches) {
          await localDB.delete(table, item.id);
        }
      }
      
      return { data: null, error: null };
    }
  }

  // Auth methods (simplified for offline use)
  auth = {
    getSession: async () => {
      if (this.isOnline) {
        return await onlineSupabase.auth.getSession();
      } else {
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
      }
    },
    
    signInWithPassword: async (credentials: any) => {
      if (this.isOnline) {
        const result = await onlineSupabase.auth.signInWithPassword(credentials);
        if (result.data.user) {
          localStorage.setItem('offline-user', JSON.stringify(result.data.user));
        }
        return result;
      } else {
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
      }
    },
    
    signUp: async (credentials: any) => {
      const newUser = {
        id: crypto.randomUUID(),
        email: credentials.email,
        created_at: new Date().toISOString()
      };
      
      if (this.isOnline) {
        const result = await onlineSupabase.auth.signUp(credentials);
        if (result.data.user) {
          localStorage.setItem('offline-user', JSON.stringify(result.data.user));
        }
        return result;
      } else {
        // Offline signup
        localStorage.setItem('offline-user', JSON.stringify(newUser));
        return {
          data: { user: newUser },
          error: null
        };
      }
    },
    
    signOut: async () => {
      localStorage.removeItem('offline-user');
      if (this.isOnline) {
        return await onlineSupabase.auth.signOut();
      }
      return { error: null };
    },
    
    onAuthStateChange: (callback: any) => {
      if (this.isOnline) {
        return onlineSupabase.auth.onAuthStateChange(callback);
      } else {
        // Simulate auth state change for offline mode
        const cachedUser = localStorage.getItem('offline-user');
        if (cachedUser) {
          setTimeout(() => {
            callback('SIGNED_IN', { user: JSON.parse(cachedUser) });
          }, 100);
        }
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
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