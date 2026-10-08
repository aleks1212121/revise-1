import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmissionFile,MAX_SLIDE_BYTES} from '../src/submission-file.js';
test('slide submissions accept PDF/PPTX and reject unsupported, empty, oversized and disguised files',async()=>{
 assert.equal((await validateSubmissionFile(new File(['%PDF-1.7\nslides'],'lecture.PDF'))).contentType,'application/pdf');
 assert.equal((await validateSubmissionFile(new File([new Uint8Array([80,75,3,4,1])],'lecture.pptx'))).extension,'pptx');
 await assert.rejects(validateSubmissionFile(new File([''],'empty.pdf')),/Choose/);
 await assert.rejects(validateSubmissionFile({name:'large.pdf',size:MAX_SLIDE_BYTES+1}),/20 MB/);
 await assert.rejects(validateSubmissionFile(new File(['%PDF-'],'lecture.html')),/PDF or PPTX/);
 await assert.rejects(validateSubmissionFile(new File(['<html>bad</html>'],'lecture.pdf')),/does not look like a PDF/);
 await assert.rejects(validateSubmissionFile(new File(['not zip'],'lecture.pptx')),/does not look like a PowerPoint/);
});
