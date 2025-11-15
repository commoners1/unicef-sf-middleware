// libs/core/utils/database.optimizations.ts
import { PrismaService } from '@infra/prisma.service';

export class DatabaseOptimizations {
  constructor(private readonly prisma: PrismaService) {}

  async createOptimizedIndexes() {
    const indexes = [
      // Job audit indexes for high volume
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status ON job_audit(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_created_at ON job_audit(created_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_user_id ON job_audit(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_updated_at ON job_audit(updated_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status_created ON job_audit(status, created_at)',

      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_user_status ON job_audit(user_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status_updated ON job_audit(status, updated_at)',
    ];

    for (const index of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(index);
        console.log(`✅ Created index: ${index.split(' ')[4]}`);
      } catch (error) {
        console.warn(`⚠️ Index creation failed: ${error.message}`);
      }
    }
  }

  async createPartitionedTables() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    const partitionName = `job_audit_${year}_${month}`;
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, currentDate.getMonth() + 1, 1)
      .toISOString()
      .split('T')[0];

    try {
      // Create partition for current month
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF job_audit 
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);

      console.log(`✅ Created partition: ${partitionName}`);
    } catch (error) {
      console.warn(`⚠️ Partition creation failed: ${error.message}`);
    }
  }

  async optimizeDatabaseSettings() {
    const optimizations = [
      // Increase connection pool
      'ALTER SYSTEM SET max_connections = 200',
      "ALTER SYSTEM SET shared_buffers = '256MB'",
      "ALTER SYSTEM SET effective_cache_size = '1GB'",
      "ALTER SYSTEM SET maintenance_work_mem = '64MB'",
      'ALTER SYSTEM SET checkpoint_completion_target = 0.9',
      "ALTER SYSTEM SET wal_buffers = '16MB'",
      'ALTER SYSTEM SET default_statistics_target = 100',
    ];

    for (const optimization of optimizations) {
      try {
        await this.prisma.$executeRawUnsafe(optimization);
        console.log(`✅ Applied optimization: ${optimization.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠️ Optimization failed: ${error.message}`);
      }
    }
  }

  async analyzeTablePerformance() {
    const analysis = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats 
      WHERE tablename = 'job_audit'
      ORDER BY n_distinct DESC;
    `;

    return analysis;
  }

  async getTableStats() {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE tablename = 'job_audit';
    `;

    return stats;
  }

  async vacuumAndAnalyze() {
    try {
      await this.prisma.$executeRaw`VACUUM ANALYZE job_audit`;
      console.log('✅ Database vacuum and analyze completed');
    } catch (error) {
      console.warn(`⚠️ Vacuum failed: ${error.message}`);
    }
  }
}
