// AI unit curriculum config for Maths Year 3 — Place Value
export const AI_MATHS_Y3 = {
  id: 'maths:y3:place-value',

  // NEW: metadata the UI can use
  subject: 'maths',
  year: 3,
  topic: 'place-value',
  title: 'Place Value',
  desc: 'Numbers to 1,000, number lines and rounding.',

  steps: [
    {
      id: 'pv-step-1',
      label: 'Step 1',
      objectiveId: 'pv-y3-1',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'pv-step-2',
      label: 'Step 2',
      objectiveId: 'pv-y3-2',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'pv-step-3',
      label: 'Step 3',
      objectiveId: 'pv-y3-3',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'pv-step-4',
      label: 'Step 4 · Hundreds, tens and ones',
      objectiveId: 'y3_place_value_3digit_htos_partition',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'pv-step-5',
      label: 'Step 5 · Counting in 4s, 8s, 50s and 100s',
      objectiveId: 'y3_place_value_count_multiples_4_8_50_100',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'pv-step-6',
      label: 'Step 6 · 10 or 100 more or less',
      objectiveId: 'y3_place_value_10_100_more_less',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'pv-step-7',
      label: 'Step 7 · Compare and order to 1000',
      objectiveId: 'y3_place_value_compare_order_1000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'pv-step-8',
      label: 'Step 8 · Read, write and represent numbers',
      objectiveId: 'y3_place_value_read_write_represent_1000',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 7
    },
    {
      id: 'pv-step-9',
      label: 'Step 9 · Place value word problems',
      objectiveId: 'y3_place_value_solve_problems',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};


// Central lookup of all AI units (extend as you add more)
export const AI_UNITS = {
  maths: {
    3: {
      'place-value': AI_MATHS_Y3
      // later:
      // 'addition-subtraction': AI_MATHS_Y3_ADD_SUB,
      // 'multiplication-division': AI_MATHS_Y3_MULT_DIV,
      // ...
    }
  },

  english: {
    // e.g. 3: { 'reading': AI_ENGLISH_Y3_READING }
  }
};
