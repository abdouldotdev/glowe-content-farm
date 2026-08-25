#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exportSlides, favoriteModel, generateRemix, generateStudioRun, getCatalog, getHistory, listCtaOverlays, listPosts, markStylesForTiktok, reorderTrending, studioUrl, updateStyle, uploadCtaOverlay } from "../src/client.mjs";

const server = new McpServer({ name: "glowe-content-farm", version: "0.1.0" });
const result = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data });
const failure = (error) => ({ content: [{ type: "text", text: JSON.stringify({ ok: false, error: error.message }) }], isError: true });

server.registerTool("glowe_studio_status", {
  title: "État de Glowe Studio",
  description: "Retourne l’URL du Studio Glowe utilisé par ce MCP.",
  inputSchema: {}, annotations: { readOnlyHint: true },
}, async () => result({ ok: true, studioUrl: studioUrl(), service: "glowe-studio" }));

server.registerTool("glowe_studio_list_posts", {
  title: "Lister les posts Glowe Studio",
  description: "Liste les posts/slides disponibles dans le workspace TikTok du Glowe Studio.",
  inputSchema: {}, annotations: { readOnlyHint: true },
}, async () => { try { return result(await listPosts()); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_catalog", {
  title: "Catalogue complet Glowe Studio",
  description: "Retourne toutes les colonnes disponibles des tables categories, base_models, styles et content_generations, avec les relations de catégories.",
  inputSchema: { includeInactive: z.boolean().default(false) }, annotations: { readOnlyHint: true },
}, async ({ includeInactive }) => { try { return result(await getCatalog(includeInactive)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_history", {
  title: "Historique complet Glowe Studio",
  description: "Liste l’historique des générations Studio et des try-ons YCE de l’app, avec toutes les colonnes stockées, triées du plus récent au plus ancien.",
  inputSchema: { limit: z.number().int().min(1).max(200).default(50), source: z.enum(["all", "studio", "app"]).default("all"), status: z.string().optional() },
  annotations: { readOnlyHint: true },
}, async (input) => { try { return result(await getHistory(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_update_style", {
  title: "Modifier une coiffure Glowe",
  description: "Met à jour les colonnes éditables d’un style : nom, catégorie, tags, activation ou position trending.",
  inputSchema: { id: z.number().int().positive(), name: z.string().optional(), category_id: z.number().int().positive().nullable().optional(), tags: z.array(z.string()).optional(), is_active: z.boolean().optional(), trending_order: z.number().int().nullable().optional(), force: z.boolean().default(false) },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ id, ...body }) => { try { return result(await updateStyle(id, body)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_mark_styles_for_tiktok", {
  title: "Activer des styles pour TikTok",
  description: "Marque une liste de styles comme utilisable ou non dans TikTok Studio.",
  inputSchema: { ids: z.array(z.number().int().positive()).min(1), used: z.boolean() },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await markStylesForTiktok(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_reorder_trending", {
  title: "Réordonner les styles trending",
  description: "Attribue les positions trending aux styles Glowe.",
  inputSchema: { order: z.array(z.object({ id: z.number().int().positive(), trending_order: z.number().int().nonnegative() })).min(1) },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await reorderTrending(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_favorite_model", {
  title: "Gérer le favori d’un modèle IA",
  description: "Active ou désactive le favori d’un modèle du catalogue IA Glowe.",
  inputSchema: { modelId: z.string().min(1), isFavorite: z.boolean() },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await favoriteModel(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_plan_generation", {
  title: "Préparer une génération Glowe",
  description: "Sélectionne un base model et des styles selon le type de base (real par défaut, ai ou black), la catégorie, la longueur, le nom demandé et le support couleur. Retourne le plan exact avant de lancer une génération.",
  inputSchema: {
    modelType: z.enum(["real", "ai"]).default("real"), origin: z.string().optional(),
    styleCategory: z.string().optional(), length: z.string().optional(), query: z.string().optional(),
    withColor: z.boolean().default(false), quantity: z.number().int().min(1).max(50).default(7),
  }, annotations: { readOnlyHint: true },
}, async (input) => {
  try {
    const catalog = await getCatalog(false);
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const wantedType = input.modelType || "real";
    const baseCandidates = catalog.baseModels.filter((model) => {
      const type = model.model_type || (normalize(model.slug).startsWith("real-") ? "real" : "ai");
      return type === wantedType && (!input.origin || normalize(model.origin) === normalize(input.origin));
    });
    if (!baseCandidates.length) throw new Error(`Aucun base model ${wantedType}${input.origin ? ` pour ${input.origin}` : ""}`);
    const styleCandidates = catalog.styles.filter((style) => {
      const category = style.categories || {};
      const haystack = normalize(`${style.name} ${style.slug} ${(style.tags || []).join(" ")}`);
      const categoryMatch = !input.styleCategory || normalize(category.slug) === normalize(input.styleCategory) || normalize(category.name).includes(normalize(input.styleCategory));
      const lengthMatch = !input.length || haystack.includes(normalize(input.length));
      const queryMatch = !input.query || haystack.includes(normalize(input.query));
      const hasVariants = Array.isArray(style.variants) && style.variants.length > 0;
      return style.category_id != null && categoryMatch && lengthMatch && queryMatch && (!input.withColor || hasVariants);
    }).slice(0, input.quantity);
    if (!styleCandidates.length) throw new Error("Aucun style ne correspond aux critères");
    const picks = styleCandidates.map((style, index) => {
      const variant = input.withColor && Array.isArray(style.variants) ? style.variants[0] : null;
      return { key: variant ? `${style.id}:${variant.name || index}` : String(style.id), styleId: style.id, name: variant ? `${style.name} — ${variant.name}` : style.name, slug: style.slug, imageUrl: variant?.url || style.image_url, isVariant: Boolean(variant), usedForTiktok: style.used_for_tiktok !== false, categoryName: style.categories?.name };
    });
    return result({ ok: true, modelType: wantedType, baseModel: baseCandidates[0], styles: styleCandidates, picks, criteria: input });
  } catch (e) { return failure(e); }
});

server.registerTool("glowe_studio_generate_generation", {
  title: "Lancer une génération Glowe",
  description: "Lance le workflow TikTok Studio avec un base_model_id et les picks retournés par glowe_studio_plan_generation.",
  inputSchema: {
    baseModelId: z.number().int().positive(), picks: z.array(z.object({ key: z.string(), styleId: z.number().int(), name: z.string(), slug: z.string(), imageUrl: z.string().url(), isVariant: z.boolean(), usedForTiktok: z.boolean(), categoryName: z.string().optional() })).min(1).max(50),
    origin: z.string().default("black"), quantity: z.number().int().min(1).max(50).optional(), faceMethod: z.enum(["reface", "swap"]).default("reface"), look: z.enum(["naturel", "makeup"]).default("naturel"), environment: z.string().default("random"), pose: z.string().default("random"),
  }, annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await generateStudioRun(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_list_cta_overlays", {
  title: "Lister les CTA Glowe",
  description: "Liste les images CTA App Store disponibles dans Glowe Studio.",
  inputSchema: {}, annotations: { readOnlyHint: true },
}, async () => { try { return result(await listCtaOverlays()); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_upload_cta_overlay", {
  title: "Ajouter une image CTA Glowe",
  description: "Ajoute une image CTA au catalogue Glowe Studio. Demander confirmation avant l’écriture.",
  inputSchema: { name: z.string().min(1).max(100), imageBase64: z.string().min(20), contentType: z.string().default("image/png") },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await uploadCtaOverlay(input)); } catch (e) { return failure(e); } });

server.registerTool("glowe_studio_remix_slides", {
  title: "Remixer des slides avec Glowe Studio",
  description: "Transforme les slides fournies avec le workflow web Glowe : nouvelle identité, look, décor et pose. Retourne les URLs des slides remisées et le coût.",
  inputSchema: {
    slides: z.array(z.object({ url: z.string().url(), fileName: z.string().optional() })).min(1).max(30),
    origin: z.string().default("latina"), look: z.enum(["naturel", "makeup"]).default("makeup"),
    environment: z.string().default("random"), pose: z.string().default("random"),
    referenceImageUrl: z.string().url().optional(), useReferencePose: z.boolean().default(true), useReferenceBackground: z.boolean().default(true),
  }, annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ slides, ...options }) => {
  try { return result(await generateRemix({ slides: slides.map((s, i) => ({ ...s, index: i + 1 })), ...options })); } catch (e) { return failure(e); }
});

server.registerTool("glowe_studio_export_slides", {
  title: "Exporter les slides Glowe",
  description: "Applique les overlays texte et la slide CTA App Store aux résultats Glowe, puis crée un ZIP téléchargeable.",
  inputSchema: {
    results: z.array(z.object({ url: z.string().url(), fileName: z.string().optional(), index: z.number().int().optional() })).min(1).max(50),
    topText: z.string().max(200).default("Curious? See it on you ✨"),
    addCtaSlide: z.boolean().default(true), ctaPosition: z.enum(["penultimate", "last"]).default("penultimate"), ctaOverlayUrl: z.string().url().optional(),
  }, annotations: { readOnlyHint: false, destructiveHint: false },
}, async (input) => { try { return result(await exportSlides(input)); } catch (e) { return failure(e); } });

await server.connect(new StdioServerTransport());
