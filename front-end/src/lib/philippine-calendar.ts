// Categories decide which colored badge a holiday or fiesta receives.
export type PhilippineEventCategory = 
  | "national_regular" 
  | "national_special" 
  | "cultural_festival" 
  | "local_fiesta" 
  | "religious" 
  | "chinese_filipino" 
  | "seasonal";

// Static calendar data bundled with the frontend; it does not come from Laravel.
export interface PhilippineCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  // Fiestas can span several days, so the calendar can show a range.
  endDate?: string;
  category: PhilippineEventCategory;
  categoryLabel: string;
  location: string;
  description: string;
  // Fixed-date events can be copied into future years by calendar.ts.
  isRecurringYearly?: boolean;
  significance: string;
}

// This list is shipped with the app. The calendar combines it with Laravel
// events and projects fixed-date entries into the year the user is viewing.
export const philippineCalendarEvents: PhilippineCalendarEvent[] = [
  // January
  {
    id: "ph-new-year",
    title: "New Year's Day",
    date: "2026-01-01",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "National celebration marking the first day of the year according to the Gregorian calendar.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-sidlakan-festival",
    title: "Sidlakan Festival & Municipal Fiesta",
    date: "2026-01-15",
    endDate: "2026-01-20",
    category: "local_fiesta",
    categoryLabel: "Cordova Local Fiesta",
    location: "Cordova Municipal Town Plaza, Cordova, Cebu",
    description: "Cordova's premier annual cultural celebration highlighting maritime heritage, traditional street dancing, and community devotion.",
    isRecurringYearly: true,
    significance: "Cordova Heritage & Tourism Highlight"
  },
  {
    id: "ph-sinulog",
    title: "Sinulog Festival (Cebu)",
    date: "2026-01-18",
    category: "cultural_festival",
    categoryLabel: "Major Festival",
    location: "Cebu City & Province",
    description: "Grand cultural and religious festival honoring the Santo Niño, featuring vibrant street dancing, drum beats, and fluvial processions across Cebu.",
    isRecurringYearly: false,
    significance: "Major Regional Cultural Celebration"
  },

  // February
  {
    id: "ph-chinese-new-year",
    title: "Chinese New Year (Spring Festival)",
    date: "2026-02-17",
    category: "chinese_filipino",
    categoryLabel: "Chinese Filipino",
    location: "Nationwide & Chinatown Centers",
    description: "Celebration of the lunar new year observed by Chinese Filipino communities with dragon dances and family reunions.",
    isRecurringYearly: false,
    significance: "Special Non-Working Holiday"
  },
  {
    id: "ph-edsa",
    title: "EDSA People Power Revolution Anniversary",
    date: "2026-02-25",
    category: "national_special",
    categoryLabel: "Special Non-Working",
    location: "Nationwide, Philippines",
    description: "Commemoration of the peaceful 1986 revolution that restored democracy in the Philippines.",
    isRecurringYearly: true,
    significance: "Special Non-Working Holiday"
  },

  // March / April (Holy Week 2026 usually early April)
  {
    id: "ph-maundy-thursday",
    title: "Maundy Thursday",
    date: "2026-04-02",
    category: "religious",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Christian observance commemorating the Last Supper of Jesus Christ during Holy Week.",
    isRecurringYearly: false,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-good-friday",
    title: "Good Friday",
    date: "2026-04-03",
    category: "religious",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Christian observance commemorating the crucifixion of Jesus Christ.",
    isRecurringYearly: false,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-kagitingan",
    title: "Araw ng Kagitingan (Day of Valor)",
    date: "2026-04-09",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Commemoration of the heroism of Filipino and American soldiers during World War II.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },

  // May
  {
    id: "ph-labor-day",
    title: "Labor Day",
    date: "2026-05-01",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "National celebration honoring workers and labor contributions across industries.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-fiesta-san-roque",
    title: "San Roque Parish Feast Day",
    date: "2026-08-16",
    category: "local_fiesta",
    categoryLabel: "Cordova Local Fiesta",
    location: "San Roque Parish Church, Cordova, Cebu",
    description: "Religious feast day in honor of San Roque, patron saint of Cordova, featuring traditional novenas, flotilla, and community festivities.",
    isRecurringYearly: true,
    significance: "Cordova Town Patron Feast"
  },

  // June
  {
    id: "ph-independence-day",
    title: "Independence Day (Araw ng Kasarinlan)",
    date: "2026-06-12",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Commemoration of the Philippine Declaration of Independence from Spain in 1898.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },

  // August
  {
    id: "ph-ninoy-aquino",
    title: "Ninoy Aquino Day",
    date: "2026-08-21",
    category: "national_special",
    categoryLabel: "Special Non-Working",
    location: "Nationwide, Philippines",
    description: "Commemoration of the assassination of Senator Benigno 'Ninoy' Aquino Jr.",
    isRecurringYearly: true,
    significance: "Special Non-Working Holiday"
  },
  {
    id: "ph-national-heroes",
    title: "National Heroes Day",
    date: "2026-08-31",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Honoring all Philippine national heroes who fought for freedom and independence.",
    isRecurringYearly: true,
    significance: "Regular National Holiday (Last Monday of August)"
  },

  // November
  {
    id: "ph-all-saints",
    title: "All Saints' Day (Undas)",
    date: "2026-11-01",
    category: "religious",
    categoryLabel: "Special Non-Working",
    location: "Nationwide, Philippines",
    description: "Traditional Filipino holiday where families visit cemeteries to honor departed loved ones.",
    isRecurringYearly: true,
    significance: "Special Non-Working Holiday"
  },
  {
    id: "ph-bonifacio",
    title: "Bonifacio Day",
    date: "2026-11-30",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Commemoration of the birth of Andres Bonifacio, leader of the Katipunan revolution.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },

  // December
  {
    id: "ph-immaculate-conception",
    title: "Feast of the Immaculate Conception",
    date: "2026-12-08",
    category: "religious",
    categoryLabel: "Special Non-Working",
    location: "Nationwide, Philippines",
    description: "Religious holiday observing the dogma of the Immaculate Conception of the Blessed Virgin Mary.",
    isRecurringYearly: true,
    significance: "Special Non-Working Holiday"
  },
  {
    id: "ph-christmas",
    title: "Christmas Day",
    date: "2026-12-25",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Major Christian holiday celebrating the birth of Jesus Christ, deeply celebrated across Filipino households.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-rizal-day",
    title: "Rizal Day",
    date: "2026-12-30",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "Commemoration of the martyrdom of Dr. Jose P. Rizal, national hero of the Philippines.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-new-years-eve",
    title: "New Year's Eve (New Year's Eve Festivities)",
    date: "2026-12-31",
    category: "national_special",
    categoryLabel: "Special Non-Working",
    location: "Nationwide, Philippines",
    description: "End of year celebration welcoming the New Year with family feasts and community fireworks.",
    isRecurringYearly: true,
    significance: "Special Non-Working Holiday"
  },

  // 2027 key dates sample for future-proofing
  // These entries give the calendar real data when the user moves to next year.
  {
    id: "ph-new-year-2027",
    title: "New Year's Day",
    date: "2027-01-01",
    category: "national_regular",
    categoryLabel: "Regular Holiday",
    location: "Nationwide, Philippines",
    description: "National celebration marking the first day of the year 2027.",
    isRecurringYearly: true,
    significance: "Regular National Holiday"
  },
  {
    id: "ph-sidlakan-festival-2027",
    title: "Sidlakan Festival & Municipal Fiesta 2027",
    date: "2027-01-15",
    endDate: "2027-01-20",
    category: "local_fiesta",
    categoryLabel: "Cordova Local Fiesta",
    location: "Cordova Municipal Town Plaza, Cordova, Cebu",
    description: "Annual cultural celebration in Cordova, Cebu highlighting local heritage and tourism.",
    isRecurringYearly: true,
    significance: "Cordova Town Fiesta"
  },
  {
    id: "ph-fiesta-san-roque-2027",
    title: "San Roque Parish Feast Day 2027",
    date: "2027-08-16",
    category: "local_fiesta",
    categoryLabel: "Cordova Local Fiesta",
    location: "San Roque Parish Church, Cordova, Cebu",
    description: "Annual feast day celebration for San Roque in Cordova, Cebu.",
    isRecurringYearly: true,
    significance: "Cordova Town Patron Feast"
  }
];
