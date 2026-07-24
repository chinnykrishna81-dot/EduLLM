import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
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
import {ContentBaseController} from './content-base/content-base.controller';
import {ContentBaseService} from './content-base/content-base.service';

@Module({ controllers: [HealthController, CoursesController, MediaController, PlatformController, AuthController,QuestionBankController,ContentBaseController], providers: [CoursesService, MediaService, PlatformService, AuthService,QuestionBankService,ContentBaseService,{provide:APP_GUARD,useClass:AuthGuard}] })
export class AppModule {}
