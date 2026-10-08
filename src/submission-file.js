export const SUBMISSION_BUCKET='lecture-submissions';
export const MAX_SLIDE_BYTES=20*1024*1024;
export async function validateSubmissionFile(file){
 if(!file||!file.size)throw Error('Choose a PDF or PowerPoint slide file.');
 if(file.size>MAX_SLIDE_BYTES)throw Error('Slides must be 20 MB or smaller.');
 if(file.name.length>240)throw Error('Shorten the file name to 240 characters or fewer.');
 const extension=file.name.toLowerCase().split('.').pop();
 if(!['pdf','pptx'].includes(extension))throw Error('Send a PDF or PPTX file.');
 const bytes=new Uint8Array(await file.slice(0,1024).arrayBuffer());
 if(extension==='pdf'&&!new TextDecoder().decode(bytes).includes('%PDF-'))throw Error('This file does not look like a PDF. Export your slides as PDF and try again.');
 if(extension==='pptx'&&!(bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4))throw Error('This file does not look like a PowerPoint PPTX file.');
 return {extension,contentType:extension==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
}
