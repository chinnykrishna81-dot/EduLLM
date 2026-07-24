import { describe, expect, it } from 'vitest';
import { validateCoursePackage } from '@edullm/content-schema';
import { sampleCourse } from './sample';

describe('comprehensive sample course', () => {
  it('contains every MVP content type and passes validation', () => {
    const result = validateCoursePackage(sampleCourse);
    expect(result.success).toBe(true);
    const concept = result.data!.chapters[0].topics[0].concepts[0];
    expect(concept.flashCards.length).toBeGreaterThan(0);
    expect(concept.learningCards.length).toBeGreaterThan(0);
    expect(concept.workedExamples.length).toBeGreaterThan(0);
    expect(concept.questionPatterns.length).toBeGreaterThan(0);
    expect(concept.type1Questions.length).toBeGreaterThan(0);
    expect(concept.type2Questions.length).toBeGreaterThan(0);
    expect(concept.type2Questions[0].steps.some(step => step.mediaRefs.length > 0)).toBe(true);
  });
});
