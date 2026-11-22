import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { Actor, Director } from '../../models/media.model';

@Component({
  selector: 'app-people-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './people-list.component.html',
  styleUrls: ['./people-list.component.css']
})
export class PeopleListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private mediaService = inject(MediaService);

  type: 'actors' | 'directors' = 'actors';
  searchQuery = '';
  loading = signal(true);

  actors = signal<Actor[]>([]);
  directors = signal<Director[]>([]);

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.type = data['type'] === 'directors' ? 'directors' : 'actors';
      this.loadData();
    });
  }

  loadData(): void {
    this.loading.set(true);
    if (this.type === 'actors') {
      this.mediaService.getActors().subscribe({
        next: (res) => {
          this.actors.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      this.mediaService.getDirectors().subscribe({
        next: (res) => {
          this.directors.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  get filteredPeople(): Array<Actor | Director> {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.type === 'actors' ? this.actors() : this.directors();
    if (!q) return list;
    return list.filter(p => p.name.toLowerCase().includes(q));
  }
}
