import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CoursePackage, validateCoursePackage } from '@edullm/content-schema';
import { query } from '../db/database';

const mapCourse = (row: any) => ({
  id: row.course_id, slug: row.slug, title: row.title, description: row.description,
  board: row.board, grade: row.grade, subject: row.subject, language: row.language,
  status: row.status, reviewStatus: row.review_status, version: row.version,
  content: row.content, validation: row.validation, createdAt: row.created_at,
  updatedAt: row.updated_at, publishedAt: row.published_at
});

@Injectable()
export class CoursesService {
  async list() {
    const result = await query('SELECT * FROM course ORDER BY updated_at DESC');
    return result.rows.map(mapCourse);
  }

  async get(id: string) {
    const result = await query('SELECT * FROM course WHERE course_id=$1', [id]);
    if (!result.rowCount) throw new NotFoundException('Course not found');
    return mapCourse(result.rows[0]);
  }

  async import(input: unknown) {
    const validation = validateCoursePackage(input);
    if (!validation.success) throw new UnprocessableEntityException({ message: 'Course package is invalid', issues: validation.issues });
    const content = validation.data as CoursePackage;
    const id = randomUUID();
    const slugBase = content.course.slug || content.course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${slugBase || 'course'}-${id.slice(0, 8)}`;
    const issues = validateCoursePackage(content).issues;
    const result = await query(`INSERT INTO course(course_id,slug,title,description,board,grade,subject,language,content,validation)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) RETURNING *`, [id,slug,content.course.title,content.course.description || '',content.course.board || null,content.course.grade || null,content.course.subject || null,content.course.language || 'English',JSON.stringify(content),JSON.stringify(issues)]);
    return mapCourse(result.rows[0]);
  }

  async replace(id: string, input: unknown) {
    const validation = validateCoursePackage(input);
    if (!validation.success) throw new UnprocessableEntityException({ message: 'Course package is invalid', issues: validation.issues });
    const content = validation.data as CoursePackage;
    const result = await query(`UPDATE course SET title=$2,description=$3,board=$4,grade=$5,subject=$6,language=$7,content=$8::jsonb,validation=$9::jsonb,updated_at=now(),version=version+1,status=CASE WHEN status='published' THEN 'draft' ELSE status END
      WHERE course_id=$1 RETURNING *`, [id,content.course.title,content.course.description || '',content.course.board || null,content.course.grade || null,content.course.subject || null,content.course.language || 'English',JSON.stringify(content),JSON.stringify(validation.issues)]);
    if (!result.rowCount) throw new NotFoundException('Course not found');
    return mapCourse(result.rows[0]);
  }

  async review(id: string, status: string) {
    if (!['draft','in_review','approved','changes_requested'].includes(status)) throw new UnprocessableEntityException('Invalid review status');
    const result = await query('UPDATE course SET review_status=$2,updated_at=now() WHERE course_id=$1 RETURNING *', [id,status]);
    if (!result.rowCount) throw new NotFoundException('Course not found');
    return mapCourse(result.rows[0]);
  }

  async publish(id: string) {
    const course = await this.get(id);
    const validation = validateCoursePackage(course.content);
    if (!validation.success || validation.issues.some(issue => issue.severity === 'error')) {
      throw new UnprocessableEntityException({ message: 'Resolve validation errors before publishing', issues: validation.issues });
    }
    const result = await query(`UPDATE course SET status='published',review_status='approved',published_at=now(),updated_at=now() WHERE course_id=$1 RETURNING *`, [id]);
    return mapCourse(result.rows[0]);
  }

  async unpublish(id: string) {
    const result = await query(`UPDATE course SET status='draft',updated_at=now() WHERE course_id=$1 RETURNING *`, [id]);
    if (!result.rowCount) throw new NotFoundException('Course not found');
    return mapCourse(result.rows[0]);
  }

  async remove(id: string) {
    const result = await query('DELETE FROM course WHERE course_id=$1', [id]);
    if (!result.rowCount) throw new NotFoundException('Course not found');
  }
}
