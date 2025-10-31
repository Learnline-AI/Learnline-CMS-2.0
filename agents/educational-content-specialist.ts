import type { UserPromptSubmitHook } from '@anthropic/claude-code';

/**
 * Educational Content Specialist Agent
 * Provides NCERT curriculum expertise, pedagogical validation, and educational quality assurance
 */

// NCERT Mathematics Curriculum Knowledge Base
const NCERT_MATH_PROGRESSION = {
  'class-6': {
    topics: ['whole-numbers', 'integers', 'fractions', 'decimals', 'basic-geometry', 'mensuration'],
    complexity: 'foundational',
    prerequisites: ['number-recognition', 'basic-operations'],
    vocabulary_level: 'simple',
    attention_span_minutes: 15
  },
  'class-7': {
    topics: ['integers', 'fractions-decimals', 'data-handling', 'simple-equations', 'lines-angles', 'triangle-properties'],
    complexity: 'building',
    prerequisites: ['class-6-completion'],
    vocabulary_level: 'basic-technical',
    attention_span_minutes: 20
  },
  'class-8': {
    topics: ['rational-numbers', 'linear-equations', 'quadrilaterals', 'data-handling', 'factorization', 'introduction-graphs'],
    complexity: 'intermediate',
    prerequisites: ['class-7-completion'],
    vocabulary_level: 'technical',
    attention_span_minutes: 25
  },
  'class-9': {
    topics: ['number-systems', 'polynomials', 'coordinate-geometry', 'euclid-geometry', 'areas-surface-areas', 'statistics-probability'],
    complexity: 'advanced',
    prerequisites: ['class-8-completion'],
    vocabulary_level: 'advanced-technical',
    attention_span_minutes: 30
  },
  'class-10': {
    topics: ['real-numbers', 'polynomials', 'pair-linear-equations', 'quadratic-equations', 'arithmetic-progressions', 'triangles', 'coordinate-geometry', 'trigonometry', 'areas-volumes', 'statistics-probability'],
    complexity: 'pre-secondary',
    prerequisites: ['class-9-completion'],
    vocabulary_level: 'formal-mathematical',
    attention_span_minutes: 35
  }
};

// Educational Component Selection Guidelines
const COMPONENT_PEDAGOGICAL_MAPPING = {
  'concept-introduction': ['heading', 'definition', 'hero-number'],
  'visual-explanation': ['four-pictures', 'three-pictures', 'two-pictures', 'three-svgs'],
  'step-by-step-learning': ['step-sequence', 'worked-example'],
  'reinforcement': ['memory-trick', 'callout-box'],
  'content-delivery': ['paragraph'],
  'assessment-prep': ['worked-example', 'step-sequence'],
  'real-world-connection': ['hero-number', 'callout-box', 'two-pictures']
};

// Age-Appropriate Vocabulary Guidelines
const VOCABULARY_GUIDELINES = {
  'class-6-7': {
    avoid: ['complex-mathematical-jargon', 'abstract-concepts', 'formal-proofs'],
    prefer: ['simple-words', 'everyday-examples', 'visual-analogies'],
    sentence_length: 'short',
    examples: 'concrete'
  },
  'class-8-9': {
    avoid: ['overly-formal-language', 'advanced-theorems'],
    prefer: ['building-technical-vocabulary', 'structured-explanations'],
    sentence_length: 'medium',
    examples: 'mix-concrete-abstract'
  },
  'class-10': {
    avoid: ['university-level-concepts'],
    prefer: ['formal-mathematical-language', 'precise-definitions'],
    sentence_length: 'varied',
    examples: 'abstract-with-applications'
  }
};

// Assessment Integration Patterns
const ASSESSMENT_PATTERNS = {
  'formative': {
    components: ['worked-example', 'step-sequence'],
    frequency: 'within-lesson',
    purpose: 'understanding-check'
  },
  'summative': {
    components: ['worked-example', 'callout-box'],
    frequency: 'end-of-topic',
    purpose: 'mastery-verification'
  },
  'self-assessment': {
    components: ['memory-trick', 'callout-box'],
    frequency: 'student-driven',
    purpose: 'reflection-consolidation'
  }
};

interface EducationalContext {
  gradeLevel?: string;
  topic?: string;
  learningObjective?: string;
  prerequisiteTopics?: string[];
  assessmentType?: string;
  contentType?: string;
}

interface EducationalValidation {
  isAgeAppropriate: boolean;
  curriculumAlignment: string;
  pedagogicalSuitability: string;
  componentRecommendations: string[];
  vocabularyIssues: string[];
  improvementSuggestions: string[];
}

