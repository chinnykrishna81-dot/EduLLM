import {describe, expect, it} from 'vitest';
import {evaluateCycleTest, formIndexForAttempt, resultAvailableAt, retakeUnlockAt, sanitizeQuestionForAttempt} from './cycle-test.rules';

const snapshot = {mastery:{greenPercent:80,yellowPercent:50},sections:[{marksPerQuestion:1,questions:[
  {id:'mcq-1',type:'type1',topicId:'algebra',topicTitle:'Algebra',marks:2,correctAnswer:'x = 2'},
  {id:'guided-1',type:'type2',topicId:'geometry',topicTitle:'Geometry',totalMarks:4,steps:[{id:'step-1',answer:'Pythagoras',marks:1},{id:'step-2',answer:'5 cm',marks:3}]},
  {id:'guided-2',type:'type2',patternId:'numbers',totalMarks:2,steps:[{id:'step-a',answer:'2'},{id:'step-b',answer:'3'}]}
]}]};

describe('Cycle Test rules',()=>{
  it('values Type 1 and Type 2 partial marks and topic mastery',()=>{
    const result=evaluateCycleTest(snapshot,{'mcq-1':' X = 2. ','guided-1':{'step-1':'Pythagoras','step-2':'wrong'},'guided-2':{'step-a':'2','step-b':'wrong'}});
    expect(result).toMatchObject({score:4,total:8});
    expect(result.topics).toEqual([
      {topicId:'algebra',topicTitle:'Algebra',score:2,total:2,percent:100,status:'green'},
      {topicId:'geometry',topicTitle:'Geometry',score:1,total:4,percent:25,status:'orange'},
      {topicId:'numbers',topicTitle:'numbers',score:1,total:2,percent:50,status:'yellow'}
    ]);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({questionId:'mcq-1',studentAnswer:' X = 2. ',correctAnswer:'x = 2',correct:true,earned:2,marks:2});
    expect(result.items[1]).toMatchObject({questionId:'guided-1',earned:1,marks:4,steps:[{id:'step-1',correct:true},{id:'step-2',correct:false}]});
  });
  it('uses configured thresholds at exact boundaries',()=>{const result=evaluateCycleTest({...snapshot,mastery:{greenPercent:100,yellowPercent:25}},{'mcq-1':'x = 2','guided-1':{'step-1':'Pythagoras'}});expect(result.topics.map(topic=>topic.status)).toEqual(['green','yellow','orange'])});
  it('rotates every form by default and honours an earlier repeat point',()=>{
    expect(Array.from({length:10},(_,i)=>formIndexForAttempt(i+1,8))).toEqual([0,1,2,3,4,5,6,7,0,1]);
    expect(Array.from({length:10},(_,i)=>formIndexForAttempt(i+1,8,6))).toEqual([0,1,2,3,4,0,1,2,3,4]);
  });
  it('calculates publication and retake times from submission',()=>{const submitted=new Date('2026-11-09T06:00:00.000Z');expect(resultAvailableAt(submitted,24).toISOString()).toBe('2026-11-10T06:00:00.000Z');expect(retakeUnlockAt(submitted,30).toISOString()).toBe('2026-12-09T06:00:00.000Z')});
  it('removes solutions recursively from the student attempt payload',()=>{
    const safe=sanitizeQuestionForAttempt({id:'q1',question:'Solve',options:['1','2'],correctAnswer:'2',explanation:'Reason',steps:[{id:'s1',prompt:'Step',answer:'2',markingScheme:{solution:'2'},options:['1','2']}],metadata:{model_answer:'2'}});
    expect(safe).toEqual({id:'q1',question:'Solve',options:['1','2'],steps:[{id:'s1',prompt:'Step',options:['1','2']}],metadata:{}});
  });
});
