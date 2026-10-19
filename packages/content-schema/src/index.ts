import { z } from 'zod';

const text = z.string().default('');
const id = z.string().min(1);
const mediaRefs = z.array(z.string()).default([]);
const reviewStatus = z.enum(['draft','reviewed','changes_requested']).default('draft');
const examEvidence = z.array(z.object({ year: z.string().regex(/^20\d{2}$/), setCodes: z.array(z.string()).default([]), claimType: z.enum(['exact_question','adapted_question','pattern_seen']).default('pattern_seen'), sourceType: z.enum(['board_paper','official_sample_paper']).default('board_paper') })).default([]);

const commonAsset = {
  id,
  title: z.string().min(1),
  mediaRefs,
  reviewStatus
};

export const FlashCardSchema = z.object({ ...commonAsset, front: z.string().min(1), back: z.string().min(1), hint: text });
export const LearningCardSchema = z.object({ ...commonAsset, content: z.string().min(1), keyPoints: z.array(z.string()).default([]), quickCheck: text });
export const WorkedExampleSchema = z.object({ ...commonAsset, problem: z.string().min(1), steps: z.array(z.string()).min(1), answer: z.string().min(1), explanation: text, commonMistakes: z.array(z.string()).default([]) });
export const PatternSchema = z.object({ id, name: z.string().min(1), description: text, skills: z.array(z.string()).default([]) });
export const Type1Schema = z.object({
  ...commonAsset,
  topicId: text, subtopicId: text, usage: z.array(z.enum(['knowledge_check','chapter_practice','cycle_test_bank'])).default([]),
  format: z.enum(['mcq','true_false','fill_blank','one_line','match','sequence']).default('mcq'),
  question: z.string().min(1), options: z.array(z.string()).default([]), correctAnswer: z.string().min(1),
  explanation: z.string().min(1), distractorExplanations: z.record(z.string(),z.string()).default({}), patternId: text,
  difficulty: z.enum(['easy','medium','hard']).default('medium'), marks: z.number().nonnegative().default(1), examEvidence
});
export const Type2StepSchema = z.object({
  id, prompt: z.string().min(1), answer: z.string().min(1), explanation: text, hint: text,
  interactionType: z.enum(['mcq','true_false','fill_blank','drag_point','sequence','numeric']).default('mcq'),
  options: z.array(z.string()).default([]), marks: z.number().nonnegative().default(1),
  isCritical: z.boolean().default(false), negativeMarks: z.number().nonnegative().default(0),
  dependsOnStepIds: z.array(z.string()).default([]), answerContribution: text,
  mediaRefs, answerMediaRefs: z.array(z.string()).default([]), explanationMediaRefs: z.array(z.string()).default([]), reviewStatus
}).superRefine((value,ctx)=>{
  if(value.interactionType==='drag_point'&&(value.options.length<2||value.options.length>3))ctx.addIssue({code:'custom',path:['options'],message:'A drag-point Type 2 step requires 2 or 3 closely related choices'});
  if(value.options.length&&!value.options.includes(value.answer))ctx.addIssue({code:'custom',path:['answer'],message:'The correct answer must exactly match one supplied option'});
});
export const Type2Schema = z.object({
  ...commonAsset,
  topicId: text, subtopicId: text, usage: z.array(z.enum(['knowledge_check','chapter_practice','cycle_test_bank'])).default([]),
  question: z.string().min(1), patternId: text, difficulty: z.enum(['easy','medium','hard']).default('medium'),
  totalMarks: z.number().positive(), steps: z.array(Type2StepSchema).min(2), finalAnswer: z.string().min(1),
  commonMistakes: z.array(z.string()).default([]), useForPractice: z.boolean().default(true), examEvidence
}).superRefine((value,ctx) => {
  const sum = value.steps.reduce((total,step) => total + step.marks,0);
  if (sum !== value.totalMarks) ctx.addIssue({ code: 'custom', path: ['totalMarks'], message: `Total marks (${value.totalMarks}) must equal step marks (${sum})` });
});

