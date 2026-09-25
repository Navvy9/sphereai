import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { findUserByEmail, createUser } from "../services/user.service";

const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID || undefined,
});

const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID || undefined,
});

export interface AuthenticatedRequest extends Request {
  user?: {
    email?: string;
    sub?: string;
    name?: string;
  };
  userRecord?: any;
}

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const authHeader = req.headers.authorization;

    if (isDevelopment && (!authHeader || authHeader === "Bearer test" || authHeader === "Bearer dummy")) {
      const fallbackEmail = req.headers["x-dev-email"] as string | undefined || "navdeep.workspace@gmail.com";
      const fallbackName = req.headers["x-dev-name"] as string | undefined || "nav";
      const fallbackSub = req.headers["x-dev-sub"] as string | undefined || "local-dev-user";

      let user = await findUserByEmail(fallbackEmail);
      if (!user) {
        user = await createUser(fallbackEmail, fallbackName, fallbackSub);
      }

      req.user = { email: fallbackEmail, sub: fallbackSub, name: fallbackName };
      req.userRecord = user;
      console.log("AUTH_FALLBACK_ACTIVE"); return next();
    }

    if (!authHeader) {
      console.warn("Auth middleware: missing Authorization header");
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Malformed Authorization header" });

    // Dev log: show token length to help debug malformed tokens without exposing them
    console.debug("Auth middleware: received token length", token ? token.length : 0);

    let payload: any;
    try {
      payload = await accessTokenVerifier.verify(token, {
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID ?? null,
      });
    } catch (accessErr: any) {
      console.warn("Access token verification failed:", accessErr?.message || accessErr);
      const idToken = req.headers["x-id-token"] as string | undefined;
      if (idToken) {
        try {
          payload = await idTokenVerifier.verify(idToken, {
            tokenUse: "id",
            clientId: process.env.COGNITO_CLIENT_ID ?? null,
          });
          console.debug("Used ID token as fallback for authentication");
        } catch (idErr: any) {
          console.warn("ID token fallback verification failed:", idErr?.message || idErr);
          throw accessErr;
        }
      } else {
        throw accessErr;
      }
    }

    let email = (payload as any).email as string | undefined;
    const sub = (payload as any).sub as string | undefined;
    const name = (payload as any).name as string | undefined;

    // If access token doesn't include email, try ID token from header
    if (!email) {
      const idToken = req.headers["x-id-token"] as string | undefined;
      if (idToken) {
        try {
          const idPayload = await idTokenVerifier.verify(idToken, {
            tokenUse: "id",
            clientId: process.env.COGNITO_CLIENT_ID ?? null,
          });
          email = (idPayload as any).email as string | undefined;
        } catch (e: any) {
          console.warn("ID token fallback verification failed", e?.message || e);
        }
      }
    }

    req.user = { email, sub, name };

    // ensure user exists in DB
    if (email) {
      let user = await findUserByEmail(email);
      if (!user) {
        user = await createUser(email, name, sub || "");
      }
      req.userRecord = user;
    }

    return next();
  } catch (err: any) {
    console.error("Auth verification failed:", err?.message || err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
