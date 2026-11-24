import { defineConfig } from 'vite';

import {embedStudyNotes} from './scripts/embed-study-notes.mjs';

// GitHub Pages serves this repository at /revise-1/.
export default defineConfig({
  plugins: [{name:'embed-study-notes',apply:'build',writeBundle(options){return embedStudyNotes(options.dir)}}],
  base: '/revise-1/',
});
