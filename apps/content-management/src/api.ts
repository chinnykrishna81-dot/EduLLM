import type { CoursePackage, MediaAsset } from '@edullm/content-schema';

export const API = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001';
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('edullm_cms_token'),
    headers = new Headers(options.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  const response = await fetch(`${API}/api${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(payload.message?.issues) ? payload.message.issues.map((x: any) => `${x.path}: ${x.message}`).join('\n') : payload.message?.message || payload.message || 'Request failed');
  return payload;
}
export type CmsUser = {
  id: string;
  loginId?: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'disabled';
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string;
};
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: CmsUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  me: () => request<CmsUser>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),
  users: () => request<CmsUser[]>('/users'),
  createTeacher: (body: any) => request<CmsUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  setStatus: (id: string, status: string) => request<CmsUser>(`/users/${id}/status/${status}`, { method: 'PATCH' }),
  setLoginId: (id: string, loginId: string) => request<CmsUser>(`/users/${id}/login-id`, { method: 'PATCH', body: JSON.stringify({ loginId }) }),
  resetPassword: (id: string, password: string) =>
    request<CmsUser>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    }),
  deleteUser: (id: string) => request<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  resetCycleTest: (userId: string, chapterId: string) => request<{reset:boolean;attemptsRemoved:number;chapterTitle:string}>(`/users/${userId}/cycle-tests/${chapterId}`, { method: 'DELETE' })
};

export type CourseRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  board?: string;
  grade?: string;
  subject?: string;
  language: string;
  status: string;
  reviewStatus: string;
  version: number;
  content: CoursePackage;
  validation: any[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
export type LibraryChapter = {
  id: string;
  stableId?: string;
  title: string;
  description: string;
  boardTags: string[];
  gradeTags: string[];
  subjectTags: string[];
  language: string;
  status: string;
  version: number;
  content: any;
  package?: any;
  cycleTest?: any;
  updatedAt: string;
};
export type MediaExplorerAsset = {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  byteSize: number;
  title: string;
  caption: string;
  altText: string;
  createdAt: string;
  className: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  folder: {type: 'topic'|'question_type1'|'question_type2'|'unassigned'; id: string; label: string};
  references: Array<{type: string; id: string; label: string}>;
};
export type ChapterPackageValidation = {
  success: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    path: string;
    message: string;
  }>;
  summary?: Record<string, number>;
};
export type SubjectDefinition = {
  id: string;
  title: string;
  code: string;
  description: string;
  board: string;
  grade: string;
  academicYear?: string;
  language: string;
  status: string;
  version: number;
  units: Array<{
    id: string;
    title: string;
    description: string;
    position: number;
    semesterTest?: any;
    chapters: Array<{
      id: string;
      title: string;
      position: number;
      status: string;
      topics: number;
      questionBank?: any[];
    }>;
  }>;
};
export type CourseOffering = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  currency: string;
  listPrice: number;
  discountPercent: number;
  salePrice: number;
  validityDays?: number;
  validityMode: 'duration'|'date_range';
  validityValue?: number;
  validityUnit?: 'days'|'months';
  validityStartDate?: string;
  validityEndDate?: string;
  freeTrialDays: number;
  subscriptionType: string;
  thumbnailUrl: string;
  subjects: Array<{
    id: string;
    title: string;
    code: string;
    board: string;
    grade: string;
    position: number;
  }>;
};
export const api = {
  listCourses: () => request<CourseRecord[]>('/courses'),
  getCourse: (id: string) => request<CourseRecord>(`/courses/${id}`),
  importCourse: (content: CoursePackage) =>
    request<CourseRecord>('/courses/import', {
      method: 'POST',
      body: JSON.stringify(content)
    }),
  saveCourse: (id: string, content: CoursePackage) =>
    request<CourseRecord>(`/courses/${id}/content`, {
      method: 'PUT',
      body: JSON.stringify(content)
    }),
  review: (id: string, status: string) =>
    request<CourseRecord>(`/courses/${id}/review/${status}`, {
      method: 'PATCH'
    }),
  publish: (id: string) => request<CourseRecord>(`/courses/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) => request<CourseRecord>(`/courses/${id}/unpublish`, { method: 'POST' }),
  listMedia: (id: string) => request<MediaAsset[]>(`/courses/${id}/media`),
  uploadMedia: (id: string, files: FileList | File[]) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    return request<MediaAsset[]>(`/courses/${id}/media`, {
      method: 'POST',
      body: form
    });
  },
  updateMedia: (courseId: string, id: string, body: Partial<MediaAsset>) =>
    request<MediaAsset>(`/courses/${courseId}/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
};

export const platformApi = {
  adminDashboard: () => request<any>('/admin/dashboard'),
  mediaExplorer: () => request<MediaExplorerAsset[]>('/media-explorer'),
  addExplorerMedia: (chapterId:string,file:File,folder:{type:string;id:string;label:string}) => {
    const form=new FormData();form.append('file',file);form.append('folderType',folder.type);form.append('folderRefId',folder.id);form.append('folderLabel',folder.label);
    return request<{id:string}>(`/media-explorer/chapters/${chapterId}`,{method:'POST',body:form});
  },
  replaceExplorerMedia: (id:string,file:File) => {const form=new FormData();form.append('file',file);return request<{replaced:boolean;id:string}>(`/media-explorer/${id}/replace`,{method:'POST',body:form})},
  deleteExplorerMedia: (id:string) => request<{deleted:boolean;id:string}>(`/media-explorer/${id}`,{method:'DELETE'}),
  chapters: () => request<LibraryChapter[]>('/library/chapters'),
  chapterMedia: (id: string) =>
    request<
      Array<{
        fileName: string;
        title: string;
        caption: string;
        altText: string;
        url: string;
      }>
    >(`/library/chapters/${id}/media`),
  uploadChapterMedia: (id: string, files: FileList | File[]) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    return request<
      Array<{
        fileName: string;
        title: string;
        caption: string;
        altText: string;
        url: string;
      }>
    >(`/library/chapters/${id}/media`, { method: 'POST', body: form });
  },
  uploadChapterDocument: (id: string, nodeType: 'topic' | 'subtopic', nodeId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ document: any; chapter: LibraryChapter }>(`/library/chapters/${id}/documents/${nodeType}/${encodeURIComponent(nodeId)}`, { method: 'POST', body: form });
  },
  uploadChapterResource: (id: string, type: 'smart-notes' | 'knowledge-graph', file: File, mode: 'append' | 'overwrite' = 'overwrite') => {
    const form = new FormData();
    form.append('file', file);
    return request<{ resource: any; chapter: LibraryChapter }>(`/library/chapters/${id}/resources/${type}?mode=${mode}`, { method: 'POST', body: form });
  },
  previewCyk: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<any>('/question-bank/cyk/preview', {
      method: 'POST',
      body: form
    });
  },
  createChapter: (body: any) =>
    request<LibraryChapter>('/library/chapters', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateChapter: (id: string, body: any) =>
    request<LibraryChapter>(`/library/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  deleteChapter: (id: string) =>
    request<{
      deleted: boolean;
      id: string;
      title: string;
      affectedSubjects: number;
    }>(`/library/chapters/${id}`, { method: 'DELETE' }),
  updateCycleTest: (id: string, body: any) =>
    request<LibraryChapter>(`/library/chapters/${id}/cycle-test`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  deleteCycleTestForms: (id: string) =>
    request<{ deleted: boolean }>(`/library/chapters/${id}/cycle-test/forms`, { method: 'DELETE' }),
  validateChapterPackage: (body: any) =>
    request<ChapterPackageValidation>('/library/chapter-packages/validate', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  importChapterPackage: (body: any) => request<{ chapter: LibraryChapter; validation: ChapterPackageValidation }>('/library/chapter-packages/import', { method: 'POST', body: JSON.stringify(body) }),
  chapterStatus: (id: string, status: string) =>
    request<LibraryChapter>(`/library/chapters/${id}/status/${status}`, {
      method: 'PATCH'
    }),
  subjects: () => request<SubjectDefinition[]>('/subjects'),
  createSubject: (body: any) =>
    request<SubjectDefinition>('/subjects', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  deleteSubject: (id: string) =>
    request<{
      deleted: boolean;
      id: string;
      title: string;
      deletedUnits: number;
    }>(`/subjects/${id}`, { method: 'DELETE' }),
  addUnit: (id: string, body: any) =>
    request<SubjectDefinition>(`/subjects/${id}/units`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  deleteUnit: (id: string, unitId: string) =>
    request<SubjectDefinition>(`/subjects/${id}/units/${unitId}`, {
      method: 'DELETE'
    }),
  addChapter: (id: string, unitId: string, chapterId: string) =>
    request<SubjectDefinition>(`/subjects/${id}/units/${unitId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ chapterId })
    }),
  updateSemesterTest: (id: string, unitId: string, body: any) => request<SubjectDefinition>(`/subjects/${id}/units/${unitId}/semester-test`, { method: 'PUT', body: JSON.stringify(body) }),
  subjectStatus: (id: string, status: string) =>
    request<SubjectDefinition>(`/subjects/${id}/status/${status}`, {
      method: 'PATCH'
    }),
  offerings: () => request<CourseOffering[]>('/offerings'),
  createOffering: (body: any) =>
    request<CourseOffering>('/offerings', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  deleteOffering: (id: string) => request<{ deleted: boolean }>(`/offerings/${id}`, { method: 'DELETE' }),
  updateOffering: (id: string, body: any) => request<CourseOffering>(`/offerings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  unpublishOffering: (id: string) => request<CourseOffering>(`/offerings/${id}/unpublish`, { method: 'POST' }),
  setOfferingSubjects: (id: string, subjectIds: string[]) =>
    request<CourseOffering>(`/offerings/${id}/subjects`, {
      method: 'PUT',
      body: JSON.stringify({ subjectIds })
    }),
  publishOffering: (id: string) => request<CourseOffering>(`/offerings/${id}/publish`, { method: 'POST' }),
  chapterQuestions: (chapterId: string) => request<any[]>(`/question-bank/chapters/${chapterId}`),
};

export const questionBankApi = {
  list: (chapterId: string) => request<any[]>(`/question-bank/chapters/${chapterId}`),
  statistics: (chapterId: string) => request<any>(`/question-bank/chapters/${chapterId}/statistics`),
  import: (chapterId: string, questions: File, answers: File | undefined, metadata: any) => {
    const form = new FormData();
    form.append('files', questions);
    if (answers) form.append('files', answers);
    Object.entries(metadata).forEach(([key, value]) => form.append(key, String(value || '')));
    return request<any>(`/question-bank/chapters/${chapterId}/import`, {
      method: 'POST',
      body: form
    });
  },
  update: (id: string, body: any) =>
    request<any>(`/question-bank/questions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    request<any>(`/question-bank/questions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  removeStaging: (chapterId: string, questionIds?: string[]) =>
    request<{ deleted: number; questionIds: string[]; skipped: number }>(`/question-bank/chapters/${chapterId}/staging`, {
      method: 'DELETE',
      body: JSON.stringify(questionIds === undefined ? {} : { questionIds })
    }),
  approveSelected: (chapterId: string, questionIds: string[]) =>
    request<{ approved: number; questionIds: string[] }>(`/question-bank/chapters/${chapterId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ questionIds })
    }),
  directImport: (chapterId: string, questions: any[], sourceName: string) =>
    request<{ batchId: string; imported: number; questionIds: string[] }>(`/question-bank/chapters/${chapterId}/direct-import`, {
      method: 'POST',
      body: JSON.stringify({ questions, sourceName })
    }),
  enrich: (chapterId: string, questions: any[]) =>
    request<any>(`/question-bank/chapters/${chapterId}/enrich`, {
      method: 'POST',
      body: JSON.stringify({ questions })
    }),
  aiAnalyse: (chapterId: string, questionIds: string[]) =>
    request<any>(`/question-bank/chapters/${chapterId}/ai-analyse`, {
      method: 'POST',
      body: JSON.stringify({ questionIds })
    }),
  aiSettings: () => request<any>('/ai-settings'),
  saveAiSettings: (body: any) => request<any>('/ai-settings', { method: 'PUT', body: JSON.stringify(body) })
};
