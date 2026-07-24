import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
@Controller()
export class AuthController{
  constructor(@Inject(AuthService) private readonly auth:AuthService){}
  @Post('auth/login')login(@Body() body:any){return this.auth.login(body)}
  @Get('auth/me')me(@Req() req:any){return req.user}
  @Post('auth/logout')logout(@Req() req:any){return this.auth.logout(req.authToken)}
  @Post('auth/change-password')changePassword(@Req() req:any,@Body() body:any){return this.auth.changePassword(req.user.id,String(body.currentPassword||''),String(body.newPassword||''))}
  @Get('users')list(){return this.auth.list()}
  @Post('users')create(@Req() req:any,@Body() body:any){return this.auth.create(body,req.user.id)}
  @Patch('users/:id/status/:status')status(@Param('id') id:string,@Param('status') status:string){return this.auth.status(id,status)}
  @Post('users/:id/reset-password')reset(@Param('id') id:string,@Body() body:any){return this.auth.reset(id,String(body.password||''))}
}
