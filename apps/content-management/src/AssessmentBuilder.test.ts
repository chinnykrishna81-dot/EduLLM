import {describe,expect,it} from 'vitest';
import {expandConfiguredFormRepeats} from './AssessmentBuilder';

const forms=Array.from({length:8},(_,index)=>({number:index+1,status:'draft',sections:[{sectionId:'s1',questionIds:[`q${index+1}`]}]}));

describe('configured cycle-test form repetition',()=>{
  it('keeps every generated form when no repeat point is selected',()=>{
    expect(expandConfiguredFormRepeats(forms,8,0).map(form=>form.sections[0].questionIds[0])).toEqual(['q1','q2','q3','q4','q5','q6','q7','q8']);
  });

  it('restarts from Form 1 at the selected form number',()=>{
    const result=expandConfiguredFormRepeats(forms.slice(0,5),8,6);
    expect(result.map(form=>form.sections[0].questionIds[0])).toEqual(['q1','q2','q3','q4','q5','q1','q2','q3']);
    expect(result.slice(5).map(form=>form.repeatedFrom)).toEqual([1,2,3]);
  });
});
