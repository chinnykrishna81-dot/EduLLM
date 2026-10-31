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

  it('turns imported paragraph newlines into separate formatted blocks', () => {
    const html = formattedTextHtml('<p>**Step-by-step explanation**\n\n**Step 1:** First result.\n\n**Step 2:** Final result.</p>');
    expect(html).toContain('<p><strong>Step-by-step explanation</strong></p>');
    expect(html).toContain('<p><strong>Step 1:</strong> First result.</p>');
    expect(html).toContain('<p><strong>Step 2:</strong> Final result.</p>');
    expect(html.match(/<p>/g)).toHaveLength(3);
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

  it('allows safe text colors while removing unrelated styles', () => {
    const html = formattedTextHtml('<span style="color:#2563eb;position:fixed">Blue</span> <font color="green" onclick="bad()">Green</font>');
    expect(html).toContain('style="color:#2563eb"');
    expect(html).toContain('color="green"');
    expect(html).not.toContain('position');
    expect(html).not.toContain('onclick');
  });

  it('renders imported caret exponent notation as superscript', () => {
    const html = formattedTextHtml('Write 2^3 × 5^-2, x^{12}, a^n and y^(n+1) in index form.');
    expect(html).toContain('2<sup>3</sup>');
    expect(html).toContain('5<sup>-2</sup>');
    expect(html).toContain('x<sup>12</sup>');
    expect(html).toContain('a<sup>n</sup>');
    expect(html).toContain('y<sup>(n+1)</sup>');
    expect(html).not.toContain('^');
  });
});
