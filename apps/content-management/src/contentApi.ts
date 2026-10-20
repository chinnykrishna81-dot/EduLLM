const BASE = `${import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001'}/api/content`;

export const api = {
  listPackages: () => fetch(`${BASE}/packages`).then(r => r.json()),
  getChapter: (pkgId: string) => fetch(`${BASE}/packages/${pkgId}/chapter`).then(r => r.json()),
  getMcq: (pkgId: string) => fetch(`${BASE}/packages/${pkgId}/mcq`).then(r => r.json()),
  getType2: (pkgId: string) => fetch(`${BASE}/packages/${pkgId}/type2`).then(r => r.json()),
  chapterImageUrl: (pkgId: string, file: string) => `${BASE}/packages/${pkgId}/images/chapter/${file}`,
  type2ImageUrl: (pkgId: string, file: string) => `${BASE}/packages/${pkgId}/images/type2/${file}`,
};