export const educationalContentSpecialist: UserPromptSubmitHook = {
  name: 'Educational Content Specialist',

  async run({ prompt, responseStream }) {
    // Activation triggers for educational content work
    const educationalTriggers = [
      'math', 'mathematics', 'student', 'curriculum', 'grade', 'NCERT',
      'learning', 'educational', 'pedagogy', 'age-appropriate', 'lesson',
      'class-6', 'class-7', 'class-8', 'class-9', 'class-10',
      'fractions', 'algebra', 'geometry', 'trigonometry', 'statistics'
    ];

    const componentCreationTriggers = [
      'component', 'create component', 'add component', 'new component',
      'PDF', 'vision AI', 'extract', 'generate content'
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check if educational specialist should activate
    const hasEducationalTriggers = educationalTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    const hasComponentWork = componentCreationTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    if (!hasEducationalTriggers && !hasComponentWork) {
      return { shouldContinue: true };
    }

    // Extract educational context from prompt
    const educationalContext = extractEducationalContext(prompt);

    // Provide educational expertise
    let message = '📚 **Educational Content Specialist Activated**\n\n';

    if (educationalContext.gradeLevel) {
      message += await provideGradeLevelGuidance(educationalContext);
    }

    if (hasComponentWork) {
      message += await providePedagogicalComponentGuidance(educationalContext);
    }

    message += await provideCurriculumAlignmentGuidance(educationalContext);
    message += await provideAssessmentIntegrationGuidance(educationalContext);
    message += await provideVocabularyGuidance(educationalContext);

    message += '\n📋 **Educational Quality Checklist**:\n';
    message += '- [ ] Content appropriate for target grade level\n';
    message += '- [ ] Mathematical concepts build progressively\n';
    message += '- [ ] Examples relate to student experiences\n';
    message += '- [ ] Vocabulary matches cognitive development\n';
    message += '- [ ] Assessment opportunities integrated\n';
    message += '- [ ] Visual aids support learning objectives\n\n';

    message += '🎯 **NCERT Alignment**: Ensure content follows prescribed learning progression\n';
    message += '📖 **Pedagogical Pattern**: Use appropriate component types for learning stage\n\n';

    await responseStream.sendSystemMessage(message);

    return {
      shouldContinue: true,
      data: {
        educationalContext,
        activationType: 'educational-content-specialist',
        recommendations: await generateEducationalRecommendations(educationalContext)
      }
    };
  }
};

function extractEducationalContext(prompt: string): EducationalContext {
  const context: EducationalContext = {};

  // Extract grade level
  const gradeMatch = prompt.match(/class[- ]?(\d+)|grade[- ]?(\d+)|(\d+)th[- ]?class/i);
  if (gradeMatch) {
    const gradeNum = gradeMatch[1] || gradeMatch[2] || gradeMatch[3];
    context.gradeLevel = `class-${gradeNum}`;
  }

  // Extract mathematical topics
  const mathTopics = [
    'fractions', 'decimals', 'integers', 'whole-numbers', 'rational-numbers',
    'algebra', 'equations', 'polynomials', 'geometry', 'trigonometry',
    'mensuration', 'statistics', 'probability', 'coordinate-geometry'
  ];

  for (const topic of mathTopics) {
    if (prompt.toLowerCase().includes(topic)) {
      context.topic = topic;
      break;
    }
  }

  // Extract learning objectives
  const objectiveKeywords = ['learn', 'understand', 'master', 'practice', 'apply'];
  for (const keyword of objectiveKeywords) {
    if (prompt.toLowerCase().includes(keyword)) {
      context.learningObjective = keyword;
      break;
    }
  }

  // Extract content type
  const contentTypes = ['explanation', 'example', 'exercise', 'assessment', 'review'];
  for (const type of contentTypes) {
    if (prompt.toLowerCase().includes(type)) {
      context.contentType = type;
      break;
    }
  }

  return context;
}

async function provideGradeLevelGuidance(context: EducationalContext): Promise<string> {
  const gradeInfo = NCERT_MATH_PROGRESSION[context.gradeLevel!];
  if (!gradeInfo) {
    return '⚠️ **Grade Level**: Unable to identify specific grade level\n\n';
  }

  let guidance = `🎓 **${context.gradeLevel?.toUpperCase()} Guidance**:\n`;
  guidance += `- **Complexity Level**: ${gradeInfo.complexity}\n`;
  guidance += `- **Attention Span**: ${gradeInfo.attention_span_minutes} minutes max\n`;
  guidance += `- **Vocabulary**: ${gradeInfo.vocabulary_level}\n`;
  guidance += `- **Key Topics**: ${gradeInfo.topics.join(', ')}\n`;
  guidance += `- **Prerequisites**: ${gradeInfo.prerequisites.join(', ')}\n\n`;

  return guidance;
}

async function providePedagogicalComponentGuidance(context: EducationalContext): Promise<string> {
  let guidance = '🎯 **Pedagogical Component Selection**:\n\n';

  // Map learning objective to appropriate components
  if (context.contentType === 'explanation') {
    guidance += '**For Explanations**: Use `definition` + `paragraph` + visual components\n';
    guidance += '- `definition`: Key mathematical terms\n';
    guidance += '- `three-pictures` or `four-pictures`: Visual progression\n';
    guidance += '- `paragraph`: Detailed explanation with examples\n\n';
  }

  if (context.contentType === 'example') {
    guidance += '**For Examples**: Use `worked-example` + supporting visuals\n';
    guidance += '- `worked-example`: Step-by-step problem solving\n';
    guidance += '- `two-pictures`: Before/after or problem/solution\n';
    guidance += '- `callout-box`: Important tips or warnings\n\n';
  }

  if (context.topic === 'fractions') {
    guidance += '**For Fractions**: Emphasize visual representations\n';
    guidance += '- `hero-number`: Fraction visualization with pie charts\n';
    guidance += '- `three-svgs`: Different fraction representations\n';
    guidance += '- `memory-trick`: "Bigger denominator = smaller pieces"\n\n';
  }

  guidance += '📝 **Component Selection Priority**:\n';
  guidance += '1. Visual components for abstract concepts\n';
  guidance += '2. Step-by-step components for procedures\n';
  guidance += '3. Memory tricks for retention\n';
  guidance += '4. Worked examples for application\n\n';

  return guidance;
}

async function provideCurriculumAlignmentGuidance(context: EducationalContext): Promise<string> {
  let guidance = '📚 **NCERT Curriculum Alignment**:\n\n';

  if (context.gradeLevel && context.topic) {
    const gradeInfo = NCERT_MATH_PROGRESSION[context.gradeLevel];
    if (gradeInfo && gradeInfo.topics.includes(context.topic)) {
      guidance += `✅ **Topic Alignment**: ${context.topic} is appropriate for ${context.gradeLevel}\n`;
    } else {
      guidance += `⚠️ **Topic Concern**: ${context.topic} may be advanced for ${context.gradeLevel}\n`;
    }
  }

  guidance += '**Curriculum Checklist**:\n';
  guidance += '- [ ] Topic appears in NCERT syllabus for target grade\n';
  guidance += '- [ ] Prerequisites covered in earlier chapters\n';
  guidance += '- [ ] Complexity appropriate for cognitive development\n';
  guidance += '- [ ] Connects to future learning objectives\n\n';

  return guidance;
}

async function provideAssessmentIntegrationGuidance(context: EducationalContext): Promise<string> {
  let guidance = '📊 **Assessment Integration**:\n\n';

  guidance += '**Formative Assessment** (during learning):\n';
  guidance += '- Use `worked-example` components for practice\n';
  guidance += '- Include `step-sequence` for process verification\n';
  guidance += '- Add `callout-box` for self-check questions\n\n';

  guidance += '**Summative Assessment** (end of topic):\n';
  guidance += '- Design `worked-example` components as test prep\n';
  guidance += '- Create comprehensive problem sets\n';
  guidance += '- Include real-world application problems\n\n';

  return guidance;
}

async function provideVocabularyGuidance(context: EducationalContext): Promise<string> {
  let guidance = '📝 **Age-Appropriate Vocabulary**:\n\n';

  if (context.gradeLevel) {
    const gradeCategory = getVocabularyCategory(context.gradeLevel);
    const vocabGuidelines = VOCABULARY_GUIDELINES[gradeCategory];

    if (vocabGuidelines) {
      guidance += `**For ${context.gradeLevel}**:\n`;
      guidance += `- **Avoid**: ${vocabGuidelines.avoid.join(', ')}\n`;
      guidance += `- **Prefer**: ${vocabGuidelines.prefer.join(', ')}\n`;
      guidance += `- **Sentence Length**: ${vocabGuidelines.sentence_length}\n`;
      guidance += `- **Examples**: ${vocabGuidelines.examples}\n\n`;
    }
  }

  guidance += '**Vocabulary Best Practices**:\n';
  guidance += '- Define mathematical terms when first introduced\n';
  guidance += '- Use consistent terminology throughout content\n';
  guidance += '- Provide examples before abstract definitions\n';
  guidance += '- Connect new terms to familiar concepts\n\n';

  return guidance;
}

function getVocabularyCategory(gradeLevel: string): string {
  if (gradeLevel.includes('6') || gradeLevel.includes('7')) {
    return 'class-6-7';
  } else if (gradeLevel.includes('8') || gradeLevel.includes('9')) {
    return 'class-8-9';
  } else {
    return 'class-10';
  }
}

async function generateEducationalRecommendations(context: EducationalContext): Promise<string[]> {
  const recommendations: string[] = [];

  if (context.gradeLevel) {
    const gradeInfo = NCERT_MATH_PROGRESSION[context.gradeLevel];
    if (gradeInfo) {
      recommendations.push(`Maintain ${gradeInfo.complexity} complexity level`);
      recommendations.push(`Limit content to ${gradeInfo.attention_span_minutes} minutes`);
      recommendations.push(`Use ${gradeInfo.vocabulary_level} vocabulary`);
    }
  }

  if (context.topic) {
    recommendations.push(`Ensure ${context.topic} prerequisites are met`);
    recommendations.push(`Connect to real-world applications of ${context.topic}`);
  }

  if (context.contentType === 'explanation') {
    recommendations.push('Start with visual representations before abstract concepts');
    recommendations.push('Use concrete examples before generalizations');
  }

  return recommendations;
}