import { describe, expect, it } from 'vitest';
import { ChapterSchema, chapterLearningPages, validateChapterPackage, validateCoursePackage } from './index';

describe('course package validation', () => {
  it('rejects a package without chapters', () => {
    const result = validateCoursePackage({ schemaVersion:'1.0',course:{title:'Test'},chapters:[] });
    expect(result.success).toBe(false);
  });
  it('validates Type 2 mark totals', () => {
    const result = validateCoursePackage({ schemaVersion:'1.0',course:{title:'Test'},chapters:[{id:'c',title:'C',topics:[{id:'t',title:'T',concepts:[{id:'x',title:'X',explanation:{summary:'s',quickUnderstanding:'q',beginner:'b',detailed:'d'},type2Questions:[{id:'q',title:'Q',question:'Why?',totalMarks:5,finalAnswer:'A',steps:[{id:'1',prompt:'p',answer:'a',marks:1},{id:'2',prompt:'p',answer:'a',marks:1}]}]}]}]}] });
    expect(result.success).toBe(false);
    expect(result.issues.some(issue => issue.message.includes('step marks'))).toBe(true);
  });
});

describe('structured chapter packages',()=>{
  it('allows Smart Notes up to 10 MB while keeping Knowledge Graph resources at 5 MB',()=>{
    const resource={id:'resource-1',fileName:'notes.docx',url:'/uploads/notes.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',byteSize:6*1024*1024,uploadedAt:new Date().toISOString(),extractedHtml:'<p>Notes</p>'};
    expect(ChapterSchema.safeParse({id:'chapter-1',title:'Chapter',smartNotes:{title:'Smart Notes',richContent:'',documents:[resource]}}).success).toBe(true);
    expect(ChapterSchema.safeParse({id:'chapter-1',title:'Chapter',knowledgeGraph:{title:'Knowledge Graph',description:'',resource}}).success).toBe(false);
  });
  it('supports Topic → Subtopic → Page, subtopic checks and flat Chapter Practice',()=>{
    const question=(id:string,usage:string[])=>({id,title:id,question:'Which statement is correct?',options:['A','B'],correctAnswer:'A',explanation:'A is correct.',usage});
    const concept={id:'concept-1',title:'Reactants and products',explanation:{summary:'Reactants form products.',quickUnderstanding:'Reactants are on the left.',beginner:'A reaction changes reactants into products.',detailed:'Atoms rearrange during a chemical reaction.'},learningCards:[{id:'card-1',title:'Reaction',content:'Reactants form products.'}]};
    const content={id:'chapter-1',title:'Chemical Reactions and Equations',topics:[{id:'topic-1',title:'1.1 Chemical Equations',sequence:1,subtopics:[{id:'subtopic-1',title:'1.1.1 Writing a Chemical Equation',sequence:1,pages:[{id:'page-1',title:'Word equations',sequence:1,concepts:[concept]}],knowledgeCheck:{type1Questions:[question('check-1',['knowledge_check']),question('check-2',['knowledge_check'])]}}]}],chapterPractice:{type1Questions:[{...question('practice-1',['chapter_practice','cycle_test_bank']),topicId:'topic-1',subtopicId:'subtopic-1'}]}};
    const result=validateChapterPackage({schemaVersion:'2.1',packageType:'chapter',chapter:{stableId:'chapter-1',title:'Chemical Reactions and Equations',boardTags:['CBSE'],gradeTags:['10'],subjectTags:['Science']},content,cycleTest:{title:'Cycle Test',durationMinutes:25,totalMarks:1,retakeAfterDays:30,mastery:{greenPercent:90,yellowPercent:60},blueprint:[{topicId:'topic-1',minimumQuestions:1,marks:1}],questionIds:['practice-1']}});
    expect(result.success).toBe(true);
    expect(result.summary?.pages).toBe(1);
    expect(result.summary?.knowledgeCheckQuestions).toBe(2);
    expect(result.summary?.chapterPracticeQuestions).toBe(1);
    const pages=chapterLearningPages(result.data?.content);
    expect(pages[0]).toMatchObject({topicId:'topic-1',subtopicId:'subtopic-1',id:'page-1'});
  });
  it('keeps the existing Chapter 1 package backward compatible',()=>{
    const existing={schemaVersion:'2.0',packageType:'chapter',chapter:{stableId:'legacy-chapter-1',title:'Legacy Chapter',boardTags:['CBSE'],gradeTags:['10'],subjectTags:['Science']},content:{id:'legacy-chapter-1',title:'Legacy Chapter',topics:[{id:'topic-1',title:'Legacy Topic',concepts:[{id:'concept-1',title:'Legacy Concept',explanation:{summary:'Summary',quickUnderstanding:'Quick',beginner:'Beginner',detailed:'Detailed'},type1Questions:[{id:'question-1',title:'Legacy question',question:'Which answer is correct?',options:['A','B'],correctAnswer:'A',explanation:'A is correct.',usage:['cycle_test_bank']}]}]}]},cycleTest:{title:'Cycle Test',durationMinutes:10,totalMarks:1,retakeAfterDays:30,mastery:{greenPercent:90,yellowPercent:60},blueprint:[{topicId:'topic-1',minimumQuestions:1,marks:1}],questionIds:['question-1']}};
    const result=validateChapterPackage(existing);
    expect(result.success).toBe(true);
    expect(chapterLearningPages(existing.content).length).toBe(existing.content.topics.length);
  });
});
