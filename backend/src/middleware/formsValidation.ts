import { RequestHandler } from 'express';
import { validate } from './validate';
import { hasUnsafeFormJson } from '../utils/formJson';

export function validateFormBody<T extends object>(DtoClass: new (...args: any[]) => T): RequestHandler {
  const validateDto = validate(DtoClass);
  return async (req, res, next) => {
    // class-transformer inspects nested constructors and drops prototype keys before validation.
    if (hasUnsafeFormJson(req.body)) {
      res.status(400).json({ success: false, message: 'Reserved JSON keys or excessive nesting are not allowed' });
      return;
    }
    try {
      await validateDto(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
