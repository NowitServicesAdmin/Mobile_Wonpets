import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

export type Country = {
  code: CountryCode;
  dial: string;
  name: string;
  flag: string;
};

/** "IN" -> 🇮🇳 (regional-indicator letters, no image assets needed). */
const flagOf = (code: string) =>
  String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));

const make = (code: CountryCode, name: string): Country => ({
  code,
  name,
  dial: `+${getCountryCallingCode(code)}`,
  flag: flagOf(code),
});

// English display names for every region libphonenumber-js supports.
const NAMES: Record<string, string> = {
  AC: "Ascension Island", AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan",
  AG: "Antigua & Barbuda", AI: "Anguilla", AL: "Albania", AM: "Armenia", AO: "Angola",
  AR: "Argentina", AS: "American Samoa", AT: "Austria", AU: "Australia", AW: "Aruba",
  AX: "Åland Islands", AZ: "Azerbaijan", BA: "Bosnia & Herzegovina", BB: "Barbados",
  BD: "Bangladesh", BE: "Belgium", BF: "Burkina Faso", BG: "Bulgaria", BH: "Bahrain",
  BI: "Burundi", BJ: "Benin", BL: "St. Barthélemy", BM: "Bermuda", BN: "Brunei",
  BO: "Bolivia", BQ: "Caribbean Netherlands", BR: "Brazil", BS: "Bahamas", BT: "Bhutan",
  BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada", CC: "Cocos (Keeling) Islands",
  CD: "Congo (DRC)", CF: "Central African Republic", CG: "Congo (Republic)",
  CH: "Switzerland", CI: "Côte d’Ivoire", CK: "Cook Islands", CL: "Chile", CM: "Cameroon",
  CN: "China", CO: "Colombia", CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde",
  CW: "Curaçao", CX: "Christmas Island", CY: "Cyprus", CZ: "Czechia", DE: "Germany",
  DJ: "Djibouti", DK: "Denmark", DM: "Dominica", DO: "Dominican Republic", DZ: "Algeria",
  EC: "Ecuador", EE: "Estonia", EG: "Egypt", EH: "Western Sahara", ER: "Eritrea",
  ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji", FK: "Falkland Islands",
  FM: "Micronesia", FO: "Faroe Islands", FR: "France", GA: "Gabon", GB: "United Kingdom",
  GD: "Grenada", GE: "Georgia", GF: "French Guiana", GG: "Guernsey", GH: "Ghana",
  GI: "Gibraltar", GL: "Greenland", GM: "Gambia", GN: "Guinea", GP: "Guadeloupe",
  GQ: "Equatorial Guinea", GR: "Greece", GT: "Guatemala", GU: "Guam", GW: "Guinea-Bissau",
  GY: "Guyana", HK: "Hong Kong", HN: "Honduras", HR: "Croatia", HT: "Haiti",
  HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel", IM: "Isle of Man",
  IN: "India", IO: "British Indian Ocean Territory", IQ: "Iraq", IR: "Iran", IS: "Iceland",
  IT: "Italy", JE: "Jersey", JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya",
  KG: "Kyrgyzstan", KH: "Cambodia", KI: "Kiribati", KM: "Comoros", KN: "St. Kitts & Nevis",
  KP: "North Korea", KR: "South Korea", KW: "Kuwait", KY: "Cayman Islands",
  KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon", LC: "St. Lucia", LI: "Liechtenstein",
  LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania", LU: "Luxembourg",
  LV: "Latvia", LY: "Libya", MA: "Morocco", MC: "Monaco", MD: "Moldova", ME: "Montenegro",
  MF: "St. Martin", MG: "Madagascar", MH: "Marshall Islands", MK: "North Macedonia",
  ML: "Mali", MM: "Myanmar", MN: "Mongolia", MO: "Macao", MP: "Northern Mariana Islands",
  MQ: "Martinique", MR: "Mauritania", MS: "Montserrat", MT: "Malta", MU: "Mauritius",
  MV: "Maldives", MW: "Malawi", MX: "Mexico", MY: "Malaysia", MZ: "Mozambique",
  NA: "Namibia", NC: "New Caledonia", NE: "Niger", NF: "Norfolk Island", NG: "Nigeria",
  NI: "Nicaragua", NL: "Netherlands", NO: "Norway", NP: "Nepal", NR: "Nauru", NU: "Niue",
  NZ: "New Zealand", OM: "Oman", PA: "Panama", PE: "Peru", PF: "French Polynesia",
  PG: "Papua New Guinea", PH: "Philippines", PK: "Pakistan", PL: "Poland",
  PM: "St. Pierre & Miquelon", PR: "Puerto Rico", PS: "Palestine", PT: "Portugal",
  PW: "Palau", PY: "Paraguay", QA: "Qatar", RE: "Réunion", RO: "Romania", RS: "Serbia",
  RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands", SC: "Seychelles",
  SD: "Sudan", SE: "Sweden", SG: "Singapore", SH: "St. Helena", SI: "Slovenia",
  SJ: "Svalbard & Jan Mayen", SK: "Slovakia", SL: "Sierra Leone", SM: "San Marino",
  SN: "Senegal", SO: "Somalia", SR: "Suriname", SS: "South Sudan",
  ST: "São Tomé & Príncipe", SV: "El Salvador", SX: "Sint Maarten", SY: "Syria",
  SZ: "Eswatini", TA: "Tristan da Cunha", TC: "Turks & Caicos Islands", TD: "Chad",
  TG: "Togo", TH: "Thailand", TJ: "Tajikistan", TK: "Tokelau", TL: "Timor-Leste",
  TM: "Turkmenistan", TN: "Tunisia", TO: "Tonga", TR: "Türkiye", TT: "Trinidad & Tobago",
  TV: "Tuvalu", TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine", UG: "Uganda",
  US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VA: "Vatican City",
  VC: "St. Vincent & Grenadines", VE: "Venezuela", VG: "British Virgin Islands",
  VI: "U.S. Virgin Islands", VN: "Vietnam", VU: "Vanuatu", WF: "Wallis & Futuna",
  WS: "Samoa", XK: "Kosovo", YE: "Yemen", YT: "Mayotte", ZA: "South Africa",
  ZM: "Zambia", ZW: "Zimbabwe",
};

const regionNames = (() => {
  try {
    return new (Intl as any).DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

const nameOf = (code: string): string =>
  NAMES[code] ?? (regionNames?.of(code) as string | undefined) ?? code;

/**
 * Every country libphonenumber-js knows about (dial codes + validation come from the library),
 * sorted A-Z by name. India is pinned first as the default.
 */
export const COUNTRIES: Country[] = getCountries()
  .map((code) => make(code, nameOf(code)))
  .sort((a, b) =>
    a.code === "IN" ? -1 : b.code === "IN" ? 1 : a.name.localeCompare(b.name),
  );
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Anything containing a letter or "@" is treated as an email, otherwise as a phone number. */
export const isEmailInput = (v: string) => /[a-zA-Z@]/.test(v);

export type Parsed = { kind: "email" | "phone"; value: string; valid: boolean };

export function parseIdentifier(raw: string, country: Country): Parsed {
  const text = raw.trim();
  if (isEmailInput(text)) {
    return {
      kind: "email",
      value: text.toLowerCase(),
      valid: EMAIL_RE.test(text),
    };
  }
  const phone = parsePhoneNumberFromString(text, country.code);
  return {
    kind: "phone",
    // E.164-style formatted number when valid, otherwise a best-effort string
    value: phone?.formatInternational() ?? `${country.dial} ${text.replace(/\D/g, "")}`,
    valid: !!phone?.isValid(),
  };
}