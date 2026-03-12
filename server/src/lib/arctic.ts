import { Google } from 'arctic';
import { env } from '../env';

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.BACKEND_URL}/auth/google/callback`,
);
