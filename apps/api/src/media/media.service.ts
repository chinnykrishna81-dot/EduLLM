import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { query } from '../db/database';

const mapMedia = (row: any) => ({ id: row.media_id, courseId: row.course_id, fileName: row.original_name, storedName: row.stored_name, mimeType: row.mime_type, byteSize: Number(row.byte_size), title: row.title, caption: row.caption, altText: row.alt_text, url: `/uploads/${row.stored_name}`, createdAt: row.created_at });

@Injectable()
export class MediaService {
  async list(courseId: string) {
    const result = await query('SELECT * FROM media_asset WHERE course_id=$1 ORDER BY created_at DESC', [courseId]);
    return result.rows.map(mapMedia);
  }
  async add(courseId: string, file: Express.Multer.File, metadata: Record<string,string>) {
    const id = randomUUID();
    const result = await query(`INSERT INTO media_asset(media_id,course_id,original_name,stored_name,mime_type,byte_size,title,caption,alt_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [id,courseId,file.originalname,file.filename,file.mimetype,file.size,metadata.title || file.originalname,metadata.caption || '',metadata.altText || '']);
    return mapMedia(result.rows[0]);
  }
  async update(id: string, body: Record<string,string>) {
    const result = await query('UPDATE media_asset SET title=COALESCE($2,title),caption=COALESCE($3,caption),alt_text=COALESCE($4,alt_text) WHERE media_id=$1 RETURNING *', [id,body.title ?? null,body.caption ?? null,body.altText ?? null]);
    if (!result.rowCount) throw new NotFoundException('Media not found');
    return mapMedia(result.rows[0]);
  }
}
