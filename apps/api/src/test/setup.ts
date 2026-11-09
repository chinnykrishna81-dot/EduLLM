// pdfjs probes these browser canvas classes while its module is imported.
// API unit tests do not render PDFs, so minimal test-only constructors are sufficient.
if (!globalThis.DOMMatrix) (globalThis as any).DOMMatrix = class DOMMatrix {};
if (!globalThis.ImageData) (globalThis as any).ImageData = class ImageData {};
if (!globalThis.Path2D) (globalThis as any).Path2D = class Path2D {};
