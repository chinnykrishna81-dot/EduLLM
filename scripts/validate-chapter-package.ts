import { readFileSync } from 'node:fs';
import { validateChapterPackage } from '../packages/content-schema/src/index';

const file=process.argv[2];
if(!file)throw new Error('Usage: validate-chapter-package.ts <chapter.json>');
const result=validateChapterPackage(JSON.parse(readFileSync(file,'utf8')));
console.log(JSON.stringify(result,null,2));
if(!result.success)process.exitCode=1;
