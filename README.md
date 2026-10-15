# Portfolio — Matéo Gonçalves Mota

Développeur d'applications en alternance à la **Fondation AMIPI** (Licence Informatique, ESUPEC Cholet).
🎓 **Recherche une alternance de 2 ans à partir de septembre 2027** pour un Master Informatique à l'Université d'Angers.

🔗 **https://kayzmat.github.io/Portfolio/**

---

## Contenu du site

| Page | Contenu |
|---|---|
| Accueil | Présentation, alternance en cours, projets sélectionnés, compétences, parcours |
| Parcours (`about.html`) | Présentation, expériences, diplômes, certifications, façon de travailler |
| Alternance / Stages | Études de cas : Base Méthodes, impression d'étiquettes, dématérialisation, WinDev |
| Projets | 9 projets filtrables (entreprise, web, mobile, applicatif, réseau) avec une fiche détaillée chacun |
| Compétences | Compétences reliées aux projets qui les prouvent, tableau de synthèse BTS |
| Veille | Low-code & no-code : chiffres Gartner, outils, comparatif, regard depuis WinDev, articles récents |
| Contact | Formulaire (FormSubmit), coordonnées, résumé de la recherche d'alternance |

## Technique

Site **100 % statique**, sans framework ni dépendance :

- **HTML sémantique** et accessible : lien d'évitement, navigation clavier, contrastes WCAG AA, `prefers-reduced-motion`.
- **CSS** organisé en design system (variables, composants), **thème clair / sombre** mémorisé sans flash.
- **JavaScript** léger et non bloquant : menu mobile, filtres de projets, aperçu des captures, copie de l'e-mail.
- **Veille** : articles récupérés via l'API publique de Dev.to, insérés sans `innerHTML` (pas d'injection possible).
- **SEO** : titres et descriptions uniques, URL canoniques, Open Graph, données structurées `Person`, `sitemap.xml`.
- **Performances** : captures compressées, chargement différé, dimensions d'images déclarées.

## Modifier le site

Les pages publiées sont générées à partir de `_src/` :

```
_src/partials/   head.html, header.html, footer.html (communs à toutes les pages)
_src/pages/      le contenu de chaque page, avec son titre et sa description
```

1. Modifier le fichier voulu dans `_src/`.
2. Régénérer les pages depuis la racine du dépôt :
   ```powershell
   powershell -ExecutionPolicy Bypass -File build.ps1
   ```
3. Commit et push : GitHub Pages publie automatiquement la branche `main`.

Le dossier `_src/` n'est pas publié (GitHub Pages ignore les dossiers commençant par `_`).

---

© 2026 Matéo Gonçalves Mota
