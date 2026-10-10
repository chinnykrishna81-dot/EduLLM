const BASE = 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  chapters: {
    list: () => request<import('./types').Chapter[]>('/chapters'),
    create: (data: { subject: string; name: string; chapterNumber: number }) =>
      request<import('./types').Chapter>('/chapters', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<import('./types').Chapter>(`/chapters/${id}`),
    delete: (id: string) => request<void>(`/chapters/${id}`, { method: 'DELETE' }),
  },
  upload: {
    pdfs: (chapterId: string, notes: File, qa: File, mcq: File) => {
      const form = new FormData();
      form.append('notes_pdf', notes);
      form.append('qa_pdf', qa);
      form.append('mcq_pdf', mcq);
      return fetch(`${BASE}/chapters/${chapterId}/upload`, { method: 'POST', body: form }).then(
        r => r.json()
      );
    },
  },
  pipeline: {
    process: (chapterId: string) =>
      request<void>(`/chapters/${chapterId}/process`, { method: 'POST' }),
    status: (chapterId: string) =>
      request<import('./types').ProcessingStatus>(`/chapters/${chapterId}/status`),
  },
  draft: {
    get: (chapterId: string) =>
      request<import('./types').DraftContent>(`/chapters/${chapterId}/draft`),
    updatePage: (chapterId: string, pageId: string, data: Partial<import('./types').ConceptPage>) =>
      request<import('./types').ConceptPage>(`/chapters/${chapterId}/pages/${pageId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    approvePage: (chapterId: string, pageId: string) =>
      request<void>(`/chapters/${chapterId}/pages/${pageId}/approve`, { method: 'POST' }),
    rejectPage: (chapterId: string, pageId: string) =>
      request<void>(`/chapters/${chapterId}/pages/${pageId}/reject`, { method: 'POST' }),
    updateQuestion: (chapterId: string, qId: string, data: Partial<import('./types').Question>) =>
      request<import('./types').Question>(`/chapters/${chapterId}/questions/${qId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    approveQuestion: (chapterId: string, qId: string) =>
      request<void>(`/chapters/${chapterId}/questions/${qId}/approve`, { method: 'POST' }),
    rejectQuestion: (chapterId: string, qId: string) =>
      request<void>(`/chapters/${chapterId}/questions/${qId}/reject`, { method: 'POST' }),
    generateImage: (chapterId: string, imgId: string) =>
      request<import('./types').ImageSpec>(`/chapters/${chapterId}/images/${imgId}/generate`, {
        method: 'POST',
      }),
    approveImage: (chapterId: string, imgId: string) =>
      request<void>(`/chapters/${chapterId}/images/${imgId}/approve`, { method: 'POST' }),
    updateAttemptPools: (chapterId: string, pools: Record<number, string[]>) =>
      request<void>(`/chapters/${chapterId}/attempt-pools`, {
        method: 'PUT', body: JSON.stringify({ pools }),
      }),
  },
  publish: {
    publish: (chapterId: string) =>
      request<{ edullmChapterId: string }>(`/chapters/${chapterId}/publish`, { method: 'POST' }),
  },
};
