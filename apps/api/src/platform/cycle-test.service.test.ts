import {beforeEach, describe, expect, it, vi} from 'vitest';

const {dbQuery, clientQuery, release, connect} = vi.hoisted(() => {
  const dbQuery = vi.fn(), clientQuery = vi.fn(), release = vi.fn();
  return {dbQuery, clientQuery, release, connect:vi.fn(async () => ({query:clientQuery, release}))};
});

vi.mock('../db/database', () => ({
  query: dbQuery,
  pool: {connect}
}));

import {CycleTestService} from './cycle-test.service';

const forms = Array.from({length: 8}, (_, index) => ({number:index+1,status:'approved',sections:[{sectionId:'s1',questionIds:['q1']}]}));
const test = {title:'Cycle Test',durationMinutes:40,totalMarks:1,resultDelayHours:24,retakeAfterDays:30,repeatFromForm:6,mastery:{greenPercent:80,yellowPercent:50},sections:[{id:'s1',title:'MCQ',questionType:'type1',marksPerQuestion:1}],questionBank:[{id:'q1',type:'type1',topicId:'t1',marks:1,question:'Q?',options:['A','B'],correctAnswer:'A',explanation:'Because A'}],forms};
const configRow = {title:'Chapter',content:{topics:[{id:'t1',title:'Topic 1'}]},cycle_test:test};

