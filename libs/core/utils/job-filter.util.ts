import type { DynamicFilters } from './dynamic-filter.util';

export interface JobFilters extends DynamicFilters {
  queue?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface JobData {
  id: string;
  name: string;
  queue: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  timestamp: number;
  createdAt: string;
  failedReason?: string;
  [key: string]: any;
}

export class JobFilterBuilder {
  static filterJobs(jobs: JobData[], filters: JobFilters): JobData[] {
    return jobs.filter(job => {
      if (filters.queue?.trim() && job.queue !== filters.queue) return false;
      if (filters.status?.trim() && job.status !== filters.status) return false;
      
      if (filters.search?.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        const searchable = [
          job.name || '',
          job.queue || '',
          job.status || '',
          job.failedReason || ''
        ].join(' ').toLowerCase();
        if (!searchable.includes(searchLower)) return false;
      }
      
      if (filters.startDate || filters.endDate) {
        const jobDate = new Date(job.createdAt).getTime();
        if (filters.startDate && jobDate < new Date(filters.startDate).getTime()) return false;
        if (filters.endDate && jobDate > new Date(filters.endDate).getTime()) return false;
      }
      
      return true;
    });
  }

  static sortJobs(
    jobs: JobData[], 
    sortBy: 'timestamp' | 'name' | 'queue' | 'status' = 'timestamp', 
    order: 'asc' | 'desc' = 'desc'
  ): JobData[] {
    const sorted = [...jobs];
    const multiplier = order === 'asc' ? 1 : -1;
    
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = b.timestamp - a.timestamp;
      } else {
        const aVal = (a[sortBy] || '').toString();
        const bVal = (b[sortBy] || '').toString();
        comparison = aVal.localeCompare(bVal);
      }
      return comparison * multiplier;
    });
    return sorted;
  }

  static paginateJobs(
    jobs: JobData[],
    page: number = 1,
    limit: number = 10
  ): { data: JobData[]; total: number; page: number; limit: number } {
    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 100);
    const offset = (pageNum - 1) * limitNum;
    
    return {
      data: jobs.slice(offset, offset + limitNum),
      total: jobs.length,
      page: pageNum,
      limit: limitNum,
    };
  }

  static applyFilters(
    jobs: JobData[],
    filters: JobFilters
  ): { data: JobData[]; total: number; page: number; limit: number } {
    let result = this.filterJobs(jobs, filters);
    // Default to timestamp descending (newest first)
    const sortBy = filters.sortBy === 'createdAt' ? 'timestamp' : (filters.sortBy as 'timestamp' | 'name' | 'queue' | 'status') || 'timestamp';
    result = this.sortJobs(result, sortBy, filters.sortOrder || 'desc');
    return this.paginateJobs(result, filters.page || 1, filters.limit || 10);
  }
}

