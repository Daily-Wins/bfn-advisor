import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import {
  AUTH_AUTH0_ID,
  AUTH_AUTH0_SECRET,
  AUTH_AUTH0_ISSUER,
  AUTH_SECRET,
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Auth0({
      clientId: AUTH_AUTH0_ID,
      clientSecret: AUTH_AUTH0_SECRET,
      issuer: AUTH_AUTH0_ISSUER,
    }),
  ],
  secret: AUTH_SECRET,
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
