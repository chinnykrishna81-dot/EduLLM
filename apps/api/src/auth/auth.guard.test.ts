import {UnauthorizedException} from '@nestjs/common';
import {describe,expect,it,vi} from 'vitest';
import {AuthGuard} from './auth.guard';

const contextFor=(request:any)=>({switchToHttp:()=>({getRequest:()=>request})}) as any;

describe('AuthGuard catalogue access',()=>{
  it('allows public catalogue reads without a session',async()=>{
    const auth={session:vi.fn()} as any;
    const guard=new AuthGuard(auth);
    await expect(guard.canActivate(contextFor({method:'GET',url:'/api/catalogue/courses',headers:{}}))).resolves.toBe(true);
    expect(auth.session).not.toHaveBeenCalled();
  });

  it('requires and attaches a user for enrolment',async()=>{
    const user={id:'student-1',role:'student'};
    const auth={session:vi.fn().mockResolvedValue(user)} as any;
    const request={method:'POST',url:'/api/catalogue/courses/course-1/enrol',headers:{authorization:'Bearer token-1'}};
    const guard=new AuthGuard(auth);
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toMatchObject({user,authToken:'token-1'});
  });

  it('rejects unauthenticated enrolment',async()=>{
    const auth={session:vi.fn().mockResolvedValue(null)} as any;
    const guard=new AuthGuard(auth);
    await expect(guard.canActivate(contextFor({method:'POST',url:'/api/catalogue/courses/course-1/enrol',headers:{}}))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
