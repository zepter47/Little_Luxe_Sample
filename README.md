# Little Luxe

Published at https://zepter47.github.io/Little_Luxe_Sample/ using GitHub Pages,
with `feature-branch` and `/ (root)` as the publishing source.

## Development and deployment

Run `npm ci`, then `npm run dev`. The editable HTML entry is `app/index.html`.
The repository-root `index.html`, `assets/`, `404.html`, and SVG files are generated
deployment output. Do not edit these generated files directly.

`npm run deploy:prepare` builds the production app and copies it to the branch root.
Commit and push the result to `feature-branch` to publish it. The Build GitHub Pages
workflow also rebuilds when source files change, commits the output, and explicitly
requests a Pages rebuild. It requires Actions to be allowed to write repository contents.

`.env.pages` holds the public Supabase URL and browser publishable key. These values
are included in the browser bundle; never put a Supabase secret or service-role key there.

The router and assets use `/Little_Luxe_Sample/`. `404.html` redirects direct requests
through the entry point, which restores their path, query string, and fragment before
the app starts. This supports refreshes, nested routes, and email sign-in callbacks.

In Supabase Authentication → URL Configuration, use
`https://zepter47.github.io/Little_Luxe_Sample/` as the Site URL and allow
`https://zepter47.github.io/Little_Luxe_Sample/auth/callback` as a Redirect URL.
Keep any localhost redirect URLs needed for development.

## Original template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Authentication

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the environment (or an ignored `.env.local`). Use the browser-safe publishable/anon key, never a service-role key. In Supabase Authentication URL Configuration, allow the app's `/auth/callback` URL for each development and production origin. The default development callback is `http://localhost:5173/auth/callback`. Email registration must be enabled for new users to sign up through the same magic-link form.

Auth follows the existing feature structure in `src/features/auth`: `auth.api.ts` calls the Supabase client, `auth.query.ts` defines Query options and mutations, and `auth.types.ts` defines the minimal context. `useAuth` is mounted once by `appRouter`; it reads verified claims with `getClaims()` and refreshes Query state after Supabase auth events. Supabase manages the session and tokens. Claims calls run outside the auth event callback to avoid its session lock. Auth changes invalidate router guards and clear cached application queries on sign-in/sign-out.

The custom JWT `user_role` claim must contain `customer`, `staff`, or `admin`. Missing/unrecognized roles receive no management access. The storefront is public. Staff/admin can access existing item, category and supplier management; customers cannot see those controls or enter their routes. The existing `/category` page is a category creation form, so it is protected too. Database RLS/RBAC remains the authorization boundary and is not changed by these frontend guards.

`/login` handles both sign-in and registration. `/auth/callback` handles the magic-link return. Authenticated users get an avatar above the navigation links leading to `/profile`, which shows their email and a Query mutation for logout. Visitors get a sign-in/sign-up button at the bottom. `signInDialog` is reusable for future customer actions requiring authentication; it currently handles unsigned visits to `/profile`. This commit does not add a cart workflow or a project settings panel.
