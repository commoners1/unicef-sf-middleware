-- create-indexes.sql
-- High-performance indexes for 450k jobs/day

-- Job audit indexes for high volume
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status ON job_audit(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_created_at ON job_audit(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_user_id ON job_audit(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_updated_at ON job_audit(updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status_created ON job_audit(status, created_at);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_user_status ON job_audit(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_status_updated ON job_audit(status, updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_user_created ON job_audit(user_id, created_at);

-- Performance indexes for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_processing_time ON job_audit(processing_time) WHERE processing_time IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_attempts ON job_audit(attempts) WHERE attempts > 1;

-- Partial indexes for failed jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_failed ON job_audit(created_at, error_message) WHERE status = 'failed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_processing ON job_audit(created_at) WHERE status = 'processing';

-- Indexes for cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_audit_cleanup ON job_audit(created_at) WHERE status IN ('completed', 'failed');
