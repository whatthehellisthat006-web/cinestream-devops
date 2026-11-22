import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { Wallet } from '../../models/media.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthModalComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  authService = inject(AuthService);
  private walletService = inject(WalletService);
  private route = inject(ActivatedRoute);

  showAuthModal = signal(false);
  authModalRegisterMode = signal(false);
  showUserDropdown = signal(false);
  sessionExpiredToast = signal(false);

  wallet = this.walletService.walletSignal;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['login'] === 'true' && !this.authService.isLoggedIn()) {
        this.openLogin();
      }
      if (params['sessionExpired'] === '1') {
        this.sessionExpiredToast.set(true);
        // Auto-open login modal after a short delay
        setTimeout(() => this.openLogin(), 800);
        // Hide toast after 6 seconds
        setTimeout(() => this.sessionExpiredToast.set(false), 6000);
      }
    });

    if (this.authService.isLoggedIn()) {
      this.loadBalance();
    }
  }

  loadBalance(): void {
    this.walletService.getWallet().subscribe({
      error: () => {}
    });
  }

  openLogin(): void {
    this.authModalRegisterMode.set(false);
    this.showAuthModal.set(true);
  }

  openRegister(): void {
    this.authModalRegisterMode.set(true);
    this.showAuthModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
    if (this.authService.isLoggedIn()) {
      this.loadBalance();
    }
  }

  toggleDropdown(): void {
    this.showUserDropdown.update(v => !v);
  }

  logout(): void {
    this.showUserDropdown.set(false);
    this.authService.logout();
  }
}
