import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ErrorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    // Filtering
    const where: Prisma.ErrorLogWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.source) where.source = query.source;
    if (query.environment) where.environment = query.environment;
    if (query.resolved !== undefined) where.resolved = query.resolved === 'true';
    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { source: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    // Pagination
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    // Sort
    const orderBy: Prisma.ErrorLogOrderByWithRelationInput = { lastSeen: 'desc' };

    // Find grouped error rows (by message+type+source+env, like a fingerprint)
    const grouped = await this.prisma.errorLog.groupBy({
      by: ['message', 'type', 'source', 'environment', 'resolved'],
      where,
      _count: { _all: true },
      _min: { firstSeen: true },
      _max: { lastSeen: true },
      orderBy: [{ _max: { lastSeen: 'desc' } }],
      skip,
      take: limit,
    });
    const total = await this.prisma.errorLog.count({ where });
    return {
      data: grouped.map(e => ({
        id: Buffer.from(`${e.message}|${e.type}|${e.source}|${e.environment}`,'utf-8').toString('base64'),
        message: e.message,
        type: e.type,
        source: e.source,
        environment: e.environment,
        resolved: e.resolved,
        occurrences: e._count._all,
        firstSeen: e._min.firstSeen,
        lastSeen: e._max.lastSeen,
      })),
      pagination: { page, limit, total }
    };
  }

  async findById(id: string) {
    // Decode ID and fetch all grouped errors for that fingerprint
    const [message, type, source, environment] = Buffer.from(id, 'base64').toString('utf-8').split('|');
    const logs = await this.prisma.errorLog.findMany({
      where: { message, type, source, environment },
      orderBy: { lastSeen: 'desc' },
    });
    if (!logs.length) return null;
    // Most recent as model
    return {
      ...logs[0],
      occurrences: logs.length,
      firstSeen: logs.reduce((a, l) => l.firstSeen < a ? l.firstSeen : a, logs[0].firstSeen),
      lastSeen: logs[0].lastSeen,
      all: logs,
    };
  }

  async getStats() {
    // Aggs for dashboard
    const [total, unresolved, today, critical, error, warning, info] = await Promise.all([
      this.prisma.errorLog.count(),
      this.prisma.errorLog.count({ where: { resolved: false } }),
      this.prisma.errorLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24*3600*1000) } } }),
      this.prisma.errorLog.count({ where: { type: 'critical' } }),
      this.prisma.errorLog.count({ where: { type: 'error' } }),
      this.prisma.errorLog.count({ where: { type: 'warning' } }),
      this.prisma.errorLog.count({ where: { type: 'info' } }),
    ]);
    const avgOccurrences = await this.prisma.errorLog.groupBy({ by: ['message','type','source','environment'], _count: { _all: true } });
    const avg = avgOccurrences.length > 0 ? Math.round(avgOccurrences.reduce((a, b) => a + b._count._all, 0) / avgOccurrences.length) : 0;
    const topSources = (await this.prisma.errorLog.groupBy({ by: ['source'], _count: { source: true }, orderBy: { _count: { source: 'desc' } }, take: 5 })).map(e => ({ source: e.source, count: e._count.source }));
    const topTypes = (await this.prisma.errorLog.groupBy({ by: ['type'], _count: { type: true }, orderBy: { _count: { type: 'desc' } }, take: 5 })).map(e => ({ type: e.type, count: e._count.type }));
    return { total, unresolved, critical, error, warning, info, today, avgOccurrences: avg, topSources, topTypes };
  }

  async getTrends({ range = '7d' } = {}) {
    // Trend over 24h/7d/30d
    const days = range === '30d' ? 30 : range === '24h' ? 1 : 7;
    const start = new Date(Date.now() - days * 24*3600*1000);
    const all = await this.prisma.errorLog.findMany({ where: { createdAt: { gte: start } }, orderBy: { createdAt: 'asc' }});
    const dateKey = days === 1 ? (d: Date) => d.getHours().toString().padStart(2, '0')+':00' : (d: Date) => d.toISOString().split('T')[0];
    const trend: Record<string, { count: number, resolved: number, critical: number, error: number, warning: number }> = {};
    for (const e of all) {
      const k = dateKey(e.createdAt);
      if (!trend[k]) trend[k] = { count: 0, resolved: 0, critical: 0, error: 0, warning: 0 };
      trend[k].count++;
      if (e.resolved) trend[k].resolved++;
      if (e.type === 'critical') trend[k].critical++;
      if (e.type === 'error') trend[k].error++;
      if (e.type === 'warning') trend[k].warning++;
    }
    return Object.entries(trend).map(([date, data]) => ({ date, ...data }));
  }

  async resolve(id: string, resolvedBy: string) {
    const [message, type, source, environment] = Buffer.from(id, 'base64').toString('utf-8').split('|');
    return this.prisma.errorLog.updateMany({ where: { message, type, source, environment, resolved: false }, data: { resolved: true, resolvedAt: new Date(), resolvedBy } });
  }
  async unresolve(id: string) {
    const [message, type, source, environment] = Buffer.from(id, 'base64').toString('utf-8').split('|');
    return this.prisma.errorLog.updateMany({ where: { message, type, source, environment, resolved: true }, data: { resolved: false, resolvedAt: null, resolvedBy: null } });
  }
  async delete(id: string) {
    const [message, type, source, environment] = Buffer.from(id, 'base64').toString('utf-8').split('|');
    return this.prisma.errorLog.deleteMany({ where: { message, type, source, environment } });
  }
  async bulkDelete(ids: string[]) {
    let deleted = 0, failed = 0, errors: string[] = [];
    for (const id of ids) {
      try { await this.delete(id); deleted++; } catch (e) { failed++; errors.push(id); }
    }
    return { deleted, failed, errors };
  }
  async export(filters: any, format: 'csv'|'json' = 'csv') {
    const all = await this.findAll(filters);
    if (format === 'json') return JSON.stringify(all.data, null, 2);
    if (format === 'csv') {
      const rows = [Object.keys(all.data[0] || {}).join(',')].concat(all.data.map(e => Object.values(e).map(v => typeof v==='string'?`"${v.replace(/"/g,'""')}"`:v).join(',')));
      return rows.join('\n');
    }
    return '';
  }
  async getSources() {
    const rows = await this.prisma.errorLog.findMany({ select: { source: true }, distinct: ['source'], orderBy: { source: 'asc' }});
    return rows.map(e => e.source);
  }
  async getTypes() {
    const rows = await this.prisma.errorLog.findMany({ select: { type: true }, distinct: ['type'], orderBy: { type: 'asc' }});
    return rows.map(e => e.type);
  }
  async getEnvironments() {
    const rows = await this.prisma.errorLog.findMany({ select: { environment: true }, distinct: ['environment'], orderBy: { environment: 'asc' }});
    return rows.map(e => e.environment);
  }
  async logError(fields: Partial<Prisma.ErrorLogCreateInput>) {
    // Ensure all required fields are provided or set defaults
    if (!fields.message || !fields.type || !fields.source || !fields.environment) {
      throw new Error('Missing required fields for error logging');
    }
    return this.prisma.errorLog.create({ data: fields as Prisma.ErrorLogCreateInput });
  }
}
