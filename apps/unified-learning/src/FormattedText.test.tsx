// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formattedTextHtml } from './FormattedText';

describe('formattedTextHtml', () => {
  it('renders Markdown formatting inside existing HTML wrappers', () => {
    const html = formattedTextHtml('<p>Use **conservation of mass** and `balance` the equation.</p>');
    expect(html).toContain('<strong>conservation of mass</strong>');
    expect(html).toContain('<code>balance</code>');
    expect(html).not.toContain('**');
  });

  it('renders plain Markdown blocks and removes unsafe markup', () => {
    const markdown = formattedTextHtml('## Explanation\n\n- **First** point\n- Second point');
    expect(markdown).toContain('<h3>Explanation</h3>');
    expect(markdown).toContain('<ul>');
    expect(markdown).toContain('<strong>First</strong>');

    const unsafe = formattedTextHtml('<p onclick="alert(1)">Safe **text**</p><script>alert(1)</script>');
    expect(unsafe).not.toContain('onclick');
    expect(unsafe).not.toContain('<script');
    expect(unsafe).toContain('<strong>text</strong>');
  });

  it('does not alter Markdown-like characters inside image URLs', () => {
    const html = formattedTextHtml('<p>**Diagram**</p><img src="https://media.learn.iqlabsacademy.com/edullm/my_image_file.png" alt="Diagram">');
    expect(html).toContain('<strong>Diagram</strong>');
    expect(html).toContain('my_image_file.png');
  });
});
