/**
 * In-memory fallback emulator matching MongoDB Collection and Cursor interface.
 * Ensures the KasirWarung POS application has 100% zero downtime even
 * if the external MongoDB Atlas network connection is unavailable.
 */

export class MemoryCursor<T extends Record<string, any>> {
  private items: T[];
  private sortSpec: Record<string, 1 | -1> | null = null;
  private limitCount: number | null = null;
  private skipCount: number = 0;
  private projectionSpec: Record<string, number> | null = null;

  constructor(items: T[]) {
    this.items = [...items];
  }

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  skip(n: number): this {
    this.skipCount = n;
    return this;
  }

  project(projection: Record<string, number>): this {
    this.projectionSpec = projection;
    return this;
  }

  async toArray(): Promise<T[]> {
    let result = [...this.items];

    // 1. Sort
    if (this.sortSpec && Object.keys(this.sortSpec).length > 0) {
      const spec = this.sortSpec;
      result.sort((a: any, b: any) => {
        for (const [key, direction] of Object.entries(spec)) {
          const valA = a[key];
          const valB = b[key];

          if (valA === valB) continue;
          if (valA === undefined || valA === null) return direction === 1 ? -1 : 1;
          if (valB === undefined || valB === null) return direction === 1 ? 1 : -1;

          if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            const numA = valA ? 1 : 0;
            const numB = valB ? 1 : 0;
            if (numA !== numB) {
              return direction === 1 ? numA - numB : numB - numA;
            }
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB);
            if (cmp !== 0) {
              return direction === 1 ? cmp : -cmp;
            }
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            if (valA !== valB) {
              return direction === 1 ? valA - valB : valB - valA;
            }
          } else {
            if (valA < valB) return direction === 1 ? -1 : 1;
            if (valA > valB) return direction === 1 ? 1 : -1;
          }
        }
        return 0;
      });
    }

    // 2. Skip
    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }

    // 3. Limit
    if (this.limitCount !== null && this.limitCount >= 0) {
      result = result.slice(0, this.limitCount);
    }

    // 4. Projection
    if (this.projectionSpec && Object.keys(this.projectionSpec).length > 0) {
      const proj = this.projectionSpec;
      const isExclusion = Object.values(proj).some((v) => v === 0);

      result = result.map((item) => {
        const copy: any = { ...item };
        if (isExclusion) {
          for (const key of Object.keys(proj)) {
            if (proj[key] === 0) {
              delete copy[key];
            }
          }
          return copy;
        } else {
          const included: any = {};
          if (copy._id !== undefined) included._id = copy._id;
          if (copy.id !== undefined) included.id = copy.id;
          for (const key of Object.keys(proj)) {
            if (proj[key] === 1 && copy[key] !== undefined) {
              included[key] = copy[key];
            }
          }
          return included;
        }
      });
    }

    return result;
  }
}

export class MemoryCollection<T extends Record<string, any>> {
  private items: T[] = [];
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  find(filter: any = {}): MemoryCursor<T> {
    const matched = this.filterItems(filter);
    return new MemoryCursor(matched);
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

  async deleteMany(filter: any = {}): Promise<{ deletedCount: number }> {
    const initialCount = this.items.length;
    this.items = this.items.filter((item) => !this.matches(item, filter));
    return { deletedCount: initialCount - this.items.length };
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
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const [key, val] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(val)) {
        const matchesAny = val.some((subFilter) => this.matches(item, subFilter));
        if (!matchesAny) return false;
        continue;
      }

      if (key === '$and' && Array.isArray(val)) {
        const matchesAll = val.every((subFilter) => this.matches(item, subFilter));
        if (!matchesAll) return false;
        continue;
      }

      if (key === '$expr' && typeof val === 'object' && val !== null) {
        if ('$lte' in val && Array.isArray(val.$lte) && val.$lte.length === 2) {
          const fieldA = typeof val.$lte[0] === 'string' && val.$lte[0].startsWith('$') ? val.$lte[0].slice(1) : val.$lte[0];
          const fieldB = typeof val.$lte[1] === 'string' && val.$lte[1].startsWith('$') ? val.$lte[1].slice(1) : val.$lte[1];
          const valA = item[fieldA];
          const valB = item[fieldB];
          if (!(valA <= valB)) return false;
        }
        continue;
      }

      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val)) {
          const v = val as any;
          // Regex matching: { $regex: '...', $options: 'i' }
          if ('$regex' in v) {
            const pattern = new RegExp(String(v.$regex), typeof v.$options === 'string' ? v.$options : '');
            const itemVal = item[key] !== undefined && item[key] !== null ? String(item[key]) : '';
            if (!pattern.test(itemVal)) return false;
            continue;
          }

          // Not equal: { $ne: ... }
          if ('$ne' in v) {
            if (item[key] === v.$ne) return false;
            continue;
          }

          // In array: { $in: [...] }
          if ('$in' in v && Array.isArray(v.$in)) {
            if (!v.$in.includes(item[key])) return false;
            continue;
          }

          // Comparison operators: { $gte, $lte, $gt, $lt }
          if ('$gte' in v && !(item[key] >= v.$gte)) return false;
          if ('$lte' in v && !(item[key] <= v.$lte)) return false;
          if ('$gt' in v && !(item[key] > v.$gt)) return false;
          if ('$lt' in v && !(item[key] < v.$lt)) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
    }

    return true;
  }
}