describe('CycleTestService attempt lifecycle',()=>{
  beforeEach(()=>{dbQuery.mockReset();clientQuery.mockReset();release.mockReset();connect.mockClear();dbQuery.mockImplementation(async (sql:string)=>sql.startsWith('SELECT title,content,cycle_test')?{rowCount:1,rows:[configRow]}:{rowCount:0,rows:[]})});

  it('resumes the same in-progress attempt without resetting its deadline',async()=>{
    const row={attempt_id:'attempt-1',attempt_number:1,form_number:1,status:'in_progress',started_at:'2026-11-09T06:00:00Z',deadline_at:'2099-11-09T06:40:00Z',answers:{q1:'A'},review_questions:{},snapshot:{title:'Cycle Test',totalMarks:1,durationMinutes:40,retakeAfterDays:30,sections:[]}};
    clientQuery.mockImplementation(async (sql:string)=>sql.startsWith('SELECT * FROM cycle_test_attempt')?{rowCount:1,rows:[row]}:{rowCount:0,rows:[]});
    const value=await new CycleTestService().start('student-1','chapter-1');
    expect(value).toMatchObject({attemptId:'attempt-1',status:'in_progress',deadlineAt:'2099-11-09T06:40:00.000Z',answers:{q1:'A'}});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).startsWith('INSERT INTO cycle_test_attempt'))).toBe(false);
  });

  it('rejects a retake before the configured unlock time',async()=>{
    const row={attempt_id:'attempt-1',attempt_number:1,status:'submitted',submitted_at:new Date(Date.now()-86_400_000).toISOString()};
    clientQuery.mockImplementation(async (sql:string)=>sql.startsWith('SELECT * FROM cycle_test_attempt')?{rowCount:1,rows:[row]}:{rowCount:0,rows:[]});
    await expect(new CycleTestService().start('student-1','chapter-1')).rejects.toMatchObject({response:{message:'Cycle Test is locked until the retake date'}});
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  it('uses Form 1 again for Attempt 6 when repeatFromForm is 6',async()=>{
    const previous={attempt_id:'attempt-5',attempt_number:5,status:'submitted',submitted_at:'2020-01-01T00:00:00Z'};
    const inserted={attempt_id:'attempt-6',attempt_number:6,form_number:1,status:'in_progress',started_at:'2026-11-09T06:00:00Z',deadline_at:'2026-11-09T06:40:00Z',answers:{},review_questions:{},snapshot:{title:'Cycle Test',totalMarks:1,durationMinutes:40,retakeAfterDays:30,sections:[]}};
    clientQuery.mockImplementation(async (sql:string,values?:any[])=>{
      if(sql.startsWith('SELECT * FROM cycle_test_attempt'))return {rowCount:1,rows:[previous]};
      if(sql.startsWith('INSERT INTO cycle_test_attempt')){expect(values?.[4]).toBe(1);return {rowCount:1,rows:[inserted]}}
      return {rowCount:0,rows:[]};
    });
    const value=await new CycleTestService().start('student-1','chapter-1');
    expect(value).toMatchObject({attemptNumber:6,formNumber:1});
  });

  it('allows an admin reset to remove only the selected student and chapter attempts',async()=>{
    dbQuery.mockImplementation(async (sql:string,values?:any[])=>{
      if(sql.includes('FROM app_user'))return {rowCount:1,rows:[{display_name:'Pilot Student',email:'student@example.com',role:'student'}]};
      if(sql.includes('FROM chapter_library'))return {rowCount:1,rows:[{title:'Real Numbers'}]};
      if(sql.startsWith('DELETE FROM cycle_test_attempt')){expect(values).toEqual(['student-1','chapter-1']);return {rowCount:2,rows:[{attempt_id:'a1'},{attempt_id:'a2'}]}}
      return {rowCount:0,rows:[]};
    });
    await expect(new CycleTestService().adminReset('student-1','chapter-1')).resolves.toMatchObject({reset:true,attemptsRemoved:2,studentName:'Pilot Student',chapterTitle:'Real Numbers'});
  });

  it('auto-submits an expired attempt when its status is requested',async()=>{
    const expired={attempt_id:'expired-1',attempt_number:1,form_number:1,status:'in_progress',started_at:'2020-01-01T00:00:00Z',deadline_at:'2020-01-01T00:40:00Z',answers:{q1:'A'},review_questions:{},snapshot:{...test,sections:[{...test.sections[0],questions:[test.questionBank[0]]}]}};
    const submitted={...expired,status:'submitted',submitted_at:'2026-11-09T06:00:00Z',result_available_at:'2099-11-10T06:00:00Z',score:1,total_marks:1,topic_scores:[{topicId:'t1',score:1,total:1,percent:100,status:'green'}]};
    dbQuery.mockImplementation(async (sql:string)=>sql.startsWith('SELECT * FROM cycle_test_attempt')?{rowCount:1,rows:[expired]}:{rowCount:0,rows:[]});
    clientQuery.mockImplementation(async (sql:string)=>{
      if(sql.includes('FOR UPDATE'))return {rowCount:1,rows:[expired]};
      if(sql.startsWith('UPDATE cycle_test_attempt'))return {rowCount:1,rows:[submitted]};
      return {rowCount:0,rows:[]};
    });
    const value=await new CycleTestService().status('student-1','chapter-1');
    expect(value.attempt).toMatchObject({status:'submitted',result:null});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).startsWith('UPDATE cycle_test_attempt'))).toBe(true);
  });

  it('manually submits once and stores the valuation',async()=>{
    const active={attempt_id:'active-1',attempt_number:1,form_number:1,status:'in_progress',started_at:'2026-11-09T06:00:00Z',deadline_at:'2099-11-09T06:40:00Z',answers:{q1:'A'},review_questions:{},snapshot:{...test,sections:[{...test.sections[0],questions:[test.questionBank[0]]}]}};
    const submitted={...active,status:'submitted',submitted_at:'2026-11-09T06:10:00Z',result_available_at:'2099-11-10T06:10:00Z',score:1,total_marks:1,topic_scores:[{topicId:'t1',score:1,total:1,percent:100,status:'green'}]};
    dbQuery.mockImplementation(async (sql:string)=>sql.startsWith('SELECT attempt_id')?{rowCount:1,rows:[{attempt_id:'active-1'}]}:{rowCount:0,rows:[]});
    clientQuery.mockImplementation(async (sql:string,values?:any[])=>{
      if(sql.includes('FOR UPDATE'))return {rowCount:1,rows:[active]};
      if(sql.startsWith('UPDATE cycle_test_attempt')){expect(values?.slice(2,4)).toEqual([1,1]);return {rowCount:1,rows:[submitted]}}
      return {rowCount:0,rows:[]};
    });
    await expect(new CycleTestService().submit('student-1','chapter-1','active-1')).resolves.toMatchObject({status:'submitted',result:null});
  });

  it('reveals results only after the configured publication time',()=>{
    const service:any=new CycleTestService(),base={attempt_id:'a1',attempt_number:1,form_number:1,status:'submitted',started_at:'2026-11-09T06:00:00Z',deadline_at:'2026-11-09T06:40:00Z',submitted_at:'2026-11-09T06:20:00Z',answers:{},review_questions:{},score:8,total_marks:10,topic_scores:[{topicId:'t1',percent:80,status:'green'}],snapshot:{title:'Cycle Test',totalMarks:10,durationMinutes:40,retakeAfterDays:30,sections:[]}};
    expect(service.response({...base,result_available_at:'2099-01-01T00:00:00Z'},true).result).toBeNull();
    expect(service.response({...base,result_available_at:'2020-01-01T00:00:00Z'},true).result).toMatchObject({score:8,totalMarks:10,percent:80});
  });

  it('keeps the latest published mastery while a newer result is pending',async()=>{
    const pending={attempt_id:'a2',attempt_number:2,form_number:2,status:'submitted',started_at:'2026-11-10T06:00:00Z',deadline_at:'2026-11-10T06:40:00Z',submitted_at:'2026-11-10T06:20:00Z',result_available_at:'2099-01-01T00:00:00Z',answers:{},review_questions:{},score:0,total_marks:1,topic_scores:[{topicId:'t1',percent:0,status:'orange'}],snapshot:{title:'Cycle Test',totalMarks:1,durationMinutes:40,retakeAfterDays:30,sections:[]}};
    const published={...pending,attempt_id:'a1',attempt_number:1,form_number:1,result_available_at:'2020-01-01T00:00:00Z',score:1,topic_scores:[{topicId:'t1',topicTitle:'Topic 1',score:1,total:1,percent:100,status:'green'}]};
    dbQuery.mockImplementation(async (sql:string)=>sql.includes("result_available_at<=now()")?{rowCount:1,rows:[published]}:sql.startsWith('SELECT * FROM cycle_test_attempt')?{rowCount:1,rows:[pending]}:{rowCount:0,rows:[]});
    const value=await new CycleTestService().status('student-1','chapter-1');
    expect(value.attempt?.result).toBeNull();
    expect(value.mastery).toEqual({t1:'green'});
    expect(value.history).toHaveLength(1);
  });
});
