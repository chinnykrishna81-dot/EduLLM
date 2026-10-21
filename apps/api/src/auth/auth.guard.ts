import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req=context.switchToHttp().getRequest(),path=String(req.originalUrl||req.url).split('?')[0];
    const publicCatalogue=req.method==='GET'&&path.includes('/catalogue/')&&!path.endsWith('/access')&&!path.includes('/cycle-test/');
    if(path.endsWith('/auth/login')||path.includes('/auth/google')||path.endsWith('/auth/register')||path.includes('/health')||publicCatalogue||path.includes('/content/')||path.includes('/docs'))return true;
    const header=String(req.headers.authorization||''),token=header.startsWith('Bearer ')?header.slice(7):'',user=await this.auth.session(token);
    if(!user)throw new UnauthorizedException('Please sign in');
    req.user=user;req.authToken=token;
    if(user.role==='admin')return true;
    if(user.role==='reviewer'){
      const chapterRoute=/^\/api\/library\/chapters(?:\/[^/]+(?:\/(?:media|cycle-test|review-audit|review-decision|status\/[^/]+))?)?$/.test(path)||/^\/api\/library\/chapters\/[^/]+\/review-items(?:\/[^/]+)?$/.test(path);
      const replaceImage=/^\/api\/library\/chapters\/[^/]+\/media\/[^/]+\/replace$/.test(path);
      const allowed=chapterRoute||replaceImage||/^\/api\/question-bank\/chapters\/[^/]+$/.test(path)||path.endsWith('/auth/me')||path.endsWith('/auth/logout')||path.endsWith('/auth/change-password');
      if(!allowed)throw new ForbiddenException('Reviewer access is limited to assigned chapters');
      return true;
    }
    if(path.includes('/users')||path.includes('/offerings')||path.includes('/media-explorer')||/^\/api\/courses(?:\/|$)/.test(path)||path.includes('/ai-settings')||path.includes('/ai-analyse'))throw new ForbiddenException('Admin access required');
    if(req.method==='DELETE'&&/^\/api\/subjects\/[^/]+$/.test(path))throw new ForbiddenException('Admin access required to delete a subject');
    if(req.method==='PATCH'&&path.endsWith('/status/approved'))throw new ForbiddenException('Admin approval required');
    return true;
  }
}
