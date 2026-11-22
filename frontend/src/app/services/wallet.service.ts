import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Wallet, WalletTransaction } from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpClient);
  private apiUrl = '/api/wallet';

  // Shared reactive signal for current wallet state across navbar, profile & rent modal
  walletSignal = signal<Wallet | null>(null);

  getWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(this.apiUrl).pipe(
      tap(w => this.walletSignal.set(w))
    );
  }

  topUp(amount: number): Observable<Wallet> {
    return this.http.post<Wallet>(`${this.apiUrl}/topup`, { amount }).pipe(
      tap(w => this.walletSignal.set(w))
    );
  }

  getTransactions(): Observable<WalletTransaction[]> {
    return this.http.get<WalletTransaction[]>(`${this.apiUrl}/transactions`);
  }
}
