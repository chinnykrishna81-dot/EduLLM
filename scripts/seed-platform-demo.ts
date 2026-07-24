import { sampleCourse } from '../apps/content-management/src/sample';

const api='http://localhost:3001/api';
async function request(path:string,options:RequestInit={}) { const response=await fetch(`${api}${path}`,{...options,headers:{'content-type':'application/json',...(options.headers||{})}}); const body=await response.json().catch(()=>({})); if(!response.ok) throw new Error(`${path}: ${JSON.stringify(body)}`); return body; }

async function main(){
  const existingChapters:any[]=await request('/library/chapters');
  let chapter=existingChapters.find(x=>x.title===sampleCourse.chapters[0].title);
  if(!chapter){ chapter=await request('/library/chapters',{method:'POST',body:JSON.stringify({title:sampleCourse.chapters[0].title,description:sampleCourse.chapters[0].description,boardTags:['CBSE'],gradeTags:['10'],subjectTags:['Science'],content:sampleCourse.chapters[0]})}); }
  if(chapter.status!=='approved'){ if(chapter.status==='draft') chapter=await request(`/library/chapters/${chapter.id}/status/in_review`,{method:'PATCH'}); chapter=await request(`/library/chapters/${chapter.id}/status/approved`,{method:'PATCH'}); }

  const existingSubjects:any[]=await request('/subjects');
  let subject=existingSubjects.find(x=>x.code==='CBSE10-SCIENCE');
  if(!subject) subject=await request('/subjects',{method:'POST',body:JSON.stringify({title:'CBSE Class 10 Science',code:'CBSE10-SCIENCE',board:'CBSE',grade:'10',academicYear:'2026-27',description:'Condensed Science concepts, patterns and exam preparation.'})});
  if(!subject.units.length) subject=await request(`/subjects/${subject.id}/units`,{method:'POST',body:JSON.stringify({title:'Chemical World',description:'Chemical change, reactions and equations.'})});
  if(!subject.units[0].chapters.some((x:any)=>x.id===chapter.id)) subject=await request(`/subjects/${subject.id}/units/${subject.units[0].id}/chapters`,{method:'POST',body:JSON.stringify({chapterId:chapter.id})});
  if(subject.status!=='approved'){ if(subject.status==='draft') subject=await request(`/subjects/${subject.id}/status/in_review`,{method:'PATCH'}); subject=await request(`/subjects/${subject.id}/status/approved`,{method:'PATCH'}); }

  const existingCourses:any[]=await request('/offerings');
  let course=existingCourses.find(x=>x.title==='CBSE Class 10 Science — Go Green');
  if(!course) course=await request('/offerings',{method:'POST',body:JSON.stringify({title:'CBSE Class 10 Science — Go Green',description:'Condensed concepts, pattern-led practice and disciplined exam preparation.',listPrice:3999,discountPercent:25,validityDays:365,subscriptionType:'one_time'})});
  if(!course.subjects.some((x:any)=>x.id===subject.id)) course=await request(`/offerings/${course.id}/subjects`,{method:'PUT',body:JSON.stringify({subjectIds:[subject.id]})});
  if(course.status!=='published') course=await request(`/offerings/${course.id}/publish`,{method:'POST'});
  console.log(JSON.stringify({chapter:{id:chapter.id,status:chapter.status},subject:{id:subject.id,status:subject.status},course:{id:course.id,status:course.status}},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
