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
    }
  }
  // keep / extend other subjects and years here as needed
};
