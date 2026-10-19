import { Module } from '@nestjs/common';
import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { PlatformController } from './platform/platform.controller';
import { PlatformService } from './platform/platform.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import {QuestionBankController} from './question-bank/question-bank.controller';
import {QuestionBankService} from './question-bank/question-bank.service';

@Module({ controllers: [CoursesController, MediaController, PlatformController, AuthController,QuestionBankController], providers: [CoursesService, MediaService, PlatformService, AuthService,QuestionBankService,{provide:APP_GUARD,useClass:AuthGuard}] })
export class AppModule {}
