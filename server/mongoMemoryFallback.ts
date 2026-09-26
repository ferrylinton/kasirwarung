/**
 * In-memory fallback emulator matching MongoDB Collection interface.
 * Ensures the KasirWarung POS application has 100% zero downtime even
 * if the external MongoDB Atlas network connection experiences transient network issues.
 */

export class MemoryCollection<T extends Record<string, any>> {
  private items: T[] = [];
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  async find(filter: any = {}): Promise<{
    toArray: () => Promise<T[]>;
    limit: (n: number) => { toArray: () => Promise<T[]> };
    project: (projection: any) => { toArray: () => Promise<any[]> };
  }> {
    const matched = this.filterItems(filter);
    return {
      toArray: async () => [...matched],
      limit: (n: number) => ({
        toArray: async () => matched.slice(0, n),
      }),
      project: (proj: any) => ({
        toArray: async () => {
          return matched.map((item) => {
            const copy: any = { ...item };
            for (const key of Object.keys(proj)) {
              if (proj[key] === 0) {
                delete copy[key];
              }
            }
            return copy;
          });
        },
      }),
    };
  }

  async findOne(filter: any): Promise<T | null> {
    const matched = this.filterItems(filter);
    return matched.length > 0 ? { ...matched[0] } : null;
  }

  async insertOne(doc: T): Promise<{ insertedId: string; acknowledged: boolean }> {
    const clone: any = { ...doc };
    if (!clone._id && !clone.id) {
      clone.id = `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    this.items.push(clone);
    return { insertedId: clone.id || (clone as any)._id, acknowledged: true };
  }

  async insertMany(docs: T[]): Promise<{ insertedCount: number; acknowledged: boolean }> {
    for (const doc of docs) {
      await this.insertOne(doc);
    }
    return { insertedCount: docs.length, acknowledged: true };
  }

  async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const item = await this.findOne(filter);
    if (!item) return { modifiedCount: 0 };

    const index = this.items.findIndex((i) => this.matches(i, filter));
    if (index !== -1) {
      if (update.$set) {
        this.items[index] = { ...this.items[index], ...update.$set };
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          (this.items[index] as any)[k] = ((this.items[index] as any)[k] || 0) + (v as number);
        }
      }
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async findOneAndUpdate(filter: any, update: any, _options?: any): Promise<T | null> {
    await this.updateOne(filter, update);
    return this.findOne(filter);
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const index = this.items.findIndex((i) => this.matches(i, filter));
    if (index !== -1) {
      this.items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.filterItems(filter).length;
  }

  async createIndex(_spec: any, _options?: any): Promise<string> {
    return 'index_created';
  }

  private filterItems(filter: any): T[] {
    if (!filter || Object.keys(filter).length === 0) {
      return [...this.items];
    }
    return this.items.filter((item) => this.matches(item, filter));
  }

  private matches(item: any, filter: any): boolean {
    for (const [key, val] of Object.entries(filter)) {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          // Range or operator queries like { $ne: ... }
          if ('$ne' in val && item[key] === val.$ne) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
    }
    return true;
  }
}
