import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebaseAdmin.ts';
import { checkAndSyncUserAdminRole } from '../repositories/adminRepository.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  rawBody?: Buffer;
}

export type VerifyIdTokenFn = (token: string) => Promise<DecodedIdToken>;
export type CheckAdminRoleFn = (params: {
  uid: string;
  email?: string;
  fullName?: string;
  photoUrl?: string;
  isAllowlistedAdminEmail: boolean;
}) => Promise<boolean>;

export const DEFAULT_ADMIN_EMAILS = ['danishsary3@gmail.com'] as const;

export function isAdminEmail(
  email?: string | null,
  envAdminEmails?: string,
): boolean {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) return false;

  const allowlist = new Set<string>(DEFAULT_ADMIN_EMAILS);
  const rawEnv = envAdminEmails ?? process.env.ADMIN_EMAILS ?? '';
  for (const entry of rawEnv.split(',')) {
    const normalized = entry.trim().toLowerCase();
    if (normalized) {
      allowlist.add(normalized);
    }
  }

  return allowlist.has(cleanEmail);
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function createRequireAuthMiddleware(verifyToken?: VerifyIdTokenFn) {
  const verify =
    verifyToken ?? ((token: string) => adminAuth.verifyIdToken(token));

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      res
        .status(401)
        .json({ error: 'Unauthorized: Missing authentication token' });
      return;
    }

    try {
      const decoded = await verify(token);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Firebase ID token verification failed:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  };
}

export function createRequireAdminMiddleware(
  checkAdminRole?: CheckAdminRoleFn,
) {
  const checkAdmin = checkAdminRole ?? checkAndSyncUserAdminRole;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res
        .status(401)
        .json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    try {
      const allowlisted = isAdminEmail(req.user.email);
      const isAdmin = await checkAdmin({
        uid: req.user.uid,
        email: req.user.email,
        fullName: req.user.name,
        photoUrl: req.user.picture,
        isAllowlistedAdminEmail: allowlisted,
      });

      if (!isAdmin) {
        res.status(403).json({
          error: 'Forbidden: Administrator privileges are required',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Admin role verification failed:', error);
      res.status(500).json({ error: 'Unable to verify administrator access' });
    }
  };
}

export const requireAuth = createRequireAuthMiddleware();
export const requireAdmin = createRequireAdminMiddleware();

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    req.user = await adminAuth.verifyIdToken(token);
  } catch {
    // Allow unauthenticated guest flow when optional token is invalid/expired
    req.user = undefined;
  }
  next();
};

