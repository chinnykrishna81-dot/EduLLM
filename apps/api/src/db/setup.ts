import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/auth.service';

async function main() {
  const baseUrl = process.env.DATABASE_URL || 'postgresql://I039196@localhost:5432/edullm';
  const target = new URL(baseUrl);
  const database = target.pathname.slice(1) || 'edullm';
  target.pathname = '/postgres';
  const admin = new Client({ connectionString: target.toString() });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${database.replaceAll('"', '""')}"`);
  await admin.end();
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  const sql = await readFile(join(process.cwd(), 'src/db/schema.sql'), 'utf8');
  await client.query(sql);
  const adminEmail=process.env.BOOTSTRAP_ADMIN_EMAIL||'admin@edullm.local',adminPassword=process.env.BOOTSTRAP_ADMIN_PASSWORD||'Admin@123';
  let bootstrapAdmin=await client.query('SELECT user_id FROM app_user WHERE email=$1',[adminEmail]);
  if(!bootstrapAdmin.rowCount){const id=randomUUID();await client.query(`INSERT INTO app_user(user_id,email,display_name,role,password_hash,must_change_password) VALUES($1,$2,'EduLLM Administrator','admin',$3,false)`,[id,adminEmail,await hashPassword(adminPassword)]);bootstrapAdmin=await client.query('SELECT user_id FROM app_user WHERE email=$1',[adminEmail])}
  const teacherEmail=process.env.BOOTSTRAP_TEACHER_EMAIL||'teacher@edullm.local',teacherPassword=process.env.BOOTSTRAP_TEACHER_PASSWORD||'Teacher@123';
  if(!(await client.query('SELECT 1 FROM app_user WHERE email=$1',[teacherEmail])).rowCount)await client.query(`INSERT INTO app_user(user_id,email,display_name,role,password_hash,must_change_password,created_by) VALUES($1,$2,'Test Science Teacher','teacher',$3,true,$4)`,[randomUUID(),teacherEmail,await hashPassword(teacherPassword),bootstrapAdmin.rows[0].user_id]);
  await client.end();
  console.log(`EduLLM database '${database}' is ready.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
