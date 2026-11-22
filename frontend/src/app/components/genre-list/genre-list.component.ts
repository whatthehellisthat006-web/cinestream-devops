import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { Genre } from '../../models/media.model';

@Component({
  selector: 'app-genre-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './genre-list.component.html',
  styleUrls: ['./genre-list.component.css']
})
export class GenreListComponent implements OnInit {
  private mediaService = inject(MediaService);

  searchQuery = '';
  loading = signal(true);
  genres = signal<Genre[]>([]);

  ngOnInit(): void {
    this.loadGenres();
  }

  loadGenres(): void {
    this.loading.set(true);
    this.mediaService.getGenres().subscribe({
      next: (res) => {
        this.genres.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  get filteredGenres(): Genre[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.genres();
    return this.genres().filter(g => 
      g.name.toLowerCase().includes(q) || 
      (g.description && g.description.toLowerCase().includes(q))
    );
  }
}
