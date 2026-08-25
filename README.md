# Glowe Content Farm MCP

MCP privé et propre au Content Farm de Glowe. Il expose le workflow du Viral Remixer :
consulter les posts, remixer des slides, gérer les images CTA, appliquer le texte
de téléchargement et exporter un ZIP final.

Le serveur utilise `stdio` et appelle l’instance Glowe configurée par
`GLOWE_STUDIO_URL` (par défaut `https://glowe-studio.vercel.app`). Il ne s’agit
pas d’un MCP global ni d’un outil générique d’édition d’images.

Installation :

```bash
cd glowe-content-farm
npm install
GLOWE_STUDIO_URL=https://glowe-studio.vercel.app npm run mcp
```

Pour un Studio protégé, ajouter `GLOWE_STUDIO_TOKEN` dans l’environnement du
processus MCP.

Outils : `glowe_studio_status`, `glowe_studio_list_posts`,
`glowe_studio_catalog`, `glowe_studio_history`, `glowe_studio_plan_generation`,
`glowe_studio_generate_generation`,
`glowe_studio_list_cta_overlays`, `glowe_studio_upload_cta_overlay`,
`glowe_studio_remix_slides`, `glowe_studio_export_slides`,
`glowe_studio_update_style`, `glowe_studio_mark_styles_for_tiktok`,
`glowe_studio_reorder_trending`, `glowe_studio_favorite_model`.

Le prompt prêt à copier pour un agent est dans [`INSTALL_PROMPT.md`](./INSTALL_PROMPT.md).
