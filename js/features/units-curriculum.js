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

// AI unit curriculum config for Maths Year 3 — Addition & Subtraction
export const AI_MATHS_Y3_ADD_SUB = {
  id: 'maths:y3:addition-subtraction',

  subject: 'maths',
  year: 3,
  topic: 'addition-subtraction',
  title: 'Addition & Subtraction',
  desc: 'Mental strategies, column methods and problem solving.',

  steps: [
    {
      id: 'as-step-1',
      label: 'Step 1 · Number bonds and bridging',
      objectiveId: 'y3_add_sub_number_bonds_bridge_10_100',
      topic: 'addition-subtraction',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'as-step-2',
      label: 'Step 2 · +/- 1s, 10s and 100s',
      objectiveId: 'y3_add_sub_3digit_mental_1s_10s_100s',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'as-step-3',
      label: 'Step 3 · 3-digit +/- 3-digit (no exchange)',
      objectiveId: 'y3_add_sub_3digit_column_no_exchange',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'as-step-4',
      label: 'Step 4 · 3-digit +/- 3-digit (with exchange)',
      objectiveId: 'y3_add_sub_3digit_column_with_exchange',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'as-step-5',
      label: 'Step 5 · +/- multiples of 10 and 100',
      objectiveId: 'y3_add_sub_multiples_10_100',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'as-step-6',
      label: 'Step 6 · Use inverse to check',
      objectiveId: 'y3_add_sub_inverse_check',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 5
    },
    {
      id: 'as-step-7',
      label: 'Step 7 · One-step word problems',
      objectiveId: 'y3_add_sub_solve_1step_problems',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'as-step-8',
      label: 'Step 8 · Two-step and missing number problems',
      objectiveId: 'y3_add_sub_solve_2step_problems',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 3 — Multiplication & Division
export const AI_MATHS_Y3_MULT_DIV = {
  id: 'maths:y3:multiplication-division',

  subject: 'maths',
  year: 3,
  topic: 'multiplication-division',
  title: 'Multiplication & Division',
  desc: 'Times tables, related facts and scaling problems.',

  steps: [
    {
      id: 'md-step-1',
      label: 'Step 1 · Recall 2, 5 and 10 times tables',
      objectiveId: 'y3_mult_div_recall_2_5_10',
      topic: 'multiplication-division',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'md-step-2',
      label: 'Step 2 · Recall 3, 4 and 8 times tables',
      objectiveId: 'y3_mult_div_recall_3_4_8',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'md-step-3',
      label: 'Step 3 · Multiply using known facts (within 100)',
      objectiveId: 'y3_mult_div_multiply_within_100_facts',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'md-step-4',
      label: 'Step 4 · Arrays and number lines for multiplication',
      objectiveId: 'y3_mult_div_arrays_and_number_lines',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'md-step-5',
      label: 'Step 5 · 2-digit × 1-digit (no exchange)',
      objectiveId: 'y3_mult_div_2digit_times_1digit_no_exchange',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'md-step-6',
      label: 'Step 6 · 2-digit × 1-digit (with exchange)',
      objectiveId: 'y3_mult_div_2digit_times_1digit_with_exchange',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'md-step-7',
      label: 'Step 7 · Divide using known facts (within 100)',
      objectiveId: 'y3_mult_div_divide_within_100_facts',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'md-step-8',
      label: 'Step 8 · Division with remainders',
      objectiveId: 'y3_mult_div_division_with_remainders',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'md-step-9',
      label: 'Step 9 · Scaling and correspondence problems',
      objectiveId: 'y3_mult_div_scaling_and_correspondence_problems',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 3 — Fractions
export const AI_MATHS_Y3_FRACTIONS = {
  id: 'maths:y3:fractions',

  subject: 'maths',
  year: 3,
  topic: 'fractions',
  title: 'Fractions',
  desc: 'Unit/non-unit fractions, tenths and equivalent fractions.',

  steps: [
    {
      id: 'fr-step-1',
      label: 'Step 1 · Unit fractions of shapes',
      objectiveId: 'y3_fractions_unit_fractions_of_shapes',
      topic: 'fractions',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'fr-step-2',
      label: 'Step 2 · Unit fractions of sets',
      objectiveId: 'y3_fractions_unit_fractions_of_sets',
      topic: 'fractions',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'fr-step-3',
      label: 'Step 3 · Non-unit fractions of shapes and sets',
      objectiveId: 'y3_fractions_non_unit_fractions_shapes_sets',
      topic: 'fractions',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'fr-step-4',
      label: 'Step 4 · Count up and down in tenths',
      objectiveId: 'y3_fractions_count_in_tenths',
      topic: 'fractions',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'fr-step-5',
      label: 'Step 5 · Fractions on a number line',
      objectiveId: 'y3_fractions_number_line_0_1_10',
      topic: 'fractions',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'fr-step-6',
      label: 'Step 6 · Equivalent fractions with diagrams',
      objectiveId: 'y3_fractions_equivalent_using_diagrams',
      topic: 'fractions',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'fr-step-7',
      label: 'Step 7 · Compare and order fractions',
      objectiveId: 'y3_fractions_compare_order_same_denominator',
      topic: 'fractions',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'fr-step-8',
      label: 'Step 8 · Add and subtract fractions',
      objectiveId: 'y3_fractions_add_sub_same_denominator',
      topic: 'fractions',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'fr-step-9',
      label: 'Step 9 · Fraction of a quantity',
      objectiveId: 'y3_fractions_fraction_of_quantity',
      topic: 'fractions',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 3 — Measurement
export const AI_MATHS_Y3_MEASUREMENT = {
  id: 'maths:y3:measurement',

  subject: 'maths',
  year: 3,
  topic: 'measurement',
  title: 'Measurement',
  desc: 'Length, perimeter, mass, capacity, money and time.',

  steps: [
    {
      id: 'me-step-1',
      label: 'Step 1 · Measure and compare lengths',
      objectiveId: 'y3_measurement_length_mm_cm_m_compare',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'me-step-2',
      label: 'Step 2 · Add and subtract lengths',
      objectiveId: 'y3_measurement_add_sub_lengths',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'me-step-3',
      label: 'Step 3 · Perimeter of simple 2D shapes',
      objectiveId: 'y3_measurement_perimeter_rectilinear',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'me-step-4',
      label: 'Step 4 · Measure and compare mass',
      objectiveId: 'y3_measurement_mass_g_kg_compare',
      topic: 'measurement',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'me-step-5',
      label: 'Step 5 · Measure and compare capacity',
      objectiveId: 'y3_measurement_capacity_ml_l_compare',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'me-step-6',
      label: 'Step 6 · Pounds and pence',
      objectiveId: 'y3_measurement_money_convert_pounds_pence',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'me-step-7',
      label: 'Step 7 · Add and subtract money; change',
      objectiveId: 'y3_measurement_money_add_sub_change',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'me-step-8',
      label: 'Step 8 · Tell time to the nearest 5 minutes',
      objectiveId: 'y3_measurement_time_nearest_5_minutes',
      topic: 'measurement',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'me-step-9',
      label: 'Step 9 · Tell time to the nearest minute',
      objectiveId: 'y3_measurement_time_nearest_minute_12_24hr',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'me-step-10',
      label: 'Step 10 · Compare durations and time problems',
      objectiveId: 'y3_measurement_time_compare_durations_problems',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 3 — Shape
export const AI_MATHS_Y3_SHAPE = {
  id: 'maths:y3:shape',

  subject: 'maths',
  year: 3,
  topic: 'shape',
  title: 'Shape',
  desc: '2D and 3D shape properties, angles and lines.',

  steps: [
    {
      id: 'sh-step-1',
      label: 'Step 1 · Recognise and name 2D shapes',
      objectiveId: 'y3_shape_recognise_name_2d',
      topic: 'shape',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'sh-step-2',
      label: 'Step 2 · Recognise and describe 3D shapes',
      objectiveId: 'y3_shape_recognise_describe_3d',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'sh-step-3',
      label: 'Step 3 · Draw 2D shapes accurately',
      objectiveId: 'y3_shape_draw_2d_with_ruler',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'sh-step-4',
      label: 'Step 4 · Right angles in shapes',
      objectiveId: 'y3_shape_right_angles_in_shapes',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'sh-step-5',
      label: 'Step 5 · Angles greater or less than a right angle',
      objectiveId: 'y3_shape_compare_angles_to_right_angle',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'sh-step-6',
      label: 'Step 6 · Horizontal and vertical lines',
      objectiveId: 'y3_shape_horizontal_vertical_lines',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'sh-step-7',
      label: 'Step 7 · Parallel and perpendicular lines',
      objectiveId: 'y3_shape_parallel_perpendicular_lines',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'sh-step-8',
      label: 'Step 8 · Sort shapes by properties',
      objectiveId: 'y3_shape_sort_classify_by_properties',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'sh-step-9',
      label: 'Step 9 · Shape reasoning problems',
      objectiveId: 'y3_shape_reasoning_problems',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 3 — Statistics
export const AI_MATHS_Y3_STATISTICS = {
  id: 'maths:y3:statistics',

  subject: 'maths',
  year: 3,
  topic: 'statistics',
  title: 'Statistics',
  desc: 'Tally charts, pictograms, bar charts and two-step questions.',

  steps: [
    {
      id: 'st-step-1',
      label: 'Step 1 · Read tally charts and tables',
      objectiveId: 'y3_statistics_read_tally_charts_tables',
      topic: 'statistics',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'st-step-2',
      label: 'Step 2 · Read pictograms (keys 1, 2, 5)',
      objectiveId: 'y3_statistics_read_pictograms_keys',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'st-step-3',
      label: 'Step 3 · Read bar charts (scales in 1s, 2s, 5s, 10s)',
      objectiveId: 'y3_statistics_read_bar_charts_scales',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'st-step-4',
      label: 'Step 4 · Draw pictograms from data',
      objectiveId: 'y3_statistics_draw_pictograms',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'st-step-5',
      label: 'Step 5 · Draw bar charts from data',
      objectiveId: 'y3_statistics_draw_bar_charts',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'st-step-6',
      label: 'Step 6 · One-step questions using charts',
      objectiveId: 'y3_statistics_solve_1step_questions',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'st-step-7',
      label: 'Step 7 · Two-step questions using charts',
      objectiveId: 'y3_statistics_solve_2step_questions',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};


// AI unit curriculum config for Maths Year 4 — Place Value
export const AI_MATHS_Y4_PLACE_VALUE = {
  id: 'maths:y4:place-value',

  subject: 'maths',
  year: 4,
  topic: 'place-value',
  title: 'Place Value',
  desc: '4-digit place value, counting in multiples, rounding, negatives and Roman numerals.',

  steps: [
    {
      id: 'y4-pv-step-1',
      label: 'Step 1 · Count in multiples of 6, 7, 9, 25 and 1,000',
      objectiveId: 'Y4_PV_Count_Multiples_6_7_9_25_1000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-2',
      label: 'Step 2 · 1,000 more or less than a given number',
      objectiveId: 'Y4_PV_1000_More_Less',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-3',
      label: 'Step 3 · Recognise place value in 4-digit numbers',
      objectiveId: 'Y4_PV_4Digit_PlaceValue',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-4',
      label: 'Step 4 · Read and write numbers to 10,000',
      objectiveId: 'Y4_PV_10000_ReadWrite',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'y4-pv-step-5',
      label: 'Step 5 · Compare and order numbers beyond 1,000',
      objectiveId: 'Y4_PV_CompareOrder_10000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-6',
      label: 'Step 6 · Round numbers to the nearest 10 and 100',
      objectiveId: 'Y4_PV_Round_10_100',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-7',
      label: 'Step 7 · Round numbers to the nearest 1,000',
      objectiveId: 'Y4_PV_Round_1000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-8',
      label: 'Step 8 · Use negative numbers in context',
      objectiveId: 'Y4_PV_NegativeNumbers',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-pv-step-9',
      label: 'Step 9 · Read Roman numerals to 100 (I to C)',
      objectiveId: 'Y4_PV_RomanNumerals_100',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};
// AI unit curriculum config for Maths Year 4 — Addition & Subtraction
export const AI_MATHS_Y4_ADD_SUB = {
id: 'maths:y4:addition-subtraction',

subject: 'maths',
year: 4,
topic: 'addition-subtraction',
title: 'Addition & Subtraction',
desc: 'Mental strategies, column methods and problem solving with 4-digit numbers.',

steps: [
{
id: 'y4-as-step-1',
label: 'Step 1 · Recall and use number bonds within 1,000',
objectiveId: 'Y4_AS_NumberBonds_1000',
topic: 'addition-subtraction',
defaultBand: 'support',
targetQuestions: 5
},
{
id: 'y4-as-step-2',
label: 'Step 2 · Mental +/- 1s, 10s, 100s and 1,000s',
objectiveId: 'Y4_AS_Mental_1s_10s_100s_1000s',
topic: 'addition-subtraction',
defaultBand: 'core',
targetQuestions: 5
},
{
id: 'y4-as-step-3',
label: 'Step 3 · 4-digit + 4-digit (no exchange)',
objectiveId: 'Y4_AS_4Digit_Add_NoExchange',
topic: 'addition-subtraction',
defaultBand: 'core',
targetQuestions: 6
},
{
id: 'y4-as-step-4',
label: 'Step 4 · 4-digit + 4-digit (with exchange)',
objectiveId: 'Y4_AS_4Digit_Add_WithExchange',
topic: 'addition-subtraction',
defaultBand: 'core',
targetQuestions: 6
},
{
id: 'y4-as-step-5',
label: 'Step 5 · 4-digit − 4-digit (no exchange)',
objectiveId: 'Y4_AS_4Digit_Sub_NoExchange',
topic: 'addition-subtraction',
defaultBand: 'core',
targetQuestions: 6
},
{
id: 'y4-as-step-6',
label: 'Step 6 · 4-digit − 4-digit (with exchange)',
objectiveId: 'Y4_AS_4Digit_Sub_WithExchange',
topic: 'addition-subtraction',
defaultBand: 'core',
targetQuestions: 6
},
{
id: 'y4-as-step-7',
label: 'Step 7 · Estimate answers and use inverse to check',
objectiveId: 'Y4_AS_Estimate_Inverse',
topic: 'addition-subtraction',
defaultBand: 'stretch',
targetQuestions: 5
},
{
id: 'y4-as-step-8',
label: 'Step 8 · Solve one- and two-step addition and subtraction problems',
objectiveId: 'Y4_AS_Solve_Problems',
topic: 'addition-subtraction',
defaultBand: 'stretch',
targetQuestions: 7
}
]
};

// AI unit curriculum config for Maths Year 4 — Multiplication & Division
export const AI_MATHS_Y4_MULT_DIV = {
  id: 'maths:y4:multiplication-division',

  subject: 'maths',
  year: 4,
  topic: 'multiplication-division',
  title: 'Multiplication & Division',
  desc: 'Times tables to 12×12, written methods, remainders and problem solving.',

  steps: [
    {
      id: 'y4-md-step-1',
      label: 'Step 1 · Recall multiplication and division facts up to 12×12',
      objectiveId: 'Y4_MD_Recall_Facts_12x12',
      topic: 'multiplication-division',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y4-md-step-2',
      label: 'Step 2 · Use place value and known facts for × and ÷',
      objectiveId: 'Y4_MD_Derived_Facts_PlaceValue',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'y4-md-step-3',
      label: 'Step 3 · 2-digit × 1-digit (short multiplication)',
      objectiveId: 'Y4_MD_2Digit_Times_1Digit_NoExchange',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-md-step-4',
      label: 'Step 4 · 3-digit × 1-digit (with exchange)',
      objectiveId: 'Y4_MD_3Digit_Times_1Digit_WithExchange',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-md-step-5',
      label: 'Step 5 · 2-digit ÷ 1-digit (with and without remainders)',
      objectiveId: 'Y4_MD_2Digit_Divide_1Digit',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-md-step-6',
      label: 'Step 6 · 3-digit ÷ 1-digit with remainders',
      objectiveId: 'Y4_MD_3Digit_Divide_1Digit_Remainders',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y4-md-step-7',
      label: 'Step 7 · Scaling problems (× and ÷)',
      objectiveId: 'Y4_MD_Scaling_Problems',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 7
    },
    {
      id: 'y4-md-step-8',
      label: 'Step 8 · Correspondence problems (e.g. n objects for m people)',
      objectiveId: 'Y4_MD_Correspondence_Problems',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 4 — Fractions & Decimals
export const AI_MATHS_Y4_FRACTIONS = {
  id: 'maths:y4:fractions',

  subject: 'maths',
  year: 4,
  topic: 'fractions',
  title: 'Fractions & Decimals',
  desc: 'Equivalent fractions, hundredths, adding fractions and simple decimals.',

  steps: [
    {
      id: 'y4-fr-step-1',
      label: 'Step 1 · Recognise equivalent fractions using diagrams and number lines',
      objectiveId: 'Y4_FR_EquivalentFractions_Visual',
      topic: 'fractions',
      defaultBand: 'support',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate simple equivalent fraction questions where pupils give a fraction answer like 1/2 or 3/4.',
        exampleSkills: ['recognise equivalent fractions', 'write fractions using numerator and denominator']
      },
      targetQuestions: 5
    },
    {
      id: 'y4-fr-step-2',
      label: 'Step 2 · Generate and use families of equivalent fractions',
      objectiveId: 'Y4_FR_EquivalentFractions_Numeric',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to complete or match equivalent fractions, e.g. 1/2 = ?/4.',
        exampleSkills: ['generate equivalent fractions', 'simplify fractions']
      },
      targetQuestions: 6
    },
    {
      id: 'y4-fr-step-3',
      label: 'Step 3 · Count up and down in hundredths',
      objectiveId: 'Y4_FR_Hundredths_Counting',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Create counting sequences in tenths and hundredths where answers are written as fractions or decimals.',
        exampleSkills: ['count in hundredths', 'link fractions and decimals']
      },
      targetQuestions: 5
    },
    {
      id: 'y4-fr-step-4',
      label: 'Step 4 · Add and subtract fractions with the same denominator',
      objectiveId: 'Y4_FR_AddSubtract_SameDen',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use fraction equations like 3/8 + 2/8 = ? where the answer is a fraction.',
        exampleSkills: ['add fractions with same denominator', 'subtract fractions with same denominator']
      },
      targetQuestions: 6
    },
    {
      id: 'y4-fr-step-5',
      label: 'Step 5 · Find fractions of quantities',
      objectiveId: 'Y4_FR_FractionOfQuantity',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Pose word problems like “Find 3/5 of 20” where the answer may be a whole number or a fraction.',
        exampleSkills: ['find fraction of a quantity', 'link fractions to multiplication and division']
      },
      targetQuestions: 6
    },
    {
      id: 'y4-fr-step-6',
      label: 'Step 6 · Decimal equivalents for 1/2, 1/4, 3/4 and tenths/hundredths',
      objectiveId: 'Y4_FR_Decimal_Equivalents',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to convert between simple fractions and decimals such as 1/4 = 0.25.',
        exampleSkills: ['convert fractions to decimals', 'convert decimals to fractions']
      },
      targetQuestions: 6
    },
    {
      id: 'y4-fr-step-7',
      label: 'Step 7 · Compare and order decimals (1 and 2 decimal places)',
      objectiveId: 'Y4_FR_Decimals_Compare_Order',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use decimal comparisons and number lines where pupils input decimal answers like 0.6 or 1.25.',
        exampleSkills: ['compare decimals', 'order decimals on a number line']
      },
      targetQuestions: 7
    }
  ]
};


// AI unit curriculum config for Maths Year 4 — Measurement
export const AI_MATHS_Y4_MEASUREMENT = {
  id: 'maths:y4:measurement',

  subject: 'maths',
  year: 4,
  topic: 'measurement',
  title: 'Measurement',
  desc: 'Length, mass, time, perimeter, area and word problems.',

  steps: [
    {
      id: 'y4-me-step-1',
      label: 'Step 1 · Convert between units of length and mass',
      objectiveId: 'Y4_ME_Convert_Length_Mass',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-me-step-2',
      label: 'Step 2 · Convert between units of time',
      objectiveId: 'Y4_ME_Convert_Time',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-me-step-3',
      label: 'Step 3 · Perimeter of rectilinear shapes',
      objectiveId: 'Y4_ME_Perimeter_Rectilinear',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-me-step-4',
      label: 'Step 4 · Area by counting squares',
      objectiveId: 'Y4_ME_Area_Count_Squares',
      topic: 'measurement',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y4-me-step-5',
      label: 'Step 5 · Solve word problems involving measures and money',
      objectiveId: 'Y4_ME_Solve_Problems_Measure',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 4 — Shape & Position
export const AI_MATHS_Y4_SHAPE = {
  id: 'maths:y4:shape',

  subject: 'maths',
  year: 4,
  topic: 'shape',
  title: 'Shape & Position',
  desc: 'Classifying shapes, angles, symmetry and coordinates in the first quadrant.',

  steps: [
    {
      id: 'y4-sh-step-1',
      label: 'Step 1 · Identify properties of triangles and quadrilaterals',
      objectiveId: 'Y4_SH_QuadrilateralsTriangles',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-sh-step-2',
      label: 'Step 2 · Identify acute, obtuse and right angles',
      objectiveId: 'Y4_SH_Angles_Acute_Obtuse_Right',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-sh-step-3',
      label: 'Step 3 · Compare and order angles by size',
      objectiveId: 'Y4_SH_Compare_Order_Angles',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y4-sh-step-4',
      label: 'Step 4 · Lines of symmetry and complete symmetrical figures',
      objectiveId: 'Y4_SH_Symmetry_CompleteFigures',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y4-sh-step-5',
      label: 'Step 5 · Plot and interpret coordinates in the first quadrant',
      objectiveId: 'Y4_SH_Coordinates',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    }
  ]
};

// AI unit curriculum config for Maths Year 4 — Statistics
export const AI_MATHS_Y4_STATISTICS = {
  id: 'maths:y4:statistics',

  subject: 'maths',
  year: 4,
  topic: 'statistics',
  title: 'Statistics',
  desc: 'Bar charts, tables, simple line graphs and problem solving.',

  steps: [
    {
      id: 'y4-st-step-1',
      label: 'Step 1 · Read and interpret bar charts and tables',
      objectiveId: 'Y4_ST_Read_BarCharts_Tables',
      topic: 'statistics',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y4-st-step-2',
      label: 'Step 2 · Draw bar charts and complete tables from data',
      objectiveId: 'Y4_ST_Draw_BarCharts_Tables',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y4-st-step-3',
      label: 'Step 3 · Solve comparison, sum and difference problems using graphs',
      objectiveId: 'Y4_ST_Solve_Problems_BarCharts',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 7
    },
    {
      id: 'y4-st-step-4',
      label: 'Step 4 · Interpret and construct simple line graphs',
      objectiveId: 'Y4_ST_InterpretLineGraphs',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    }
  ]
};



// AI unit curriculum config for Maths Year 5 — Place Value
export const AI_MATHS_Y5_PLACE_VALUE = {
  id: 'maths:y5:place-value',

  subject: 'maths',
  year: 5,
  topic: 'place-value',
  title: 'Place Value',
  desc: 'Numbers to 1,000,000, place value, rounding, sequences, negatives and Roman numerals.',

  steps: [
    {
      id: 'y5-pv-step-1',
      label: 'Step 1 · Place value in numbers to 1,000,000',
      objectiveId: 'Y5_PV_PlaceValue_6Digit',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-2',
      label: 'Step 2 · Read and write numbers to 1,000,000',
      objectiveId: 'Y5_PV_1000000_ReadWrite',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-3',
      label: 'Step 3 · Count forwards and backwards in powers of 10',
      objectiveId: 'Y5_PV_PowersOf10',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-4',
      label: 'Step 4 · Complete and describe number sequences up to 1,000,000',
      objectiveId: 'Y5_PV_NumberSequences_Up_Down',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-5',
      label: 'Step 5 · Compare and order numbers to 1,000,000',
      objectiveId: 'Y5_PV_CompareOrder_1000000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-6',
      label: 'Step 6 · Round numbers to 10, 100, 1,000, 10,000 and 100,000',
      objectiveId: 'Y5_PV_Round_10_100_1000_10000_100000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-7',
      label: 'Step 7 · Interpret and use negative numbers in context',
      objectiveId: 'Y5_PV_NegativeNumbers',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y5-pv-step-8',
      label: 'Step 8 · Read and write Roman numerals to 1,000 (M)',
      objectiveId: 'Y5_PV_RomanNumerals_UpTo_1000',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 5
    }
  ]
};

// AI unit curriculum config for Maths Year 5 — Addition & Subtraction
export const AI_MATHS_Y5_ADD_SUB = {
  id: 'maths:y5:addition-subtraction',

  subject: 'maths',
  year: 5,
  topic: 'addition-subtraction',
  title: 'Addition & Subtraction',
  desc: 'Mental strategies, written methods and multi-step problems with large numbers and decimals.',

  steps: [
    {
      id: 'y5-as-step-1',
      label: 'Step 1 · Mental strategies for addition and subtraction',
      objectiveId: 'Y5_AS_Mental_Strategies',
      topic: 'addition-subtraction',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y5-as-step-2',
      label: 'Step 2 · Add and subtract whole numbers to 1,000,000',
      objectiveId: 'Y5_AS_FormalMethods_WholeNumbers',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-as-step-3',
      label: 'Step 3 · Add and subtract numbers with more than 4 digits',
      objectiveId: 'Y5_AS_LargerNumbers',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-as-step-4',
      label: 'Step 4 · Add and subtract numbers with up to two decimal places',
      objectiveId: 'Y5_AS_Decimals_Add_Sub',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-as-step-5',
      label: 'Step 5 · Use rounding and inverse operations to estimate and check',
      objectiveId: 'Y5_AS_Estimate_Check',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 5
    },
    {
      id: 'y5-as-step-6',
      label: 'Step 6 · Solve multi-step word problems using addition and subtraction',
      objectiveId: 'Y5_AS_MultiStep_Problems',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 5 — Multiplication & Division
export const AI_MATHS_Y5_MULT_DIV = {
  id: 'maths:y5:multiplication-division',

  subject: 'maths',
  year: 5,
  topic: 'multiplication-division',
  title: 'Multiplication & Division',
  desc: 'Fluency with facts to 12×12, written methods, factors, primes and powers of 10.',

  steps: [
    {
      id: 'y5-md-step-1',
      label: 'Step 1 · Recall and use multiplication and division facts to 12×12',
      objectiveId: 'Y5_MD_Recall_Facts_12x12',
      topic: 'multiplication-division',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y5-md-step-2',
      label: 'Step 2 · Multiply up to 4-digit numbers by 1-digit',
      objectiveId: 'Y5_MD_ShortMultiplication_4digit_by_1digit',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-md-step-3',
      label: 'Step 3 · Multiply 2-digit numbers by 2-digit numbers',
      objectiveId: 'Y5_MD_LongMultiplication_2digit_by_2digit',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-md-step-4',
      label: 'Step 4 · Divide up to 4-digit numbers by 1-digit (including remainders)',
      objectiveId: 'Y5_MD_ShortDivision_4digit_by_1digit',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-md-step-5',
      label: 'Step 5 · Factors, multiples and common factors',
      objectiveId: 'Y5_MD_Factors_Multiples_Primes',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-md-step-6',
      label: 'Step 6 · Multiply and divide by 10, 100 and 1,000',
      objectiveId: 'Y5_MD_Multiply_Divide_10_100_1000',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-md-step-7',
      label: 'Step 7 · Square and cube numbers',
      objectiveId: 'Y5_MD_Square_Cube_Numbers',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 5
    }
  ]
};

// AI unit curriculum config for Maths Year 5 — Fractions, Decimals & Percentages
export const AI_MATHS_Y5_FRACTIONS = {
  id: 'maths:y5:fractions',

  subject: 'maths',
  year: 5,
  topic: 'fractions',
  title: 'Fractions, Decimals & Percentages',
  desc: 'Comparing, adding and multiplying fractions, thousandths and percentage links.',

  steps: [
    {
      id: 'y5-fr-step-1',
      label: 'Step 1 · Compare and order fractions with related denominators',
      objectiveId: 'Y5_FR_Compare_Order_RelatedDenominators',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate comparison and ordering questions with fractions such as 3/10, 7/20 and 1/2.',
        exampleSkills: ['compare fractions', 'order fractions with related denominators']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-2',
      label: 'Step 2 · Add and subtract fractions whose denominators are multiples',
      objectiveId: 'Y5_FR_Add_Sub_MultipleDenominators',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use fraction equations where denominators are multiples, e.g. 1/4 + 3/8 = ?',
        exampleSkills: ['find common denominators', 'add and subtract related fractions']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-3',
      label: 'Step 3 · Convert between improper fractions and mixed numbers',
      objectiveId: 'Y5_FR_Improper_Mixed_Convert',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to switch between forms such as 11/4 and 2 3/4.',
        exampleSkills: ['convert improper fractions', 'write mixed numbers']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-4',
      label: 'Step 4 · Multiply proper fractions and mixed numbers by whole numbers',
      objectiveId: 'Y5_FR_Multiply_By_WholeNumber',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate fraction multiplication questions like 3/5 × 4 or 1 1/2 × 3.',
        exampleSkills: ['multiply fractions by whole numbers', 'simplify results']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-5',
      label: 'Step 5 · Thousandths and decimal equivalents',
      objectiveId: 'Y5_FR_Decimals_Thousandths',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use numbers with three decimal places like 0.325 and simple fractional equivalents.',
        exampleSkills: ['read thousandths', 'convert between fractions and decimals']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-6',
      label: 'Step 6 · Read, write and compare decimals with up to 3 decimal places',
      objectiveId: 'Y5_FR_Decimals_Compare_3dp',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to compare and order decimals like 2.3, 2.35 and 2.305 on a number line.',
        exampleSkills: ['compare decimals to 3 decimal places', 'order decimals']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-7',
      label: 'Step 7 · Round decimals with 2 decimal places to whole numbers and 1 dp',
      objectiveId: 'Y5_FR_Decimals_Round_2dp',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Create rounding questions like “Round 3.47 to the nearest whole number and to 1 decimal place.”',
        exampleSkills: ['round decimals to whole numbers', 'round decimals to 1 decimal place']
      },
      targetQuestions: 6
    },
    {
      id: 'y5-fr-step-8',
      label: 'Step 8 · Percentages as fractions and decimals',
      objectiveId: 'Y5_FR_Percentages_Fraction_Decimal',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Mix percentages, fractions and decimals, e.g. 25% = ? as a fraction and as a decimal.',
        exampleSkills: ['convert percentages to fractions', 'convert percentages to decimals']
      },
      targetQuestions: 7
    }
  ]
};


// AI unit curriculum config for Maths Year 5 — Measurement
export const AI_MATHS_Y5_MEASUREMENT = {
  id: 'maths:y5:measurement',

  subject: 'maths',
  year: 5,
  topic: 'measurement',
  title: 'Measurement',
  desc: 'Converting units, perimeter, area, volume and time problems.',

  steps: [
    {
      id: 'y5-me-step-1',
      label: 'Step 1 · Convert between metric units of length, mass and capacity',
      objectiveId: 'Y5_ME_Convert_Metric',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-me-step-2',
      label: 'Step 2 · Relate metric and common imperial units',
      objectiveId: 'Y5_ME_Convert_Imperial',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y5-me-step-3',
      label: 'Step 3 · Perimeter of rectangles and composite rectilinear shapes',
      objectiveId: 'Y5_ME_Perimeter_Rectangles_Composite',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-me-step-4',
      label: 'Step 4 · Area of rectangles and compound shapes',
      objectiveId: 'Y5_ME_Area_Rectangles',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-me-step-5',
      label: 'Step 5 · Estimate and compare volume and capacity',
      objectiveId: 'Y5_ME_Volume_Capacity',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'y5-me-step-6',
      label: 'Step 6 · Solve time and timetable problems',
      objectiveId: 'Y5_ME_Time_Timetables',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 5 — Shape & Position
export const AI_MATHS_Y5_SHAPE = {
  id: 'maths:y5:shape',

  subject: 'maths',
  year: 5,
  topic: 'shape',
  title: 'Shape & Position',
  desc: 'Angles, polygons, reflection, translation and 3D nets.',

  steps: [
    {
      id: 'y5-sh-step-1',
      label: 'Step 1 · Measure and draw angles in degrees',
      objectiveId: 'Y5_SH_Measure_Draw_Angles',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-sh-step-2',
      label: 'Step 2 · Angles on a straight line and around a point',
      objectiveId: 'Y5_SH_Angles_StraightLine_Point',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-sh-step-3',
      label: 'Step 3 · Use angle facts to find missing angles in polygons',
      objectiveId: 'Y5_SH_Angles_Missing_In_Polygons',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y5-sh-step-4',
      label: 'Step 4 · Properties of regular and irregular polygons',
      objectiveId: 'Y5_SH_Polygons_Properties',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-sh-step-5',
      label: 'Step 5 · Reflection and translation on a grid',
      objectiveId: 'Y5_SH_Reflection_Translation',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-sh-step-6',
      label: 'Step 6 · Identify 3D shapes from nets and reasoning',
      objectiveId: 'Y5_SH_Nets_3D_Identify',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    }
  ]
};

// AI unit curriculum config for Maths Year 5 — Statistics
export const AI_MATHS_Y5_STATISTICS = {
  id: 'maths:y5:statistics',

  subject: 'maths',
  year: 5,
  topic: 'statistics',
  title: 'Statistics',
  desc: 'Tables, line graphs and one- and two-step data problems.',

  steps: [
    {
      id: 'y5-st-step-1',
      label: 'Step 1 · Read and interpret tables and timetables',
      objectiveId: 'Y5_ST_Read_Tables_Timetables',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-st-step-2',
      label: 'Step 2 · Read and interpret line graphs',
      objectiveId: 'Y5_ST_Read_LineGraphs',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-st-step-3',
      label: 'Step 3 · Complete tables and line graphs from given data',
      objectiveId: 'Y5_ST_Complete_Tables_Graphs',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y5-st-step-4',
      label: 'Step 4 · Solve one-step problems using tables and graphs',
      objectiveId: 'Y5_ST_Solve_1Step_Problems',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y5-st-step-5',
      label: 'Step 5 · Solve two-step problems using tables and graphs',
      objectiveId: 'Y5_ST_Solve_2Step_Problems',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};



// AI unit curriculum config for Maths Year 6 — Place Value
export const AI_MATHS_Y6_PLACE_VALUE = {
  id: 'maths:y6:place-value',

  subject: 'maths',
  year: 6,
  topic: 'place-value',
  title: 'Place Value',
  desc: 'Numbers to 10,000,000, place value, rounding, sequences and negative numbers.',

  steps: [
    {
      id: 'y6-pv-step-1',
      label: 'Step 1 · Place value in numbers to 10,000,000',
      objectiveId: 'Y6_PV_PlaceValue_7Digit',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-2',
      label: 'Step 2 · Read and write numbers to 10,000,000',
      objectiveId: 'Y6_PV_10000000_ReadWrite',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-3',
      label: 'Step 3 · Count forwards and backwards in steps and powers of 10',
      objectiveId: 'Y6_PV_NumberSequences_PowersOf10',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-4',
      label: 'Step 4 · Compare and order numbers to 10,000,000',
      objectiveId: 'Y6_PV_CompareOrder_10000000',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-5',
      label: 'Step 5 · Round any whole number to a required degree of accuracy',
      objectiveId: 'Y6_PV_Round_DegreeOfAccuracy',
      topic: 'place-value',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-6',
      label: 'Step 6 · Use negative numbers in context and calculate intervals',
      objectiveId: 'Y6_PV_NegativeNumbers_Intervals',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-pv-step-7',
      label: 'Step 7 · Solve problems involving large numbers and rounding',
      objectiveId: 'Y6_PV_Solve_Problems',
      topic: 'place-value',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 6 — Addition & Subtraction
export const AI_MATHS_Y6_ADD_SUB = {
  id: 'maths:y6:addition-subtraction',

  subject: 'maths',
  year: 6,
  topic: 'addition-subtraction',
  title: 'Addition & Subtraction',
  desc: 'Efficient written methods, decimals, estimation and multi-step problems.',

  steps: [
    {
      id: 'y6-as-step-1',
      label: 'Step 1 · Mental strategies with large numbers and decimals',
      objectiveId: 'Y6_AS_Mental_Strategies',
      topic: 'addition-subtraction',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y6-as-step-2',
      label: 'Step 2 · Add multi-digit whole numbers using efficient written methods',
      objectiveId: 'Y6_AS_Add_LargeNumbers',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-as-step-3',
      label: 'Step 3 · Subtract multi-digit whole numbers using efficient written methods',
      objectiveId: 'Y6_AS_Sub_LargeNumbers',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-as-step-4',
      label: 'Step 4 · Add and subtract numbers with up to two decimal places',
      objectiveId: 'Y6_AS_Decimals_Add_Sub',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-as-step-5',
      label: 'Step 5 · Use rounding and inverse operations to estimate and check',
      objectiveId: 'Y6_AS_Estimate_Check',
      topic: 'addition-subtraction',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'y6-as-step-6',
      label: 'Step 6 · Solve multi-step problems using addition and subtraction',
      objectiveId: 'Y6_AS_MultiStep_Problems',
      topic: 'addition-subtraction',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 6 — Multiplication & Division
export const AI_MATHS_Y6_MULT_DIV = {
  id: 'maths:y6:multiplication-division',

  subject: 'maths',
  year: 6,
  topic: 'multiplication-division',
  title: 'Multiplication & Division',
  desc: 'Long multiplication and division, factors, primes and order of operations.',

  steps: [
    {
      id: 'y6-md-step-1',
      label: 'Step 1 · Recall and use multiplication and division facts to 12×12',
      objectiveId: 'Y6_MD_Recall_Facts_12x12',
      topic: 'multiplication-division',
      defaultBand: 'support',
      targetQuestions: 5
    },
    {
      id: 'y6-md-step-2',
      label: 'Step 2 · Multiply up to 4-digit numbers by 2-digit numbers',
      objectiveId: 'Y6_MD_LongMultiplication_4digit_by_2digit',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-md-step-3',
      label: 'Step 3 · Divide up to 4-digit numbers by 2-digit numbers (no remainder)',
      objectiveId: 'Y6_MD_LongDivision_4digit_by_2digit_NoRemainder',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-md-step-4',
      label: 'Step 4 · Divide with remainders and interpret the remainder',
      objectiveId: 'Y6_MD_LongDivision_Remainders',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-md-step-5',
      label: 'Step 5 · Use factors, multiples and common factors',
      objectiveId: 'Y6_MD_Factors_Multiples_Common',
      topic: 'multiplication-division',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-md-step-6',
      label: 'Step 6 · Use prime, square and cube numbers',
      objectiveId: 'Y6_MD_Prime_Square_Cube',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 5
    },
        {
      id: 'y6-md-step-7',
      label: 'Step 7 · Use order of operations (BODMAS)',
      objectiveId: 'Y6_MD_OrderOfOperations',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate BODMAS questions such as 3 + 4 × 5 or (20 − 6) ÷ 2 where pupils enter a numeric result using maths notation.',
        exampleSkills: ['apply order of operations', 'evaluate multi-step expressions']
      },
      targetQuestions: 6
    },

    {
      id: 'y6-md-step-8',
      label: 'Step 8 · Solve multi-step problems involving × and ÷',
      objectiveId: 'Y6_MD_Solve_Problems',
      topic: 'multiplication-division',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 6 — Fractions, Decimals & Percentages
export const AI_MATHS_Y6_FRACTIONS = {
  id: 'maths:y6:fractions',

  subject: 'maths',
  year: 6,
  topic: 'fractions',
  title: 'Fractions, Decimals & Percentages',
  desc: 'Four operations with fractions, equivalence, ratio and proportion.',

  steps: [
    {
      id: 'y6-fr-step-1',
      label: 'Step 1 · Simplify and find equivalent fractions',
      objectiveId: 'Y6_FR_Simplify_Equivalent',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate simplifying and equivalence questions such as 12/18 = ? in simplest form.',
        exampleSkills: ['simplify fractions', 'find equivalent fractions']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-2',
      label: 'Step 2 · Compare and order fractions with different denominators',
      objectiveId: 'Y6_FR_Compare_Order_DifferentDenominators',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to compare and order fractions like 5/12, 2/3 and 7/8.',
        exampleSkills: ['find common denominators', 'compare non-unit fractions']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-3',
      label: 'Step 3 · Add and subtract fractions with different denominators',
      objectiveId: 'Y6_FR_Add_Sub_DifferentDenominators',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use fraction equations such as 3/4 − 2/9 = ? that require common denominators.',
        exampleSkills: ['add fractions with different denominators', 'subtract fractions with different denominators']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-4',
      label: 'Step 4 · Add and subtract mixed numbers',
      objectiveId: 'Y6_FR_Add_Sub_MixedNumbers',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Ask pupils to add and subtract mixed numbers like 2 1/3 + 1 2/3.',
        exampleSkills: ['add mixed numbers', 'subtract mixed numbers']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-5',
      label: 'Step 5 · Multiply proper fractions and mixed numbers',
      objectiveId: 'Y6_FR_Multiply_Fractions',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Use multiplication of fractions such as 2/3 × 5/7 and 1 1/2 × 3/4.',
        exampleSkills: ['multiply fractions', 'simplify fractional products']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-6',
      label: 'Step 6 · Divide proper fractions by whole numbers',
      objectiveId: 'Y6_FR_Divide_By_WholeNumber',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Generate questions like 3/4 ÷ 2 = ? where the answer is a fraction.',
        exampleSkills: ['divide fractions by whole numbers', 'interpret division of a fraction']
      },
      targetQuestions: 6
    },
    {
      id: 'y6-fr-step-7',
      label: 'Step 7 · Fractions, decimals and percentages equivalence',
      objectiveId: 'Y6_FR_Fractions_Decimals_Percentages',
      topic: 'fractions',
      defaultBand: 'core',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Mix fractions, decimals and percentages such as 0.6, 3/5 and 60%.',
        exampleSkills: ['convert between fractions, decimals and percentages', 'use equivalence in problems']
      },
      targetQuestions: 7
    },
    {
      id: 'y6-fr-step-8',
      label: 'Step 8 · Ratio and proportion problems using fractions and percentages',
      objectiveId: 'Y6_FR_Ratio_Proportion',
      topic: 'fractions',
      defaultBand: 'stretch',
      objectiveMeta: {
        mathQuill: true,
        answerType: 'mathExpression',
        aiGuidance: 'Pose ratio and proportion questions that may require fractional or decimal answers.',
        exampleSkills: ['use ratio and proportion', 'link ratio to fractions and percentages']
      },
      targetQuestions: 7
    }
  ]
};


// AI unit curriculum config for Maths Year 6 — Measurement
export const AI_MATHS_Y6_MEASUREMENT = {
  id: 'maths:y6:measurement',

  subject: 'maths',
  year: 6,
  topic: 'measurement',
  title: 'Measurement',
  desc: 'Converting units, area of triangles and parallelograms, and volume.',

  steps: [
    {
      id: 'y6-me-step-1',
      label: 'Step 1 · Convert between standard metric units',
      objectiveId: 'Y6_ME_Convert_Metric',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-me-step-2',
      label: 'Step 2 · Relate metric units to miles and kilometres',
      objectiveId: 'Y6_ME_Convert_Miles_Kilometres',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-me-step-3',
      label: 'Step 3 · Perimeter and area of rectangles and composite shapes',
      objectiveId: 'Y6_ME_Perimeter_Area_Rectangles_Composite',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-me-step-4',
      label: 'Step 4 · Area of triangles and parallelograms using formulae',
      objectiveId: 'Y6_ME_Area_Triangles_Parallelograms',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-me-step-5',
      label: 'Step 5 · Volume of cubes and cuboids using formulae',
      objectiveId: 'Y6_ME_Volume_Cuboids',
      topic: 'measurement',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-me-step-6',
      label: 'Step 6 · Solve multi-step problems involving measure',
      objectiveId: 'Y6_ME_Solve_Problems',
      topic: 'measurement',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};

// AI unit curriculum config for Maths Year 6 — Shape & Position
export const AI_MATHS_Y6_SHAPE = {
  id: 'maths:y6:shape',

  subject: 'maths',
  year: 6,
  topic: 'shape',
  title: 'Shape & Position',
  desc: 'Circles, angles in polygons, nets and coordinates in all four quadrants.',

  steps: [
    {
      id: 'y6-sh-step-1',
      label: 'Step 1 · Draw 2D shapes with given dimensions and angles',
      objectiveId: 'Y6_SH_Draw_2D_Shapes',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-sh-step-2',
      label: 'Step 2 · Draw and identify parts of circles',
      objectiveId: 'Y6_SH_Circles_Radius_Diameter',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 5
    },
    {
      id: 'y6-sh-step-3',
      label: 'Step 3 · Angles in triangles, quadrilaterals and other polygons',
      objectiveId: 'Y6_SH_Angles_Polygons',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-sh-step-4',
      label: 'Step 4 · Recognise nets and identify 3D shapes from nets',
      objectiveId: 'Y6_SH_Nets_3D_Reasoning',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-sh-step-5',
      label: 'Step 5 · Describe positions using coordinates in all four quadrants',
      objectiveId: 'Y6_SH_Coordinates_FourQuadrants',
      topic: 'shape',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-sh-step-6',
      label: 'Step 6 · Draw, translate and reflect shapes in all four quadrants',
      objectiveId: 'Y6_SH_Translations_Reflections_FourQuadrants',
      topic: 'shape',
      defaultBand: 'stretch',
      targetQuestions: 6
    }
  ]
};

// AI unit curriculum config for Maths Year 6 — Statistics
export const AI_MATHS_Y6_STATISTICS = {
  id: 'maths:y6:statistics',

  subject: 'maths',
  year: 6,
  topic: 'statistics',
  title: 'Statistics',
  desc: 'Pie charts, line graphs and calculating the mean.',

  steps: [
    {
      id: 'y6-st-step-1',
      label: 'Step 1 · Read and interpret line graphs',
      objectiveId: 'Y6_ST_Read_LineGraphs',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-st-step-2',
      label: 'Step 2 · Draw and complete line graphs from data',
      objectiveId: 'Y6_ST_Draw_LineGraphs',
      topic: 'statistics',
      defaultBand: 'core',
      targetQuestions: 6
    },
    {
      id: 'y6-st-step-3',
      label: 'Step 3 · Interpret and construct pie charts',
      objectiveId: 'Y6_ST_PieCharts',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-st-step-4',
      label: 'Step 4 · Calculate and interpret the mean as an average',
      objectiveId: 'Y6_ST_Mean_Average',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 6
    },
    {
      id: 'y6-st-step-5',
      label: 'Step 5 · Solve problems using line graphs, pie charts and the mean',
      objectiveId: 'Y6_ST_Solve_Problems',
      topic: 'statistics',
      defaultBand: 'stretch',
      targetQuestions: 7
    }
  ]
};




// Central lookup of all AI units (extend as you add more)
export const AI_UNITS = {
  maths: {
    3: {
      'place-value': AI_MATHS_Y3,
      'addition-subtraction': AI_MATHS_Y3_ADD_SUB,
      'multiplication-division': AI_MATHS_Y3_MULT_DIV,
      'fractions': AI_MATHS_Y3_FRACTIONS,
      'measurement': AI_MATHS_Y3_MEASUREMENT,
      'shape': AI_MATHS_Y3_SHAPE,
      'statistics': AI_MATHS_Y3_STATISTICS
    },
    4: {
      'place-value': AI_MATHS_Y4_PLACE_VALUE,
      'addition-subtraction': AI_MATHS_Y4_ADD_SUB,
      'multiplication-division': AI_MATHS_Y4_MULT_DIV,
      'fractions': AI_MATHS_Y4_FRACTIONS,
      'measurement': AI_MATHS_Y4_MEASUREMENT,
      'shape': AI_MATHS_Y4_SHAPE,
      'statistics': AI_MATHS_Y4_STATISTICS
    },
    5: {
      'place-value': AI_MATHS_Y5_PLACE_VALUE,
      'addition-subtraction': AI_MATHS_Y5_ADD_SUB,
      'multiplication-division': AI_MATHS_Y5_MULT_DIV,
      'fractions': AI_MATHS_Y5_FRACTIONS,
      'measurement': AI_MATHS_Y5_MEASUREMENT,
      'shape': AI_MATHS_Y5_SHAPE,
      'statistics': AI_MATHS_Y5_STATISTICS
    },
    6: {
      'place-value': AI_MATHS_Y6_PLACE_VALUE,
      'addition-subtraction': AI_MATHS_Y6_ADD_SUB,
      'multiplication-division': AI_MATHS_Y6_MULT_DIV,
      'fractions': AI_MATHS_Y6_FRACTIONS,
      'measurement': AI_MATHS_Y6_MEASUREMENT,
      'shape': AI_MATHS_Y6_SHAPE,
      'statistics': AI_MATHS_Y6_STATISTICS
    }
  }
  // keep / extend other subjects and years here as needed
};