export const ExplanationSchema = z.object({
  summary: z.string().min(1), quickUnderstanding: z.string().min(1), beginner: z.string().min(1),
  detailed: z.string().min(1), deepDive: text, examPerspective: text,
  realWorldApplications: z.array(z.string()).default([]), misconceptions: z.array(z.object({ belief: z.string(), correction: z.string() })).default([]),
  memoryAids: z.array(z.string()).default([]), mediaRefs, reviewStatus
});

export const ConceptSchema = z.object({
  id, title: z.string().min(1), description: text, learningObjectives: z.array(z.string()).default([]), mediaRefs, reviewStatus,
  explanation: ExplanationSchema,
  flashCards: z.array(FlashCardSchema).default([]), learningCards: z.array(LearningCardSchema).default([]),
  workedExamples: z.array(WorkedExampleSchema).default([]), questionPatterns: z.array(PatternSchema).default([]),
  type1Questions: z.array(Type1Schema).default([]), type2Questions: z.array(Type2Schema).default([])
});
const sequence = z.number().int().positive();
export const PdfDocumentSchema = z.object({
  id, fileName: z.string().min(1), url: z.string().min(1), byteSize: z.number().int().positive().max(5*1024*1024),
  pageCount: z.number().int().positive(), uploadedAt: z.string().min(1), readOnly: z.literal(true).default(true)
});
export const KnowledgeCheckSchema = z.object({
  title: z.string().min(1).default('Check Your Understanding'), instructions: text,
  type1Questions: z.array(Type1Schema).default([]), type2Questions: z.array(Type2Schema).default([])
}).superRefine((value,ctx)=>{
  if(value.type1Questions.length+value.type2Questions.length===0)ctx.addIssue({code:'custom',message:'A Knowledge Check needs at least one question'});
});
export const LearningPageBlockSchema = z.discriminatedUnion('type',[
  z.object({id,type:z.literal('text'),content:z.string().min(1)}),
  z.object({id,type:z.literal('remember'),content:z.string().min(1)}),
  z.object({
    id,type:z.literal('image'),mediaRef:z.string().min(1),
    layout:z.enum(['image-left','image-right','centered','full-width']).default('centered'),
    size:z.enum(['small','medium','large']).default('medium'),caption:text,altText:text
  }),
  z.object({id,type:z.literal('image-inline'),src:z.string().min(1),altText:text,caption:text})
]);
export const LearningPageSchema = z.object({
  id, title: z.string().min(1), description: text, sequence, pageType: z.enum(['introduction','learning','worked_example','recap']).default('learning'),
  continueRequired: z.boolean().default(true), mediaRefs, blocks:z.array(LearningPageBlockSchema).default([]),concepts: z.array(ConceptSchema).default([])
});
export const SubtopicSchema = z.object({
  id, title: z.string().min(1), description: text, syllabusCode: text, sequence, mediaRefs,
  pages: z.array(LearningPageSchema).default([]), document: PdfDocumentSchema.optional(), knowledgeCheck: KnowledgeCheckSchema.optional()
});
export const StructuredTopicSchema = z.object({
  id, title: z.string().min(1), description: text, syllabusCode: text, sequence, mediaRefs,
  introductionPages: z.array(LearningPageSchema).default([]), document: PdfDocumentSchema.optional(), subtopics: z.array(SubtopicSchema).default([]),
  concepts: z.array(ConceptSchema).default([]), parentTopicId: text, parentTopicTitle: text,
  knowledgeCheck: KnowledgeCheckSchema.optional()
});
export const LegacyTopicSchema = z.object({ id, title: z.string().min(1), description: text, syllabusCode: text, parentTopicId: text, parentTopicTitle: text, mediaRefs, concepts: z.array(ConceptSchema).min(1) });
export const TopicSchema = z.union([StructuredTopicSchema,LegacyTopicSchema]);
export const ChapterPracticeSchema = z.object({
  title: z.string().min(1).default('Chapter Practice — Master Every Pattern'), instructions: text,
  type1Questions: z.array(Type1Schema).default([]), type2Questions: z.array(Type2Schema).default([])
});
export const BirdsEyeSummarySchema = z.object({
  title: z.string().min(1).default('Chapter Summary'), overview: z.string().min(1), bigPicture: text,
  keyIdeas: z.array(z.string()).default([]), topicConnections: z.array(z.string()).default([]),
  formulaSheet: z.array(z.object({ label: z.string().min(1), formula: z.string().min(1), note: text })).default([]),
  examFocus: z.array(z.string()).default([]), recallChecklist: z.array(z.string()).default([]),
  importantNotes: z.array(z.object({
    id, title: z.string().min(1), introduction: text,
    items: z.array(z.object({ title: z.string().min(1), equation: text, condition: text, observation: text, reactionType: text, examNote: text })).min(1)
  })).default([]), mediaRefs
});
export const ChapterResourceDocumentSchema = z.object({
  id, fileName:z.string().min(1), url:z.string().min(1), mimeType:z.string().min(1),
  byteSize:z.number().int().positive().max(10*1024*1024), uploadedAt:z.string().min(1),
  pageCount:z.number().int().positive().optional(), extractedHtml:text
});
const KnowledgeGraphResourceDocumentSchema=ChapterResourceDocumentSchema.extend({byteSize:z.number().int().positive().max(5*1024*1024)});
export const SmartNotesSchema = z.object({
  title:z.string().min(1).default('Smart Notes'), richContent:text,
  documents:z.array(ChapterResourceDocumentSchema).default([])
});
export const KnowledgeGraphSchema = z.object({
  title:z.string().min(1).default('Knowledge Graph'), description:text,
  resource:KnowledgeGraphResourceDocumentSchema.optional()
});
export const ChapterSchema = z.object({
  id, title: z.string().min(1), description: text, mediaRefs,
  birdsEyeSummary: BirdsEyeSummarySchema.optional(), topics: z.array(TopicSchema).default([]),
  chapterPractice: ChapterPracticeSchema.optional(), smartNotes:SmartNotesSchema.optional(),
  knowledgeGraph:KnowledgeGraphSchema.optional()
});
export const CoursePackageSchema = z.object({
  schemaVersion: z.literal('1.0'),
  course: z.object({ title: z.string().min(1), slug: text, description: text, board: text, grade: text, subject: text, language: z.string().default('English'), thumbnailRef: text }),
  chapters: z.array(ChapterSchema).min(1)
});

