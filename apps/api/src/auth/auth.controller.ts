import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
@Controller()
export class AuthController{
  constructor(@Inject(AuthService) private readonly auth:AuthService){}
  @Post('auth/login')login(@Body() body:any){return this.auth.login(body)}
  @Get('auth/google') google(@Res() res:any){return res.redirect(this.auth.googleUrl())}
  @Get('auth/google/callback') async googleCallback(@Req() req:any,@Res() res:any){try{const result=await this.auth.googleCallback(String(req.query.code||''));res.redirect(`http://localhost:5176/?google_token=${encodeURIComponent(result.token)}`)}catch(error:any){res.redirect(`http://localhost:5176/?google_error=${encodeURIComponent(error.message||'Google sign-in failed')}`)}}
  @Post('auth/register')register(@Body() body:any){return this.auth.register(body)}
  @Get('auth/me')me(@Req() req:any){return req.user}
  @Patch('auth/profile')profile(@Req() req:any,@Body() body:any){return this.auth.updateProfile(req.user.id,body)}
  @Post('auth/logout')logout(@Req() req:any){return this.auth.logout(req.authToken)}
  @Post('auth/change-password')changePassword(@Req() req:any,@Body() body:any){return this.auth.changePassword(req.user.id,String(body.currentPassword||''),String(body.newPassword||''),body.provider==='google')}
  @Get('users')list(){return this.auth.list()}
  @Post('users')create(@Req() req:any,@Body() body:any){return this.auth.create(body,req.user.id)}
  @Patch('users/:id/status/:status')status(@Param('id') id:string,@Param('status') status:string){return this.auth.status(id,status)}
  @Patch('users/:id/login-id')loginId(@Param('id') id:string,@Body() body:any){return this.auth.setLoginId(id,String(body.loginId||''))}
  @Post('users/:id/reset-password')reset(@Param('id') id:string,@Body() body:any){return this.auth.reset(id,String(body.password||''))}
  @Delete('users/:id')delete(@Param('id') id:string){return this.auth.deleteUser(id)}
}
