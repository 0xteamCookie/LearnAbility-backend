import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { translateTextMap } from '../services/gemini.service';
import {
  supportedLanguages,
  languageCodeToNameMap,
  SupportedLanguageCode,
} from '../schemas/translation.schema';
import db from '../db/db';

const LANG_DIR = path.join(__dirname, '../../lang');
const DEFAULT_LANG = 'en';

export const generateTranslation = async (req: Request, res: Response, next: NextFunction) => {
  const { lang } = req.params;

  if (lang === DEFAULT_LANG) {
    return void res
      .status(400)
      .json({ message: `Cannot generate translation for the default language '${DEFAULT_LANG}'.` });
  }

  try {
    const defaultLangFilePath = path.join(LANG_DIR, `${DEFAULT_LANG}.json`);
    let defaultLangData: Record<string, string>;
    try {
      defaultLangData = JSON.parse(await fs.readFile(defaultLangFilePath, 'utf-8'));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return void res
          .status(500)
          .json({ message: `Default language file '${DEFAULT_LANG}.json' not found.` });
      }
      console.error(`Error reading default language file: ${defaultLangFilePath}`, err);
      return void res
        .status(500)
        .json({ message: `Error reading default language file: ${err.message}` });
    }

    const translatedData = await translateTextMap(defaultLangData, lang, DEFAULT_LANG);

    const targetLangFilePath = path.join(LANG_DIR, `${lang}.json`);
    await fs.writeFile(targetLangFilePath, JSON.stringify(translatedData, null, 2), 'utf-8');

    return void res.status(201).json({
      message: `Translation file for '${lang}' generated successfully using Gemini.`,
      filePath: `/lang/${lang}.json`,
    });
  } catch (error: any) {
    console.error(`Error generating translation for ${lang} using Gemini:`, error);

    if (error.message && error.message.startsWith('[GeminiService]')) {
      return void res.status(500).json({ message: `Translation service error: ${error.message}` });
    }
    next(error);
  }
};

export const listSupportedLanguages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const humanReadableLanguages = supportedLanguages.map((code) => ({
      code: code,
      name: languageCodeToNameMap[code as SupportedLanguageCode] || code,
    }));
    return void res.status(200).json(humanReadableLanguages);
  } catch (error: any) {
    console.error(`Error listing supported languages:`, error);
    next(error);
  }
};

export const setUserLanguagePreference = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId;
    const { languageCode } = req.body;

    if (!userId) {
      return void res.status(401).json({ message: 'User not authenticated.' });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { language: languageCode },
      select: { id: true, language: true },
    });

    return void res.status(200).json({
      message: `User language preference updated to ${
        languageCodeToNameMap[languageCode as SupportedLanguageCode]
      } (${languageCode}).`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error(`Error setting user language preference:`, error);

    if (error.code === 'P2025') {
      return void res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

export const getTranslationFile = async (req: Request, res: Response, next: NextFunction) => {
  const { lang } = req.params;
  const filePath = path.join(LANG_DIR, `${lang}.json`);

  try {
    await fs.access(filePath);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    return void res.status(200).json(jsonData);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return void res
        .status(404)
        .json({
          message: `Translation file for '${lang}' not found. It may need to be generated first.`,
        });
    }
    console.error(`Error retrieving translation file for ${lang}:`, error);
    next(error);
  }
};
