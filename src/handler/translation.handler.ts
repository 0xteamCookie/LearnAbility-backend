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

const ROOT_DIR = path.join(__dirname, '../..');
const DEFAULT_LANG_DIR = path.join(ROOT_DIR, 'lang');
const GENERATED_LANG_DIR = path.join(ROOT_DIR, 'uploads', 'lang');
const DEFAULT_LANG_CODE = 'en';
const DEFAULT_LANG_FILE_PATH = path.join(DEFAULT_LANG_DIR, `${DEFAULT_LANG_CODE}.json`);

export const generateTranslation = async (req: Request, res: Response, next: NextFunction) => {
  const { lang } = req.params;

  if (lang === DEFAULT_LANG_CODE) {
    return void res
      .status(400)
      .json({
        message: `Cannot generate translation for the default language '${DEFAULT_LANG_CODE}'. It is used as the source.`,
      });
  }

  try {
    await fs.mkdir(GENERATED_LANG_DIR, { recursive: true });

    const targetLangFilePath = path.join(GENERATED_LANG_DIR, `${lang}.json`);

    try {
      await fs.access(targetLangFilePath);
      logger.info(
        `Translation file for '${lang}' already exists at ${targetLangFilePath}. Skipping generation.`
      );
      return void res.status(200).json({
        message: `Translation for '${lang}' already exists.`,
        filePath: `/uploads/lang/${lang}.json`,
      });
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        logger.error(`Error accessing target file ${targetLangFilePath} before generation:`, err);

        return void next(err);
      }

      logger.info(
        `Local translation for ${lang} not found at ${targetLangFilePath}. Proceeding with generation.`
      );
    }

    let defaultLangData: Record<string, string>;
    try {
      defaultLangData = JSON.parse(await fs.readFile(DEFAULT_LANG_FILE_PATH, 'utf-8'));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.error(
          `Default language file '${DEFAULT_LANG_CODE}.json' not found at ${DEFAULT_LANG_FILE_PATH}.`
        );
        return void res
          .status(500)
          .json({ message: `Source language file '${DEFAULT_LANG_CODE}.json' not found.` });
      }
      logger.error(`Error reading default language file: ${DEFAULT_LANG_FILE_PATH}`, err);
      return void res
        .status(500)
        .json({ message: `Error reading source language file: ${err.message}` });
    }

    logger.info(`Generating translation for '${lang}' using Gemini...`);
    const translatedData = await translateTextMap(defaultLangData, lang, DEFAULT_LANG_CODE);

    await fs.writeFile(targetLangFilePath, JSON.stringify(translatedData, null, 2), 'utf-8');
    logger.info(`Translation file for '${lang}' generated successfully at ${targetLangFilePath}.`);

    return void res.status(201).json({
      message: `Translation file for '${lang}' generated successfully using Gemini.`,
      filePath: `/uploads/lang/${lang}.json`,
    });
  } catch (error: any) {
    logger.error(`Error in generateTranslation for ${lang}:`, error);
    if (error.message && error.message.startsWith('[GeminiService]')) {
      return void res.status(500).json({ message: `Translation service error: ${error.message}` });
    }
    next(error);
  }
};

export const getTranslationFile = async (req: Request, res: Response, next: NextFunction) => {
  const { lang } = req.params;
  let filePath;

  if (lang === DEFAULT_LANG_CODE) {
    filePath = DEFAULT_LANG_FILE_PATH;
    logger.info(`Serving default language file for '${lang}' from ${filePath}`);
  } else {
    filePath = path.join(GENERATED_LANG_DIR, `${lang}.json`);
    logger.info(`Serving generated language file for '${lang}' from ${filePath}`);
  }

  try {
    await fs.access(filePath);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    return void res.status(200).json(jsonData);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.warn(
        `Translation file for '${lang}' not found at ${filePath}. It may need to be generated first.`
      );
      return void res
        .status(404)
        .json({
          message: `Translation file for '${lang}' not found. It may need to be generated first.`,
        });
    }
    logger.error(`Error retrieving translation file for ${lang} from ${filePath}:`, error);
    next(error);
  }
};

const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.log,
  d: console.log,
};

export const listSupportedLanguages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const humanReadableLanguages = supportedLanguages.map((code) => ({
      code: code,
      name: languageCodeToNameMap[code as SupportedLanguageCode] || code,
    }));
    return void void res.status(200).json(humanReadableLanguages);
  } catch (error: any) {
    logger.error(`Error listing supported languages:`, error);
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
      return void void res.status(401).json({ message: 'User not authenticated.' });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { language: languageCode },
      select: { id: true, language: true },
    });

    return void void res.status(200).json({
      message: `User language preference updated to ${
        languageCodeToNameMap[languageCode as SupportedLanguageCode]
      } (${languageCode}).`,
      user: updatedUser,
    });
  } catch (error: any) {
    logger.error(`Error setting user language preference:`, error);

    if (error.code === 'P2025') {
      return void void res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};
