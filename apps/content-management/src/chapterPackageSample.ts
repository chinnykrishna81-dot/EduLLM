import { sampleCourse } from './sample';

const content={...sampleCourse.chapters[0],id:'cbse10-science-chemical-reactions',birdsEyeSummary:{title:'Chapter Summary',overview:'Chemical reactions transform reactants into products by rearranging atoms. The chapter connects observable evidence, balanced equations, reaction types, oxidation-reduction and their everyday effects.',bigPicture:'Observe the change → identify reactants and products → write the skeletal equation → balance atoms → classify the reaction → connect energy and electron/oxygen transfer.',keyIdeas:['Atoms are rearranged, never created or destroyed.','Balanced equations obey conservation of mass.','Reaction patterns help predict products and exam steps.'],topicConnections:['Observable changes provide evidence; equations represent the same change symbolically.','Combination, decomposition, displacement and double displacement organise recurring reaction patterns.'],formulaSheet:[{label:'General reaction','formula':'Reactants → Products','note':'Conditions are written above or below the arrow.'}],examFocus:['Balance before classifying an equation.','Include physical states and reaction conditions when requested.'],recallChecklist:['Can I identify evidence of a reaction?','Can I balance an equation systematically?','Can I recognise the reaction pattern?'],mediaRefs:['reaction-overview.svg']}};
export const chapterPackageSample={
  schemaVersion:'2.0',packageType:'chapter',
  chapter:{stableId:'cbse10-science-chemical-reactions',title:content.title,description:content.description,boardTags:['CBSE'],gradeTags:['10'],subjectTags:['Science'],language:'English',syllabusVersion:'CBSE 2026-27',estimatedStudyMinutes:180},
  content,
  cycleTest:{title:'Chemical Reactions — Cycle Test',durationMinutes:40,totalMarks:30,resultDelayHours:24,retakeAfterDays:30,mastery:{greenPercent:90,yellowPercent:60},blueprint:[{topicId:'topic-1',minimumQuestions:2,marks:30,patternIds:['pattern-observe']}],questionIds:['t1-1','t2-1']},
  mediaManifest:[
    {fileName:'reaction-overview.svg',title:'Chemical reaction overview',altText:'Reactants rearrange to form products while atoms are conserved.',caption:'Atoms rearrange during a chemical reaction.',placementHint:'Chapter and concept overview'},
    {fileName:'burning-magnesium.svg',title:'Burning magnesium',altText:'Magnesium ribbon burning with a bright white flame.',caption:'Magnesium reacts with oxygen to form magnesium oxide.',placementHint:'Worked example and Type 2 question'},
    {fileName:'gas-evolution.svg',title:'Gas evolution',altText:'Bubbles forming in a test tube during a reaction.',caption:'Gas bubbles can be evidence of a new product.',placementHint:'Type 1 question'}
  ],
  references:[],generationNotes:{generatedBy:'ChatGPT master protocol sample',generatedAt:'2026-07-21',reviewedBy:''}
} as const;
