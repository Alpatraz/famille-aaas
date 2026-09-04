# Famille AAAs — production

Cette arborescence contient la version Supabase/Netlify actuellement déployée.

- `public/` : client web complet, incluant le flux scolaire dans **Devoirs**.
- `netlify/functions/` : fonctions serveur Netlify.
- `tests/` : contrôles de non-régression du flux Devoirs.

La base opérationnelle reste Supabase. Notion conserve les sources scolaires et les automatisations n’insèrent que des éléments `reviewStatus: "pending"`; un adulte doit les valider avant leur apparition dans le Planning.

## Analyse Guillaume OS avec OpenRouter

La fonction `analyze-homework-plan` appelle directement OpenRouter, sans dépendre de Netlify AI Gateway.

- `OPENROUTER_API_KEY` : obligatoire, à enregistrer comme secret Netlify limité aux fonctions et à l’exécution.
- `OPENROUTER_MODEL` : facultatif; le modèle par défaut est `google/gemini-3.8-flash`.

Chaque requête impose le mode Zero Data Retention, refuse les fournisseurs qui collectent les données et exige la prise en charge native du schéma JSON. Les documents et réponses scolaires ne sont jamais écrits dans les journaux de la fonction.
