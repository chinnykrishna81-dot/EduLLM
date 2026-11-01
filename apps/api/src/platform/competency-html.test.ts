import {describe,expect,it} from 'vitest';
import {secureCompetencyHtml} from './competency-html';

describe('secureCompetencyHtml',()=>{
  it('preserves self-contained styles, mathematics and pattern sections',()=>{
    const result=secureCompetencyHtml('<html><head><style>.card{color:#123}</style></head><body><article id="RN-01" class="lesson pattern-page"><details><summary>Answer</summary><p>An expression: x² + y²</p></details></article></body></html>');
    expect(result.patternIds).toEqual(['RN-01']);expect(result.html).toContain('.card{color:#123}');expect(result.html).toContain('expression: x² + y²');expect(result.html).toContain('Content-Security-Policy');
  });
  it('removes remote font imports without rejecting the learning page',()=>{
    const result=secureCompetencyHtml('<style>@import url("https://fonts.example/font.css");h1{color:blue}</style><article class="pattern-page" id="RN-01"><h1>Pattern</h1></article>');
    expect(result.html).not.toContain('fonts.example');expect(result.html).toContain('h1{color:blue}');expect(result.warnings).toHaveLength(1);
  });
  it('removes scripts while retaining safe presentation controls',()=>{
    const result=secureCompetencyHtml('<article class="pattern-page" id="RN-01"><button type="button">Next</button><script>window.parent.postMessage("token", "*")</script></article>');
    expect(result.html).toContain('<button type="button">Next</button>');expect(result.html).not.toContain('<script');expect(result.warnings).toContain('Scripted behaviour was removed; safe native HTML interactions remain available.');
  });
  it('recognizes section, main and div pattern-page containers',()=>{
    const result=secureCompetencyHtml('<section class="pattern-page" id="S-01"></section><main id="M-02" class="lesson pattern-page"></main><div data-pattern-id="D-03"></div>');
    expect(result.patternIds).toEqual(['S-01','M-02','D-03']);
  });
  it('recognizes standalone learning pages that use the pattern class',()=>{
    const result=secureCompetencyHtml('<html><head><style>html{scroll-behavior:smooth}.pattern{background:white}</style></head><body><aside><input placeholder="Search"></aside><main><article class="pattern" id="TR-CP01"><details><summary>Worked example</summary><p>sin 30Â° = 1/2</p></details></article><article id="TR-CP02" class="lesson pattern"><h2>Second pattern</h2></article></main><script>document.querySelector("main")</script></body></html>');
    expect(result.patternIds).toEqual(['TR-CP01','TR-CP02']);
    expect(result.html).toContain('.pattern{background:white}');
    expect(result.html).toContain('scroll-behavior:smooth');
    expect(result.html).toContain('<details>');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('<input');
  });
  it.each([
    '<article class="pattern-page" id="P"><img src="https://bad.example/x.png"></article>',
    '<article class="pattern-page" id="P"><p onclick="x()">x</p></article>'
  ])('rejects unsafe HTML: %s',html=>expect(()=>secureCompetencyHtml(html)).toThrow());
});
