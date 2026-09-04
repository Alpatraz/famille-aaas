# Famille AAAs — production

Cette arborescence contient la version Supabase/Netlify actuellement déployée.

- `public/` : client web complet, incluant le flux scolaire dans **Devoirs**.
- `netlify/functions/` : fonctions serveur Netlify.
- `tests/` : contrôles de non-régression du flux Devoirs.

La base opérationnelle reste Supabase. Notion conserve les sources scolaires et les automatisations n’insèrent que des éléments `reviewStatus: "pending"`; un adulte doit les valider avant leur apparition dans le Planning.
