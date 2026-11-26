// Kingston 2026–27 assessment briefs and module roadmaps, checked 26 November 2026.
// File IDs open authenticated Canvas previews. No download verifiers or personal timetable data.
export const courses={
 LS5008:[38831,'Infection and Immunity'], LS5009:[38827,'Pathobiology'],
 LS5023:[38850,'Medical Genetics'], LS5034:[38856,'Medical Physiology, Research Methods and Skills']
};

function lecture(title,page,decks=[],files=[],availability=''){
 return {title,page,decks,files,availability};
}
const pending=(title,page='module-roadmap')=>lecture(title,page,[],[],'Slides not yet available');
const safety=lecture('Laboratory safety and CoSHH','coshh-and-risk-assessment',['lab-safety'],[[7666320,'Safety lecture']]);
const practical=lecture('Microbiology practical','microbiology-practical-tb1',['microbiology-practical'],[[7800246,'Practical booklet']]);
const abo=pending('ABO blood grouping practical and preparation','practicals-and-workshops');
const microbiology=[
 lecture('Module introduction','module-introduction',[],[[7837073,'Slides']]),safety,
 lecture('Revisiting microorganisms','revisiting-microorganisms',['microorganisms'],[[7861892,'Slides']]),
 lecture('Revisiting viruses','revisiting-microbes-viruses',['viruses'],[[7865837,'Slides']]),
 lecture('The human microbiome','the-human-microbiome',['human-microbiome'],[[7879715,'Slides']]),
 lecture('Epidemiology and infection spread','epidemiology-and-infection-spread',['epidemiology-infection-spread'],[[7891618,'Slides']]),
 lecture('Medically important bacterial infections','medically-important-bacterial-infections',['bacterial-infections'],[[7908229,'Slides without clinical images'],[7908221,'Slides with clinical images']]),
 lecture('Medically important viruses','medically-important-viruses-2',['medically-important-viruses'],[[7899490,'Slides']]),
 lecture('Exotoxins and virulence factors','exotoxins',['virulence-factors'],[[7927396,'Slides']]),
 lecture('Endotoxins','endotoxins',['endotoxins'],[[7868166,'Slides']]),
 lecture('Disinfection','disinfection',[],[[7665977,'Slides']]),
 lecture('Sterilisation','sterilisation',['sterilisation'],[[7910482,'Slides']]),
 lecture('Vaccination','vaccination',['principles-of-vaccination'],[[7960425,'Slides']]),
 pending('Antimicrobial chemotherapy'),practical,
 lecture('Workshops and case-study preparation','practicals-and-workshops')
];
const immunology=[
 pending('Introduction to immunology, cells, organs, antibodies and antigens','innate-immunity'),
 pending('Innate receptors and phagocytosis','innate-immunity'),pending('Complement','innate-immunity'),
 pending('Cytokines and extravasation','innate-immunity'),pending('Inflammatory cytokines and sepsis','innate-immunity'),
 pending('Antibody structure and function'),pending('Antibody diversity and B-cell development'),
 pending('B-cell activation and class switching'),pending('MHC and antigen presentation'),
 pending('T-cell activities and subsets'),abo,lecture('Workshops and case-study preparation','practicals-and-workshops')
];
const genetics=[
 lecture('Introduction to medical genetics','introduction-to-medical-genetics',['medical-genetics-introduction'],[[7849197,'Slides']]),
 lecture('Molecular and cellular basis of inheritance','molecular-and-cellular-basis-of-inheritance',[],[[7553864,'Lecture slides']]),
 lecture('Genetic variation and inheritance','genetic-variation-inheritance-and-the-hgp',['genetic-variation','modes-of-inheritance','inheritance-clarification'],[[7866014,'Genetic variation'],[7878788,'Modes of inheritance'],[7554097,'Inheritance clarification'],[7554100,'Recap slides']]),
 lecture('Human Genome Project','genetic-variation-inheritance-and-the-hgp',['human-genome-project'],[[7554098,'Slides']]),
 lecture('Normal variation and population genetics','population-genetics',['population-genetics-1','population-genetics-2'],[[7554166,'Lecture I'],[7553734,'Lecture II'],[7554099,'Practice problems']]),
 lecture('Chromosomal abnormalities','genetic-diseases',['chromosomal-abnormalities-1','chromosomal-abnormalities-2'],[[7938408,'Part I'],[7956681,'Part II']]),
 pending('Haemoglobinopathies','genetic-diseases'),pending('Monogenic diseases','genetic-diseases')
];
const pathology=[
 lecture('Cell injury and cell death','cell-injury-lecture-1-and-2',['cell-injury','cell-injury-2','cell-death'],[[7820522,'Cell injury I & II'],[7820525,'Cell death']]),
 lecture('Neoplasia','neoplasia-lectures',['neoplasia'],[[7306122,'Slides']]),
 lecture('Acute and chronic inflammation','acute-and-chronic-inflammation-lecture-1-and-2',['inflammation-acute','inflammation-chronic'],[[7306353,'Lectures I & II']]),
 lecture('Epidemiology','epidemiology-lectures',['pathobiology-epidemiology'],[[7962488,'Current lecture slides']]),
 lecture('Genetics in pathobiology','genetics-lectures',['pathobiology-molecular-pathology','pathobiology-gene-therapy'],[[7306313,'Molecular pathology'],[7306296,'Gene therapy'],[7306297,'Genetics and ethics']]),
 lecture('Tissue processing and imaging','tissue-processing-lectures-annotated',[],[[7829689,'Processing and sectioning'],[7829690,'Staining'],[7829692,'Histochemistry'],[7829699,'Imaging and electron microscopy']]),
 lecture('Cytopathology','cytopathology-lectures-1-and-2',[],[[7306346,'Lecture I'],[7306349,'Lecture II'],[7306179,'Lecture II supplement']]),
 lecture('Exam revision','revision-sessions-and-exam-practice',[],[[7306350,'Revision slides'],[7306301,'Genetics revision']])
];
const physiology=[
 lecture('Introduction to physiology and the assessment','introduction-to-module',[],[[7842599,'Slides']]),
 lecture('Non-communicable diseases and metabolism','non-communicable-diseases-slash-whole-body-substrate-metabolism',['non-communicable-diseases','substrate-metabolism','glucose-metabolism','lipid-metabolism'],[[7687863,'Non-communicable diseases'],[7876852,'Substrate metabolism'],[7876855,'Glucose metabolism'],[7876759,'Lipid metabolism']]),
 lecture('Coronary artery disease','coronary-artery-disease',['coronary-artery-disease'],[[7888422,'Lecture'],[7889830,'Annotated slides'],[7642225,'Cholesterol table']]),
 lecture('Heart failure','heart-failure-2',['heart-failure'],[[7912340,'Annotated slides']]),
 lecture('Reproductive physiology and embryology','reproductive-physiology-and-embryonic-development-2',['female-reproductive-physiology','embryonic-development'],[[7642415,'Embryonic development']],'Female and male reproductive physiology slides open through the lecture page.'),
 lecture('Obesity and weight-lowering drugs','obesity-and-weight-lowering-drugs',['anti-obesity-drugs'],[[7944918,'Annotated slides']]),
 lecture('Motor and sensory physiology','neurophysiology',[],[[7642412,'Motor physiology'],[7642428,'Sensory physiology'],[7642417,'Motor physiology questions']]),
 lecture('Cardiovascular practical','cardiovascular-practical',['cardiovascular-practical','cardiovascular-practical-handout'],[[7889854,'2026–27 handout']]),
 lecture('Sensory physiology practical','sensory-physiology-practical',[],[[7642429,'Protocol'],[7641647,'Worksheet']]),
 lecture('Revision and practice questions','revision-combined-topics',[],[[7642386,'Neurophysiology revision']])
];
const stats=[
 lecture('Introduction to R and RStudio','biostatistics-session-1-introduction-to-r-and-rstudio'),
 lecture('Basic statistical principles and t-tests','statistics-lecture-1',[],[[7748262,'Lecture'],[7748339,'Workshop · t-tests']]),
 lecture('Analysis of variance','statistics-lecture-2-analysis-of-variance',[],[[7748345,'Lecture'],[7748337,'Workshop · ANOVA']]),
 lecture('Correlation and regression','statistics-lecture-3-correlation-and-regression',[],[[7748347,'Lecture'],[7748109,'Workshop · relationships']]),
 lecture('Categorical data','statistics-lecture-4-categorical-data',[],[[7748265,'Lecture'],[7748350,'Workshop · categorical tests']]),
 lecture('Choosing a statistical test','decision-trees',[],[[7748033,'Differences'],[7748138,'Relationships'],[7748171,'Categorical data']]),
 lecture('R code for statistical tests','r-code-for-statistical-tests'),lecture('Practice test','biostatistics-practice-test')
];
function exam(id,module,title,date,scope,brief,lectures){
 return {id,module,title,date,scope,brief,lectures};
}
export const exams=[
 exam('micro-practical','LS5008','Microbiology practical MCQ','Group E/F · 27 Nov 2026 | G/H · 11 Dec 2026','25%. Revise the practical principles, observations and interpretation. A/B and C/D sat earlier. Use your allocated group’s sitting.','pages/assessment-and-feedback-schedule',[practical,safety]),
 exam('genetics-mcq','LS5023','Medical Genetics MCQ','13 Jan 2027 · 10:00','30%. Closed book, 30 single-best-answer questions in 60 minutes. Covers the TB1 lectures. Practical-related work is excluded by the exam brief.','pages/assessment-1-info-tb1-mcq-test',genetics),
 exam('micro-case','LS5008','Microbiology case-study assessment','14 Jan 2027','25%. Revise the entire TB1 microbiology block, including workshops and practical learning. The two case studies provide context and questions can cover the wider block.','pages/assessment-and-feedback-schedule',microbiology),
 exam('physiology','LS5034','Medical Physiology open-book assessment','Submission deadline · 21 Jan 2027, 23:59','50%. Three-hour open-book assessment with MCQs, short answers and a long answer. These are the TB1 physiology roadmap lectures and practical resources.','assignments/223032',physiology),
 exam('abo','LS5008','ABO immunology practical MCQ','A · 27 Jan | B · 3 Feb | C · 10 Feb | D · 24 Feb | E · 4 Mar | F · 10 Mar 2027','25%. Prepare for the blood-grouping practical and interpretation of results. Check your personal timetable for your group.','pages/assessment-and-feedback-schedule',[abo,pending('Antibodies and antigens','innate-immunity')]),
 exam('biostatistics','LS5034','Biostatistics test','14 Apr 2027 · 09:00–12:00','15%. Two timed online problems, up to 45 minutes each. Revise the lectures alongside the R workshops and test-selection guidance.','pages/biostatistics-test',stats),
 exam('immunology-case','LS5008','Immunology case-study assessment','21 Apr 2027','25%. The case studies draw on the entire TB2 immunology block, including lectures, workshops and practical learning.','pages/assessment-and-feedback-schedule',immunology),
 exam('genetics-final','LS5023','Medical Genetics final exam','Exam period · date and time to be confirmed','50%. Closed book. Answer three of five questions on TB2 lecture content.','pages/assessment-3-info-final-exam',[
 pending('Multifactorial inheritance and polygenic disease','genetic-diseases'),
 lecture('Molecular and cytogenetic techniques and diagnostic testing','molecular-and-cytogenetic-techniques',[],[[7553995,'Part I'],[7554146,'Part II']]),
 pending('Bioinformatics lecture'),pending('Ethical issues in genetic testing and counselling'),
 lecture('Emerging trends','emerging-trends-in-medical-genetics',[],[[7554147,'CAR T and cancer'],[7554144,'Gene editing']]),
 lecture('Pharmacogenetics and personalised medicine','pharmacogenomics-and-personalised-medicine-2',[],[[7554148,'Slides']])]),
 exam('pathobiology-final','LS5009','Pathobiology final exam','Date and time to be confirmed','50%. The revision page identifies the topic groups below. The teaching team will refine coverage later in the year.','pages/revision-sessions-and-exam-practice',pathology),
 exam('breast-practical','LS5009','Breast cancer practical test','Earlier sitting · October 2026','25%. Breast anatomy, histology, pathogenesis, tumour types and markers. Retained for revision. Any reassessment depends on your individual arrangements.','pages/assessment-and-feedback',[lecture('Breast cancer practical and revision','practical-1-breast-cancer',['breast-cancer-lecture','breast-cancer-practical','breast-cancer-revision'],[[7306312,'Lecture'],[7306107,'Practical booklet'],[7306129,'Breast cancer pathology']])])
];
