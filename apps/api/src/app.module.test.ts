import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { CoursesService } from './courses/courses.service';
import { MediaService } from './media/media.service';

describe('API composition', () => {
  it('loads the modular application and its core services', () => {
    expect(AppModule).toBeDefined();
    expect(CoursesService).toBeDefined();
    expect(MediaService).toBeDefined();
  });
});