export const ChapterPackageSchema = z.object({
  schemaVersion: z.enum(['2.0','2.1']),
  packageType: z.literal('chapter'),
  chapter: z.object({
    stableId: z.string().min(3), title: z.string().min(1), description: text,
    boardTags: z.array(z.string()).min(1), gradeTags: z.array(z.string()).min(1),
    subjectTags: z.array(z.string()).min(1), language: z.string().default('English'),
    syllabusVersion: text, estimatedStudyMinutes: z.number().int().positive().optional()
  }),
  content: ChapterSchema,
  cycleTest: z.object({
    title: z.string().min(1), durationMinutes: z.number().int().positive(), totalMarks: z.number().positive(),
    resultDelayHours: z.number().nonnegative().default(24), retakeAfterDays: z.number().int().positive(),
    mastery: z.object({ greenPercent: z.number().min(0).max(100), yellowPercent: z.number().min(0).max(100) }),
    blueprint: z.array(z.object({ topicId: id, minimumQuestions: z.number().int().nonnegative(), marks: z.number().nonnegative(), patternIds: z.array(z.string()).default([]) })).min(1),
    questionIds: z.array(z.string()).min(1)
  }),
  mediaManifest: z.array(z.object({ fileName: z.string().min(1), title: z.string().min(1), altText: z.string().min(1), caption: text, placementHint: text })).default([]),
  references: z.array(z.object({ title: z.string().min(1), url: z.string().url(), licence: text, appliesTo: z.array(z.string()).default([]) })).default([]),
  generationNotes: z.object({ generatedBy: text, generatedAt: text, reviewedBy: text }).default({generatedBy:'',generatedAt:'',reviewedBy:''})
}).superRefine((value,ctx)=>{
  if(value.content.topics.some(isStructuredTopic)&&value.schemaVersion!=='2.1')ctx.addIssue({code:'custom',path:['schemaVersion'],message:'Structured Topic → Subtopic → Page packages require schemaVersion 2.1'});
  if(value.chapter.stableId!==value.content.id) ctx.addIssue({code:'custom',path:['content','id'],message:'Content id must equal chapter stableId'});
  if(value.cycleTest.mastery.yellowPercent>=value.cycleTest.mastery.greenPercent) ctx.addIssue({code:'custom',path:['cycleTest','mastery'],message:'Yellow threshold must be below Green threshold'});
  const topics=new Set(value.content.topics.map(topic=>topic.id));
  value.cycleTest.blueprint.forEach((rule,index)=>{if(!topics.has(rule.topicId))ctx.addIssue({code:'custom',path:['cycleTest','blueprint',index,'topicId'],message:'Blueprint topic does not exist in chapter content'})});
  const questionIds=new Set(chapterAllQuestions(value.content).map(question=>question.id));
  value.cycleTest.questionIds.forEach((questionId,index)=>{if(!questionIds.has(questionId))ctx.addIssue({code:'custom',path:['cycleTest','questionIds',index],message:'Question id does not exist in chapter content'})});
});

