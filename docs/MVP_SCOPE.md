# EduLLM Lean MVP Scope

## Outcome

Enable teachers to create reusable chapters and subjects, enable an administrator to package them into a commercial course, and deliver that course to students with saved mastery progress.

## Must have

### Content Management

- Admin/teacher authentication
- Reusable chapter/topic/concept content library
- Chapter Cycle Tests
- Subject creation with ordered units and reusable chapter references
- Unit/Semester Tests and Subject Final Exam
- Reusable Exam Kits with configurable previous/model papers
- Course configuration from approved subjects and exam kits
- Subscription, pricing, discount, and validity metadata
- ChatGPT JSON paste/import
- Clear validation and import preview
- Batch image upload and filename matching
- Editors for explanations, cards, examples, and questions
- Student-view preview
- Draft/published version separation
- Publish and unpublish
- Basic teacher assignment
- Basic enrolment/access administration

### Student Learning

- Student registration/login
- Course catalogue and details
- Enrolment/subscription access check
- My Courses
- Subject/unit/chapter/topic navigation
- Explanation and image rendering
- Flash Cards and Learning Cards
- Type 1 practice with explanations
- Type 2 guided steps with feedback and marks
- Personal topic/chapter mastery indicators (green/yellow/red/grey)
- Progress, completion, and resume

### Platform

- One modular backend
- PostgreSQL
- Object/file storage
- Four assignable roles: Organisation Admin, Teacher/Instructor, Academic Reviewer, Student
- Basic audit fields
- Payment-provider abstraction
- Automated tests for the critical business flow
- Local Docker environment and AWS staging

## Should have after first validated release

- Course coupons
- Teacher dashboards
- Student score summaries
- Course completion certificate
- Basic search
- Email notifications
- Content import history
- Basic operational reporting

## Not in MVP

- Full enterprise specification workflows
- Configurable validation/rules engine
- Multi-stage academic review
- Microservices or Kubernetes
- Local or in-app LLM generation
- Semantic/vector search
- Native mobile apps
- Adaptive learning
- Advanced reports or analytics
- LMS/SIS integrations
- Real-time collaborative authoring

## MVP success test

One teacher must be able to create/reuse a chapter, place it in a subject unit, and attach the required assessments. One admin must be able to package approved subjects and an optional exam kit into a priced course and publish it. One student must be able to obtain access, learn, complete practice and tests, return later, and see correct personalized mastery indicators.
