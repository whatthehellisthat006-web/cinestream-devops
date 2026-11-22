import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

// Endpoints where a 401 should silently fail (background loads)
// rather than triggering a full logout redirect
const SILENT_401_PATTERNS = [
  '/api/wallet',
  '/api/favorites/check',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('cinestream_token');
  const authService = inject(AuthService);
  const router = inject(Router);

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        const isSilent = SILENT_401_PATTERNS.some(p => req.url.includes(p));
        if (!isSilent) {
          // User-triggered protected action (rent, review, toggle fav, etc.)
          // → clear session and redirect with toast
          authService.clearSession();
          router.navigate(['/'], { queryParams: { sessionExpired: '1' } });
        }
        // For silent endpoints: just let the error propagate
        // The calling component handles it gracefully (shows 0 balance, etc.)
      }
      return throwError(() => error);
    })
  );
};
