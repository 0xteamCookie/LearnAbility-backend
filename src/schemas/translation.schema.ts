import { z } from 'zod';

export const supportedLanguages = [
  'ar',
  'bn',
  'bg',
  'zh-CN',
  'zh-TW',
  'hr',
  'cs',
  'da',
  'nl',
  'en',
  'et',
  'fa',
  'fi',
  'fr',
  'de',
  'el',
  'gu',
  'he',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'kn',
  'ko',
  'lv',
  'lt',
  'ms',
  'ml',
  'mr',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sr',
  'sk',
  'sl',
  'es',
  'sw',
  'sv',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
] as const;

export type SupportedLanguageCode = (typeof supportedLanguages)[number];

export const languageCodeToNameMap: Record<SupportedLanguageCode, string> = {
  ar: 'Arabic',
  bn: 'Bengali',
  bg: 'Bulgarian',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  et: 'Estonian',
  fa: 'Farsi',
  fi: 'Finnish',
  fr: 'French',
  de: 'German',
  el: 'Greek',
  gu: 'Gujarati',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  kn: 'Kannada',
  ko: 'Korean',
  lv: 'Latvian',
  lt: 'Lithuanian',
  ms: 'Malay',
  ml: 'Malayalam',
  mr: 'Marathi',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sr: 'Serbian',
  sk: 'Slovak',
  sl: 'Slovenian',
  es: 'Spanish',
  sw: 'Swahili',
  sv: 'Swedish',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese',
};

export const languageParamSchema = z.object({
  params: z.object({
    lang: z.enum(supportedLanguages, {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          return {
            message: `Invalid language code. Supported languages are: ${supportedLanguages
              .map((code) => `${code} (${languageCodeToNameMap[code]})`)
              .join(', ')}`,
          };
        }
        return { message: ctx.defaultError };
      },
    }),
  }),
});

export const setUserLanguageSchema = z.object({
  body: z.object({
    languageCode: z.enum(supportedLanguages, {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          return {
            message: `Invalid language code. Must be one of: ${supportedLanguages
              .map((code) => `${code} (${languageCodeToNameMap[code]})`)
              .join(', ')}`,
          };
        }
        return { message: ctx.defaultError };
      },
    }),
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     LanguageCode:
 *       type: string
 *       enum:
 *         - ar
 *         - bn
 *         - bg
 *         - zh-CN
 *         - zh-TW
 *         - hr
 *         - cs
 *         - da
 *         - nl
 *         - en
 *         - et
 *         - fa
 *         - fi
 *         - fr
 *         - de
 *         - el
 *         - gu
 *         - he
 *         - hi
 *         - hu
 *         - id
 *         - it
 *         - ja
 *         - kn
 *         - ko
 *         - lv
 *         - lt
 *         - ms
 *         - ml
 *         - mr
 *         - no
 *         - pl
 *         - pt
 *         - ro
 *         - ru
 *         - sr
 *         - sk
 *         - sl
 *         - es
 *         - sw
 *         - sv
 *         - ta
 *         - te
 *         - th
 *         - tr
 *         - uk
 *         - ur
 *         - vi
 *       description: Standard ISO 639-1 language code (with regional variations for Chinese).
 *       example: en
 *     SupportedLanguage:
 *       type: object
 *       properties:
 *         code:
 *           $ref: '#/components/schemas/LanguageCode'
 *         name:
 *           type: string
 *           example: English
 *       description: Represents a supported language with its code and human-readable name.
 *     TranslationFile:
 *       type: object
 *       additionalProperties:
 *         type: string
 *       description: Key-value pairs representing translated strings.
 *       example:
 *         hello: "Hello"
 *         world: "World"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         errors: # Optional, for more detailed validation errors
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               path:
 *                 type: array
 *                 items:
 *                   type: string
 *               message:
 *                 type: string
 *       example:
 *         message: "Invalid request parameters."
 *         errors:
 *           - path: ["params", "lang"]
 *             message: "Invalid language code."
 */
