# Prompt d’installation pour un agent

Installe le MCP privé Glowe Content Farm dans le workspace du projet.

1. Depuis la racine du dépôt cloné `glowe-content-farm`, exécute `npm install`.
2. Configure le serveur MCP `glowe_content_farm` en stdio avec la commande absolue `node /CHEMIN_ABSOLU/glowe-content-farm/bin/mcp-server.mjs`.
3. Passe `GLOWE_STUDIO_URL=https://glowe-studio.vercel.app` dans l’environnement du serveur. Si une authentification est activée, passe aussi `GLOWE_STUDIO_TOKEN` sans l’écrire dans un fichier versionné.
4. Redémarre le client MCP puis vérifie avec `glowe_studio_status` et `glowe_studio_list_posts`.
5. Pour un workflow de slides, utilise cette séquence :
   - `glowe_studio_list_posts` pour choisir les slides ;
   - `glowe_studio_remix_slides` pour appliquer le remix Glowe ;
   - `glowe_studio_list_cta_overlays` pour choisir une image CTA ;
   - `glowe_studio_export_slides` pour appliquer le texte, insérer la slide CTA et produire le ZIP.
6. Pour répondre à une demande d’historique, utilise `glowe_studio_history` avec `source=all` par défaut. Pour inspecter les données, utilise `glowe_studio_catalog`, qui retourne les colonnes complètes et les relations disponibles.

Ce MCP est spécifique à Glowe Studio. Ne le remplace pas par un MCP global d’édition d’images. Demande confirmation avant `glowe_studio_upload_cta_overlay` et avant tout export qui écrit un fichier distant.
