# Original source slide viewer

“View source slide” now opens one genuine full-slide/page image with previous/next navigation, a page picker and the existing enlarged-image zoom dialog. A Back to card button retains the current card, reveal state and study queue. Extracted text is available in a closed disclosure instead of being laid out as if it were the slide.

`public/source-slides/index.json` maps 44 bundled lecture IDs to 1,376 page references. Older decks reuse their existing whole-page screenshots. The newer PowerPoints were exported through LibreOffice, with hidden slides included, and rendered to WebP. Fonts can follow the rendering environment's available substitutes. PDFs use their original page layout. Word sources are rendered as documents, with pagination determined by that renderer.

The index is loaded when the source viewer is opened. It is separate from stored account decks, so existing saved lectures receive correct source previews without rewriting their cards, reviews, schedules or personal metadata. Source references for the split injury and inflammation lectures retain their original numbers. Neoplasia includes the original slide set and its additional outline pages. Corrected cardiovascular protocol cards point to the current 2026–27 handout; the handout's named-section cards map to relevant rendered pages.

Only local, validated source-image paths are accepted. A newly imported PDF keeps its whole-page image identifier, and older `pdf-N` embedded page images remain supported. A custom PowerPoint containing only extracted words and image fragments is explicitly labelled as lacking a complete preview; those fragments are not passed off as the original slide layout.

Verification: `npm test` checks every bundled card's source reference and image asset, including hidden-slide counts and split lecture numbering. `CHROMIUM_PATH=/usr/bin/chromium npm run test:sources:browser` checks full-slide display, page navigation, zoom, return to the same question and desktop/phone layout against the production preview on port 4189. Browser checks use fixture accounts.
