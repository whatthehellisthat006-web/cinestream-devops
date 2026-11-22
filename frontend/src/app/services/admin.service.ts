import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats, MediaDetails, MediaSummary } from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = '/api/admin';

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  /** Returns ALL media (no pagination) for admin list */
  getAllMedia(): Observable<MediaSummary[]> {
    return this.http.get<MediaSummary[]>(`${this.apiUrl}/media`);
  }

  createMedia(mediaData: any): Observable<MediaDetails> {
    return this.http.post<MediaDetails>(`${this.apiUrl}/media`, mediaData);
  }

  updateMedia(id: number, mediaData: any): Observable<MediaDetails> {
    return this.http.put<MediaDetails>(`${this.apiUrl}/media/${id}`, mediaData);
  }

  deleteMedia(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/media/${id}`);
  }

  addSeason(mediaId: number, seasonData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/media/${mediaId}/seasons`, seasonData);
  }

  deleteSeason(seasonId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/seasons/${seasonId}`);
  }

  addEpisode(seasonId: number, episodeData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/seasons/${seasonId}/episodes`, episodeData);
  }

  deleteEpisode(episodeId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/episodes/${episodeId}`);
  }

  createGenre(name: string, description?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/genres`, { name, description });
  }

  updateGenre(id: number, name: string, description?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/genres/${id}`, { name, description });
  }

  getGenreImpact(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/genres/${id}/impact`);
  }

  deleteGenre(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/genres/${id}`);
  }

  createActor(actorData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/actors`, actorData);
  }

  getActorImpact(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actors/${id}/impact`);
  }

  deleteActor(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/actors/${id}`);
  }

  createDirector(directorData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/directors`, directorData);
  }

  getDirectorImpact(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/directors/${id}/impact`);
  }

  deleteDirector(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/directors/${id}`);
  }
}
