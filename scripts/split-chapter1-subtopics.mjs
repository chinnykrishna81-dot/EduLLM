import fs from 'node:fs';

const file='content-packages/cbse-10-science/chemical-reactions-and-equations/chapter.json';
const chapter=JSON.parse(fs.readFileSync(file,'utf8'));
const index=chapter.content.topics.findIndex(topic=>topic.id==='cre-t2-equations');
if(index<0){console.log('Chapter 1 equation Subtopics are already split.');process.exit(0)}
const source=chapter.content.topics[index],concept=source.concepts[0];
const select=(items,ids)=>items.filter(item=>ids.includes(item.id));
const base=(id,title,code,description,overrides)=>({...source,id,title,syllabusCode:code,description,concepts:[{...concept,id:`${id}-concept`,title,learningObjectives:overrides.learningObjectives||concept.learningObjectives,learningCards:select(concept.learningCards,overrides.learningCards||[]),flashCards:select(concept.flashCards,overrides.flashCards||[]),workedExamples:select(concept.workedExamples,overrides.workedExamples||[]),type1Questions:select(concept.type1Questions,overrides.type1Questions||[]),type2Questions:select(concept.type2Questions,overrides.type2Questions||[])}]});
const replacements=[
  base('cre-t2-writing','1.1.1 Writing a Chemical Equation','1.1.1','Translate word descriptions into informative skeletal equations using correct formulae, state symbols and reaction conditions.',{learningCards:['cre-l2-2'],flashCards:['cre-f2-3'],type1Questions:['cre-pr2-3','cre-pr2-7','cre-pr2-8']}),
  base('cre-t2-balanced','1.1.2 Balanced Chemical Equations','1.1.2','Understand why equations must be balanced and how coefficients preserve formulae while satisfying conservation of mass.',{flashCards:['cre-f2-1','cre-f2-2'],type1Questions:['cre-pr2-1','cre-pr2-2','cre-pr2-5','cre-pr2-6','cre-pr2-9']}),
  base('cre-t2-balancing-steps','1.1.3 Steps to Balance a Chemical Equation','1.1.3','Apply the inspection method systematically: protect formulae, count atoms, choose coefficients and verify the smallest whole-number ratio.',{learningCards:['cre-l2-1','cre-l2-b1','cre-l2-b2','cre-l2-b3','cre-l2-b4','cre-l2-b5','cre-l2-b6'],workedExamples:['cre-w2-1'],type2Questions:['cre-pr2-4']})
];
chapter.content.topics.splice(index,1,...replacements);
for(const item of chapter.cycleTest?.blueprint||[])if(item.topicId==='cre-t2-equations')item.topicId='cre-t2-balanced';
fs.writeFileSync(file,`${JSON.stringify(chapter,null,2)}\n`);
console.log('Split 1.1 into introduction plus Subtopics 1.1.1, 1.1.2 and 1.1.3.');