export type CoursePackage = z.infer<typeof CoursePackageSchema>;
export type ChapterPackage = z.infer<typeof ChapterPackageSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type MediaAsset = { id: string; courseId: string; fileName: string; storedName: string; mimeType: string; byteSize: number; title: string; caption: string; altText: string; url: string; createdAt: string };

export type LearningPageView = {
  id:string; title:string; description:string; sequence:number; pageType:'introduction'|'learning'|'worked_example'|'recap';
  continueRequired:boolean; mediaRefs:string[]; blocks:z.infer<typeof LearningPageBlockSchema>[]; concepts:Concept[]; topicId:string; topicTitle:string;
  topicDescription?:string; subtopicId:string; subtopicTitle:string; subtopicDescription?:string; syllabusCode:string; knowledgeCheck?:z.infer<typeof KnowledgeCheckSchema>;
};

export function isStructuredTopic(topic:any):boolean{return Array.isArray(topic?.subtopics)}
export function chapterLearningPages(chapter:any):LearningPageView[]{
  let fallbackSequence=0;
  return (chapter?.topics||[]).flatMap((topic:any)=>{
    if(!isStructuredTopic(topic))return [{...topic,sequence:++fallbackSequence,pageType:topic.syllabusCode==='INTRO'?'introduction':'learning',continueRequired:true,topicId:topic.parentTopicId||topic.id,topicTitle:topic.parentTopicTitle||topic.title,subtopicId:topic.id,subtopicTitle:topic.title,knowledgeCheck:undefined}];
    const documentPages=(document:any,subtopicId:string,subtopicTitle:string,syllabusCode:string)=>document?Array.from({length:document.pageCount},(_,index)=>({id:`${document.id}:page:${index+1}`,title:`${subtopicTitle} — Page ${index+1}`,description:'Read-only PDF learning page',sequence:index+1,pageType:'learning',continueRequired:true,mediaRefs:[],concepts:[],document:{...document,pageNumber:index+1},topicId:topic.id,topicTitle:topic.title,subtopicId,subtopicTitle,syllabusCode,knowledgeCheck:undefined})):[];
    const introductions=topic.document?documentPages(topic.document,`${topic.id}:document`,topic.title,'INTRO').map((page:any)=>({...page,topicDescription:topic.description||''})):(topic.introductionPages||[]).map((page:any)=>({...page,topicId:topic.id,topicTitle:topic.title,topicDescription:topic.description||'',subtopicId:`${topic.id}:introduction`,subtopicTitle:topic.title,syllabusCode:'INTRO',knowledgeCheck:undefined}));
    const subtopics=[...(topic.subtopics||[])].sort((a:any,b:any)=>a.sequence-b.sequence).flatMap((subtopic:any)=>subtopic.document?documentPages(subtopic.document,subtopic.id,subtopic.title,subtopic.syllabusCode).map((page:any)=>({...page,topicDescription:topic.description||'',subtopicDescription:subtopic.description||''})):[...(subtopic.pages||[])].sort((a:any,b:any)=>a.sequence-b.sequence).map((page:any,index:number)=>({...page,topicId:topic.id,topicTitle:topic.title,topicDescription:topic.description||'',subtopicId:subtopic.id,subtopicTitle:subtopic.title,subtopicDescription:subtopic.description||'',syllabusCode:subtopic.syllabusCode,knowledgeCheck:index===subtopic.pages.length-1?subtopic.knowledgeCheck:undefined})));
    const combined=[...introductions.sort((a:any,b:any)=>a.sequence-b.sequence),...subtopics];
    if(topic.knowledgeCheck&&combined.length)combined[combined.length-1]={...combined[combined.length-1],knowledgeCheck:topic.knowledgeCheck};
    return combined;
  });
}
export function chapterConcepts(chapter:any):Concept[]{return chapterLearningPages(chapter).flatMap(page=>page.concepts)}
export function chapterKnowledgeQuestions(chapter:any):any[]{return chapterLearningPages(chapter).flatMap(page=>page.knowledgeCheck?[...page.knowledgeCheck.type1Questions,...page.knowledgeCheck.type2Questions].map(question=>({...question,topicId:question.topicId||page.topicId,subtopicId:question.subtopicId||page.subtopicId})):[])}
export function chapterPracticeQuestions(chapter:any):any[]{const practice=chapter?.chapterPractice;return practice?[...(practice.type1Questions||[]),...(practice.type2Questions||[])]:[]}
export function chapterAllQuestions(chapter:any):any[]{const pageQuestions=chapterLearningPages(chapter).flatMap(page=>page.concepts.flatMap(concept=>[...concept.type1Questions,...concept.type2Questions].map(question=>({...question,topicId:question.topicId||page.topicId,subtopicId:question.subtopicId||page.subtopicId}))));return [...pageQuestions,...chapterKnowledgeQuestions(chapter),...chapterPracticeQuestions(chapter)]}

