import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { MediaService } from '../../services/media.service';
import { DashboardStats, Genre, Actor, Director, MediaSummary } from '../../models/media.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private mediaService = inject(MediaService);

  stats = signal<DashboardStats | null>(null);
  activeTab = signal<'stats' | 'media' | 'genres' | 'people'>('stats');

  mediaList = signal<MediaSummary[]>([]);
  genres = signal<Genre[]>([]);
  actors = signal<Actor[]>([]);
  directors = signal<Director[]>([]);

  // Search filters
  mediaSearchQuery = '';
  mediaTypeFilter: 'ALL' | 'FILM' | 'SERIE' = 'ALL';

  // Modals & forms
  showMediaModal = signal(false);
  editingMediaId = signal<number | null>(null);

  // Genre Edit Modal
  showGenreModal = signal(false);
  editingGenreId = signal<number | null>(null);
  genreForm = {
    name: '',
    description: ''
  };

  // Delete Impact Confirmation Modal
  showDeleteModal = signal(false);
  deleteTarget = signal<{
    type: 'genre' | 'actor' | 'director';
    id: number;
    name: string;
    impactList: any[];
    loading: boolean;
  } | null>(null);

  // Form Model
  mediaForm = {
    title: '',
    description: '',
    releaseYear: 2024,
    type: 'FILM',
    duration: 120,
    language: 'Français',
    country: 'France',
    minimumAge: 0,
    posterUrl: '/assets/posters/1.jpg',
    trailerUrl: '',
    videoKey: '',
    rentalPricePerDay: 3.99,
    genreIds: [] as number[],
    directorIds: [] as number[]
  };

  // Quick adds
  newGenreName = '';
  newActorName = '';
  newDirectorName = '';

  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.loadStats();
    this.loadCatalogueData();
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {}
    });
  }

  loadCatalogueData(): void {
    // Use admin endpoint that returns ALL media without pagination
    this.adminService.getAllMedia().subscribe({
      next: (list) => this.mediaList.set(list),
      error: () => {}
    });
    this.mediaService.getGenres().subscribe({
      next: (g) => this.genres.set(g)
    });
    this.mediaService.getActors().subscribe({
      next: (a) => this.actors.set(a)
    });
    this.mediaService.getDirectors().subscribe({
      next: (d) => this.directors.set(d)
    });
  }

  openCreateMediaModal(): void {
    this.editingMediaId.set(null);
    this.mediaForm = {
      title: '',
      description: '',
      releaseYear: 2024,
      type: 'FILM',
      duration: 120,
      language: 'Français',
      country: 'France',
      minimumAge: 0,
      posterUrl: '/assets/posters/1.jpg',
      trailerUrl: '',
      videoKey: 'demo_video.mp4',
      rentalPricePerDay: 3.99,
      genreIds: [],
      directorIds: []
    };
    this.showMediaModal.set(true);
  }

  openEditMediaModal(media: MediaSummary): void {
    this.editingMediaId.set(media.id);
    this.mediaService.getMediaDetails(media.id).subscribe({
      next: (details) => {
        this.mediaForm = {
          title: details.title,
          description: details.description,
          releaseYear: details.releaseYear,
          type: details.type,
          duration: details.duration || 120,
          language: details.language,
          country: details.country,
          minimumAge: details.minimumAge,
          posterUrl: details.posterUrl || '',
          trailerUrl: details.trailerUrl || '',
          videoKey: details.videoKey || '',
          rentalPricePerDay: details.rentalPricePerDay,
          genreIds: details.genres.map(g => g.id),
          directorIds: details.directors.map(d => d.id)
        };
        this.showMediaModal.set(true);
      }
    });
  }

  onSaveMedia(): void {
    if (!this.mediaForm.title || !this.mediaForm.rentalPricePerDay || this.mediaForm.rentalPricePerDay <= 0) {
      this.message.set({ type: 'error', text: 'Veuillez saisir un titre et un tarif journalier valide (> 0 €).' });
      return;
    }

    const id = this.editingMediaId();
    if (id) {
      this.adminService.updateMedia(id, this.mediaForm).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Média modifié avec succès.' });
          this.showMediaModal.set(false);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err?.error?.message || 'Erreur lors de la modification.' });
        }
      });
    } else {
      this.adminService.createMedia(this.mediaForm).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Média ajouté avec succès au catalogue.' });
          this.showMediaModal.set(false);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err?.error?.message || 'Erreur lors de l\'ajout.' });
        }
      });
    }
  }

  onDeleteMedia(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce média ?')) {
      this.adminService.deleteMedia(id).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Média supprimé du catalogue.' });
          this.loadCatalogueData();
          this.loadStats();
        },
        error: () => {
          this.message.set({ type: 'error', text: 'Impossible de supprimer ce média.' });
        }
      });
    }
  }

  get filteredMediaList(): MediaSummary[] {
    const q = this.mediaSearchQuery.trim().toLowerCase();
    const type = this.mediaTypeFilter;
    return this.mediaList().filter(m => {
      const matchQuery = !q || m.title.toLowerCase().includes(q);
      const matchType = type === 'ALL' || m.type === type;
      return matchQuery && matchType;
    });
  }

  openCreateGenreModal(): void {
    this.editingGenreId.set(null);
    this.genreForm = { name: '', description: '' };
    this.showGenreModal.set(true);
  }

  openEditGenreModal(genre: Genre): void {
    this.editingGenreId.set(genre.id);
    this.genreForm = {
      name: genre.name,
      description: genre.description || ''
    };
    this.showGenreModal.set(true);
  }

  onSaveGenre(): void {
    if (!this.genreForm.name.trim()) {
      this.message.set({ type: 'error', text: 'Le nom du genre est requis.' });
      return;
    }
    const id = this.editingGenreId();
    if (id) {
      this.adminService.updateGenre(id, this.genreForm.name.trim(), this.genreForm.description.trim()).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Genre modifié avec succès.' });
          this.showGenreModal.set(false);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err?.error?.message || 'Erreur lors de la modification du genre.' });
        }
      });
    } else {
      this.adminService.createGenre(this.genreForm.name.trim(), this.genreForm.description.trim()).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Genre créé avec succès.' });
          this.showGenreModal.set(false);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err?.error?.message || 'Erreur lors de la création du genre.' });
        }
      });
    }
  }

  requestDeleteGenre(genre: Genre): void {
    this.deleteTarget.set({
      type: 'genre',
      id: genre.id,
      name: genre.name,
      impactList: [],
      loading: true
    });
    this.showDeleteModal.set(true);

    this.adminService.getGenreImpact(genre.id).subscribe({
      next: (impact) => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, impactList: impact, loading: false });
        }
      },
      error: () => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, loading: false });
        }
      }
    });
  }

  requestDeleteActor(actor: Actor): void {
    this.deleteTarget.set({
      type: 'actor',
      id: actor.id,
      name: actor.name,
      impactList: [],
      loading: true
    });
    this.showDeleteModal.set(true);

    this.adminService.getActorImpact(actor.id).subscribe({
      next: (impact) => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, impactList: impact, loading: false });
        }
      },
      error: () => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, loading: false });
        }
      }
    });
  }

  requestDeleteDirector(director: Director): void {
    this.deleteTarget.set({
      type: 'director',
      id: director.id,
      name: director.name,
      impactList: [],
      loading: true
    });
    this.showDeleteModal.set(true);

    this.adminService.getDirectorImpact(director.id).subscribe({
      next: (impact) => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, impactList: impact, loading: false });
        }
      },
      error: () => {
        const current = this.deleteTarget();
        if (current) {
          this.deleteTarget.set({ ...current, loading: false });
        }
      }
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    if (target.type === 'genre') {
      this.adminService.deleteGenre(target.id).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: `Genre "${target.name}" supprimé.` });
          this.showDeleteModal.set(false);
          this.deleteTarget.set(null);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: () => {
          this.message.set({ type: 'error', text: 'Impossible de supprimer ce genre.' });
        }
      });
    } else if (target.type === 'actor') {
      this.adminService.deleteActor(target.id).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: `Acteur "${target.name}" supprimé.` });
          this.showDeleteModal.set(false);
          this.deleteTarget.set(null);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: () => {
          this.message.set({ type: 'error', text: 'Impossible de supprimer cet acteur.' });
        }
      });
    } else if (target.type === 'director') {
      this.adminService.deleteDirector(target.id).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: `Réalisateur "${target.name}" supprimé.` });
          this.showDeleteModal.set(false);
          this.deleteTarget.set(null);
          this.loadCatalogueData();
          this.loadStats();
        },
        error: () => {
          this.message.set({ type: 'error', text: 'Impossible de supprimer ce réalisateur.' });
        }
      });
    }
  }

  onAddActor(): void {
    if (!this.newActorName.trim()) return;
    this.adminService.createActor({ name: this.newActorName.trim(), photoUrl: '/assets/people/actor_1.jpg' }).subscribe({
      next: () => {
        this.newActorName = '';
        this.loadCatalogueData();
        this.loadStats();
      }
    });
  }

  onAddDirector(): void {
    if (!this.newDirectorName.trim()) return;
    this.adminService.createDirector({ name: this.newDirectorName.trim(), photoUrl: '/assets/people/director_1.jpg' }).subscribe({
      next: () => {
        this.newDirectorName = '';
        this.loadCatalogueData();
        this.loadStats();
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  toggleGenreSelection(genreId: number): void {
    const idx = this.mediaForm.genreIds.indexOf(genreId);
    if (idx > -1) {
      this.mediaForm.genreIds.splice(idx, 1);
    } else {
      this.mediaForm.genreIds.push(genreId);
    }
  }

  toggleDirectorSelection(directorId: number): void {
    const idx = this.mediaForm.directorIds.indexOf(directorId);
    if (idx > -1) {
      this.mediaForm.directorIds.splice(idx, 1);
    } else {
      this.mediaForm.directorIds.push(directorId);
    }
  }
}
