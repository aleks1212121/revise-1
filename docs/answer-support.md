# Answer support visuals

`src/answer-visuals.json` is a presentation-only index for bundled lecture cards. It replaces arbitrary first-image attachments with supporting excerpts from the card's own source page. An empty entry deliberately suppresses an uncertain attachment. The index currently covers 2,704 ordinary notes, with 185 notes linked to 157 shared excerpts. Source page numbers are displayed with each excerpt. Full original pages remain available through View source slide.

Excerpt selection checks the missing answer and surrounding factual context against native text on the referenced page. Excerpts use original page coordinates. Whole-page diagrams are included only for selected concepts (for example, the hypothalamus, blastocyst, chromosome structure and lipid metabolism). The process is deliberately conservative; most notes have no inline picture. Sources with corrections or ambiguous diagrams are excluded rather than repeating misleading source content. Image occlusion/visual recall notes retain their labelled and masked images.

The adapter runs only during rendering, including for existing saved decks. It does not modify schedules, progress, stored media or synced content. Content fingerprints ensure locally edited cards keep their own attachments; cards outside the bundled index are unchanged. Assets are local WebP images, with no external image requests or API keys.

When extending this index, inspect the original source and the proposed excerpt for scientific relevance, preserve stable card IDs and source numbering, and update the content fingerprint. Do not select an image solely because it is the first image on a page. The source slide viewer is the fallback when a useful inline image cannot be identified.