export type ValidationIssue = { severity: 'error'|'warning'|'info'; path: string; message: string };

function collectWarnings(course: CoursePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  course.chapters.forEach((chapter,ci) => chapterConcepts(chapter).forEach((concept,ki) => {
    const base = `chapters.${ci}.concepts.${ki}`;
    if (!concept.flashCards.length) issues.push({ severity:'warning',path:`${base}.flashCards`,message:'No Flash Cards supplied' });
    if (!concept.learningCards.length) issues.push({ severity:'warning',path:`${base}.learningCards`,message:'No Learning Cards supplied' });
    if (!concept.type1Questions.length) issues.push({ severity:'warning',path:`${base}.type1Questions`,message:'No Type 1 questions supplied' });
    if (!concept.type2Questions.length) issues.push({ severity:'info',path:`${base}.type2Questions`,message:'No Type 2 guided questions supplied' });
  }));
  return issues;
}

export function validateCoursePackage(input: unknown): { success: boolean; data?: CoursePackage; issues: ValidationIssue[] } {
  const result = CoursePackageSchema.safeParse(input);
  if (!result.success) return { success:false, issues: result.error.issues.map(issue => ({ severity:'error',path:issue.path.join('.'),message:issue.message })) };
  return { success:true, data:result.data, issues:collectWarnings(result.data) };
}

