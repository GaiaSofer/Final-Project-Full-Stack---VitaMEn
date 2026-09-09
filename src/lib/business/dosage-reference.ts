// Daily dosage reference values. TWO different numbers per nutrient:
//   rda = Reference Daily Intake / target  -> GREEN "you reached your target"
//   ul  = Tolerable Upper Intake Level      -> RED  "over the safe ceiling"
//
// SOURCES (entered by hand, once — no runtime fetching):
//   rda: FDA/MoH Reference Daily Intakes table (Adults & children >= 4y),
//        from the uploaded PDF.
//   ul : NIH Dietary Reference Intakes (Tolerable Upper Intake Levels), adults.
//
// !! VERIFY EVERY `ul` VALUE against https://ods.od.nih.gov before submission.
// A wrong ceiling in a safety app is the worst possible bug. These are filled
// from standard NIH adult ULs and marked for review.
//
// Unit note: values are stored in the unit the label normally uses. The overlap
// engine only sums matching units, so catalog ingredients must use these units.

export interface DosageRef {
  rda: number | null;   // target (green). null = no single RDA (e.g. only AI)
  ul: number | null;    // ceiling (red). null = no established UL
  unit: string;
}

// Adults >= 4 years. NEEDS REVIEW where marked.
export const DOSAGE_REFERENCE: Record<string, DosageRef> = {
  'Vitamin A':   { rda: 900,  ul: 3000, unit: 'mcg' },   // UL 3000 mcg RAE (preformed)
  'Vitamin C':   { rda: 90,   ul: 2000, unit: 'mg'  },
  'Vitamin D':   { rda: 20,   ul: 100,  unit: 'mcg' },   // 20mcg=800IU target, 100mcg=4000IU ceiling
  'Vitamin E':   { rda: 15,   ul: 1000, unit: 'mg'  },
  'Vitamin K':   { rda: 120,  ul: null, unit: 'mcg' },   // no UL established
  'Vitamin B6':  { rda: 1.7,  ul: 100,  unit: 'mg'  },
  'Vitamin B12': { rda: 2.4,  ul: null, unit: 'mcg' },   // no UL established
  'Folate':      { rda: 400,  ul: 1000, unit: 'mcg' },   // UL applies to folic acid
  'Niacin':      { rda: 16,   ul: 35,   unit: 'mg'  },
  'Calcium':     { rda: 1300, ul: 2500, unit: 'mg'  },
  'Iron':        { rda: 18,   ul: 45,   unit: 'mg'  },
  'Magnesium':   { rda: 420,  ul: 350,  unit: 'mg'  },   // UL 350mg = SUPPLEMENTAL only
  'Zinc':        { rda: 11,   ul: 40,   unit: 'mg'  },
  'Selenium':    { rda: 55,   ul: 400,  unit: 'mcg' },
  'Iodine':      { rda: 150,  ul: 1100, unit: 'mcg' },
  'Copper':      { rda: 0.9,  ul: 10,   unit: 'mg'  },
  'Caffeine':    { rda: null, ul: 400,  unit: 'mg'  },   // not a nutrient; FDA adult ceiling
};
