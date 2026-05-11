import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TraceabilityStat {
  label: string;
  value: string;
  detail: string;
}

export interface TraceabilityTimelineEntry {
  icon: string;
  title: string;
  time: string;
  description: string;
  meta?: string[];
  chips?: string[];
  tone: 'default' | 'error' | 'success';
  category: string;
}

export interface TraceabilityActiveUser {
  name: string;
  role: string;
  status: string;
}

export interface TraceabilityForensicReport {
  title: string;
  description: string;
  actionLabel: string;
}

export interface TraceabilityResponse {
  stats: TraceabilityStat[];
  timeline: TraceabilityTimelineEntry[];
  activeUsers: TraceabilityActiveUser[];
  synced: boolean;
  generatedAt: string;
  forensicReport: TraceabilityForensicReport;
}

@Injectable({
  providedIn: 'root'
})
export class AdminTraceabilityService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users/activity/summary`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<TraceabilityResponse> {
    return this.http.get<TraceabilityResponse>(this.baseUrl);
  }
}