export function validateChapterPackage(input:unknown):{success:boolean;data?:ChapterPackage;issues:ValidationIssue[];summary?:Record<string,number>} {
  const result=ChapterPackageSchema.safeParse(input);
  if(!result.success)return {success:false,issues:result.error.issues.map(issue=>({severity:'error',path:issue.path.join('.'),message:issue.message}))};
  const value=result.data; const issues:ValidationIssue[]=[];
  if(!value.content.birdsEyeSummary)issues.push({severity:'warning',path:'content.birdsEyeSummary',message:'Chapter Summary is missing'});
  const pages=chapterLearningPages(value.content),concepts=chapterConcepts(value.content),structured=value.content.topics.some(isStructuredTopic);
  const allQuestions=chapterAllQuestions(value.content),type1=allQuestions.filter(question=>!question.steps),type2=allQuestions.filter(question=>Array.isArray(question.steps));
  value.content.topics.forEach((topic:any,index)=>{if(!isStructuredTopic(topic)&&!topic.concepts.length)issues.push({severity:'error',path:`content.topics.${index}.concepts`,message:'Every legacy topic needs at least one concept'})});
  concepts.forEach((concept,index)=>{if(!concept.learningCards.length&&!concept.flashCards.length)issues.push({severity:'warning',path:`concepts.${index}`,message:`${concept.title} has no Learning or Flash Cards`});if(!structured&&!concept.type1Questions.length&&!concept.type2Questions.length)issues.push({severity:'warning',path:`concepts.${index}`,message:`${concept.title} has no practice questions`})});
  if(structured){
    value.content.topics.filter(isStructuredTopic).forEach((topic:any,topicIndex)=>{const count=(topic.knowledgeCheck?.type1Questions.length||0)+(topic.knowledgeCheck?.type2Questions.length||0);if(!count)issues.push({severity:'warning',path:`content.topics.${topicIndex}.knowledgeCheck`,message:`${topic.title} has no topic-level Check Your Knowledge questions`})});
    if(!value.content.chapterPractice)issues.push({severity:'warning',path:'content.chapterPractice',message:'Flat Chapter Practice is missing'});
    const topicIds=new Set(value.content.topics.map(topic=>topic.id)),subtopicIds=new Set(value.content.topics.filter(isStructuredTopic).flatMap((topic:any)=>topic.subtopics.map((subtopic:any)=>subtopic.id)));
    chapterPracticeQuestions(value.content).forEach((question,index)=>{if(!question.topicId||!topicIds.has(question.topicId))issues.push({severity:'error',path:`content.chapterPractice.questions.${index}.topicId`,message:`${question.id} needs a valid internal topicId`});if(!question.subtopicId||!subtopicIds.has(question.subtopicId))issues.push({severity:'error',path:`content.chapterPractice.questions.${index}.subtopicId`,message:`${question.id} needs a valid internal subtopicId`})});
  }
  const pageIds=pages.map(page=>page.id),questionIds=allQuestions.map(question=>question.id);
  if(new Set(pageIds).size!==pageIds.length)issues.push({severity:'error',path:'content.topics',message:'Learning Page IDs must be unique within the Chapter'});
  if(new Set(questionIds).size!==questionIds.length)issues.push({severity:'error',path:'content',message:'Knowledge Check, Chapter Practice and assessment Question IDs must be unique within the Chapter'});
  const referencedMedia=new Set([value.content.mediaRefs,...value.content.topics.flatMap((t:any)=>t.mediaRefs),...pages.flatMap(page=>[...page.mediaRefs,...(page.blocks||[]).filter(block=>block.type==='image').map(block=>block.mediaRef)]),...concepts.flatMap(c=>[...c.mediaRefs,...c.explanation.mediaRefs,...c.flashCards.flatMap(x=>x.mediaRefs),...c.learningCards.flatMap(x=>x.mediaRefs),...c.workedExamples.flatMap(x=>x.mediaRefs),...c.type1Questions.flatMap(x=>x.mediaRefs),...c.type2Questions.flatMap(x=>[...x.mediaRefs,...x.steps.flatMap(s=>[...s.mediaRefs,...s.answerMediaRefs,...s.explanationMediaRefs])])]),...allQuestions.flatMap(question=>[...(question.mediaRefs||[]),...(question.steps||[]).flatMap((step:any)=>[...(step.mediaRefs||[]),...(step.answerMediaRefs||[]),...(step.explanationMediaRefs||[])])])].flat());
  const suppliedMedia=new Set(value.mediaManifest.map(item=>item.fileName)); referencedMedia.forEach(file=>{if(!suppliedMedia.has(file))issues.push({severity:'warning',path:'mediaManifest',message:`Referenced image ${file} is missing from the media manifest`})});
  return {success:!issues.some(issue=>issue.severity==='error'),data:value,issues,summary:{topics:value.content.topics.length,pages:pages.length,concepts:concepts.length,learningCards:concepts.reduce((n,c)=>n+c.learningCards.length+c.flashCards.length,0),type1Questions:type1.length,type2Questions:type2.length,knowledgeCheckQuestions:chapterKnowledgeQuestions(value.content).length,chapterPracticeQuestions:chapterPracticeQuestions(value.content).length,cycleTestQuestions:value.cycleTest.questionIds.length,media:value.mediaManifest.length}};
}
