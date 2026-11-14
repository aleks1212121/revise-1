// Reviewed outlines of the accompanying lecture/practical decks.
const sheets={
'lab-safety':[
 ['Exposure routes','Microbes can enter by ingestion, inhalation, damaged skin/sharps or the conjunctiva.','Aerosols can be produced without a visible spill; eye splashes and contaminated fingers are separate exposure routes.'],
 ['Asepsis','Aseptic practice protects personnel and prevents unwanted contamination of cultures.','No mouth pipetting; use appropriate protective equipment and wash hands before leaving.'],
 ['Risk and containment','HG1–HG4 describe increasing agent hazards; laboratory containment describes the controls for an activity.','The lecture’s numerical pairing is a simplification: the actual work and risk assessment determine controls.'],
 ['Cabinets and oversight','Cabinet protection depends on correct selection, installation, airflow, use and maintenance.','HSE is the regulator; ACDP provides biological-hazard advice, and the BSO supports local safety.'],
 ['Modification and transport','Genetic changes can alter an organism’s hazard, so reassess human, animal and environmental risks.','Use current institutional and legal guidance. The uploaded slides contain historical transport and classification statements.']
],
'human-microbiome':[
 ['Define and measure','Microbiota are the organisms; microbiome includes their collective genes and activities.','16S profiling examines bacterial communities; metagenomics examines wider genetic potential, while culture recovers only a subset.'],
 ['Gut benefits','Gut microbes ferment dietary components and produce metabolites including short-chain fatty acids.','Resident communities support immune development and colonisation resistance through competition and inhibitory products.'],
 ['Distinct habitats','Skin, mouth, vagina, respiratory and urinary sites support different communities; low biomass is different from sterility.','Lactobacillus-associated lactic acid helps maintain vaginal acidity; dental plaque is an organised biofilm.'],
 ['Evaluate sterile-site claims','No established healthy resident microbiome is demonstrated in brain or kidney; liver exposure to gut products is not liver colonisation.','Blood and placental microbiome claims require rigorous contamination controls; detection alone is not proof of a stable community.'],
 ['Dysbiosis and intervention','Antibiotics can disturb community diversity and weaken protection against opportunistic infection.','FMT is important for recurrent C. difficile; probiotics supply organisms, prebiotics supply substrates. Disease associations do not alone prove causation.']
],
'bacterial-infections':[
 ['Healthcare and food','Pseudomonas is a wet-environment biofilm-forming opportunist; Acinetobacter baumannii is important on healthcare equipment and surfaces.','Campylobacter is strongly associated with poultry; Salmonella has animal gastrointestinal reservoirs, and E. coli has multiple pathotypes.'],
 ['Tuberculosis','M. tuberculosis is the principal TB organism, with humans its main natural reservoir.','Its mycolic-acid-rich envelope is a distinctive structural feature; pulmonary disease is important but not exclusive.'],
 ['Ulcer syndromes','Primary syphilis classically has a painless chancre; chancroid from H. ducreyi is usually painful.','Latent syphilis is clinically silent but detectable serologically; donovanosis is associated with Donovan bodies.'],
 ['Genital pathogens','Ureaplasma and M. genitalium lack a cell wall; carriage and causation must be distinguished.','Gonorrhoea and chlamydia can be asymptomatic. N. meningitidis can also cause genital infection despite its usual meningitis association.'],
 ['Shigella and interpretation','Shigella has a low infectious dose and faecal–oral transmission, including sexual exposures; tenesmus and dysentery are key symptoms.','Culture/PCR require context: ipaH is not completely Shigella-specific, and geographic case maps can reflect sampling bias.']
],
'sterilisation':[
 ['Endpoints','Sterilisation removes or destroys viable microbes including endospores; routine disinfection does not reliably achieve that endpoint.','SAL is probabilistic assurance. Commercial sterility refers to organisms able to grow under the intended storage conditions.'],
 ['Heat and validation','Steam denatures proteins; pressure permits high-temperature steam, while dry heat uses oxidation and denaturation.','Physical records, chemical indicators and biological challenges answer different questions. Changed autoclave tape alone does not prove a sterile load.'],
 ['Filtration and radiation','Filtration removes organisms rather than killing them; ordinary bacterial filters do not guarantee removal of all viruses.','UV has poor penetration and shadow limitations. Gamma, electron-beam and X-ray processing differ in penetration, equipment and compatibility.'],
 ['Chemical mechanisms','Ethylene oxide alkylates; peroxide and ozone oxidise; formaldehyde cross-links; gas-plasma processes generate radicals.','Peracetic acid is a liquid oxidising sterilant for compatible devices. Low-temperature processing still needs validated exposure and safe handling.'],
 ['Choose the method','UHT and retorting target food commercial sterility, not a universal medical-device endpoint.','Match the process to the load, material, packaging and required assurance while controlling heat, pressure, chemical and radiation hazards.']
],
'medical-genetics-introduction':[
 ['Classify disease','Distinguish chromosome-level, single-gene, multifactorial and mitochondrial disorders.','Genetic is not synonymous with inherited, and congenital means present at birth rather than necessarily genetic.'],
 ['Genome organisation','Genes are functional DNA sequences at chromosomal loci; chromatin includes DNA and associated proteins.','DNA sequence, double-helical structure and higher-order packaging are different levels of organisation.'],
 ['Express information','Transcription copies DNA information into RNA; translation reads mRNA to build a polypeptide.','Codons have three bases; AUG ordinarily initiates methionine incorporation, but the initiating residue can later be removed.'],
 ['Recognise examples','CFTR is linked with cystic fibrosis; factor VIII deficiency causes haemophilia A.','Sickle cell disease affects red cells; Huntington disease and Tay–Sachs illustrate distinct neurological single-gene disorders.'],
 ['Avoid broad assumptions','Type 2 diabetes centres on insulin resistance, while type 1 involves autoimmune loss of insulin-producing cells.','MODY is monogenic; mtDNA electron-transport variants illustrate mitochondrial disease. A broad clinical label can include different mechanisms.']
],
'modes-of-inheritance':[
 ['Mendel and extensions','Segregation separates alleles into gametes; independent assortment applies to unlinked or sufficiently separated loci.','Incomplete dominance gives an intermediate phenotype; codominance expresses distinguishable products of both alleles.'],
 ['Autosomal recessive risks','Aa × Aa gives 1/4 affected, 1/2 carriers and 1/4 unaffected non-carriers per pregnancy.','Among unaffected children of that cross, 2/3 are carriers. Each pregnancy is an independent event.'],
 ['Autosomal dominant risks','Aa × aa gives a 1/2 transmission probability in the simple dominant model.','Vertical transmission is suggestive; reduced penetrance, new variants and small family size can obscure a pedigree.'],
 ['Sex-linked inheritance','A father does not ordinarily transmit his X to sons; hemizygosity helps explain X-linked recessive expression in XY individuals.','An affected father transmits an X-linked dominant allele to daughters, while a heterozygous mother transmits it to half of children on average.'],
 ['Read pedigrees critically','Use symbols, relationships, sex distribution and generations together rather than guessing from one affected person.','Y-linked transmission follows fathers to sons. Expressivity concerns severity; penetrance concerns whether a phenotype is expressed.']
],
'human-genome-project':[
 ['Reference purpose','The HGP established a human-genome reference for understanding genes and variation.','Its multi-donor reference is not one universally representative person or complete knowledge of gene function.'],
 ['Mapping','Genetic maps use inheritance/recombination relationships; physical maps locate DNA features physically.','RFLPs are markers based on restriction-fragment length differences, often because variants alter recognition sites.'],
 ['Prepare DNA','PCR amplifies selected regions; BACs and YACs maintain cloned DNA fragments.','Amplification and cloning supply material, while sequencing determines base order.'],
 ['Read a sequence','Shotgun assembly uses overlaps among fragments to reconstruct longer sequences.','Sanger sequencing uses terminated chains of different lengths to infer nucleotide order.'],
 ['Use the reference','Applications include disease-gene research, genetic testing, pharmacogenomics and personalised medicine.','Forensic identification and evolutionary comparisons use informative variation; donor anonymity protects genetic privacy.']
],
'population-genetics-1':[
 ['Sequence and repeats','SNPs are single-base polymorphisms; repeat-number changes produce length variation.','Distinguish repeat-unit size from the number of units and the total array length.'],
 ['Generate variation','Polymerase slippage and unequal recombination can change repeat counts.','Transposons are mobile-element sequences, although most human transposon-derived copies no longer actively move.'],
 ['Structural terminology','Copy-number variation involves gains or losses of segments; not every structural change alters copy number.','An inversion can be balanced, while indels can overlap sequence, length and structural categories.'],
 ['Follow DNA blocks','Linkage disequilibrium is non-random allele association; a haplotype labels a set of variants on one segment.','Related haplotypes form haplogroups. Markers can act as shortcuts for tracking larger inherited regions.'],
 ['Interpret ancestry','Mitochondria track a maternal lineage and non-recombining Y tracks a paternal lineage, omitting most ancestry.','Mitochondrial Eve and Y-MRCA were not necessarily contemporaries or the only people alive; lineage ancestry differs from whole-genome genealogy.']
],
'chromosomal-abnormalities-1':[
 ['Number versus structure','Aneuploidy changes individual chromosome numbers; polyploidy changes complete sets.','Nondisjunction can cause numerical errors; triploidy typically has 69 chromosomes.'],
 ['Read a karyotype','Use size, banding and centromere position to identify chromosomes; count and sex-chromosome notation have distinct meanings.','p is the short arm and q the long arm; band numbers increase away from the centromere.'],
 ['Autosomal examples','Down syndrome involves chromosome 21 material, Edwards trisomy 18 and Patau trisomy 13.','Most free trisomy 21 arises through nondisjunction; maternal age affects risk without determining any individual outcome.'],
 ['Sex-chromosome examples','Common complements are 47,XXY, 45,X, 47,XYY and 47,XXX; mosaic and structural forms also exist.','Clinical features vary. The source’s universal intellect, fertility and aggression claims are inappropriate generalisations.'],
 ['Dosage and mosaicism','X inactivation contributes dosage compensation and can produce a Barr body.','Some genes escape silencing and tissues can have skewed X inactivation, explaining why compensation is not complete or perfectly 50:50.']
],
'non-communicable-diseases':[
 ['Define the category','NCDs are not directly transmitted between people; many have long duration.','An infectious contributor to a cancer does not make the cancer itself directly contagious.'],
 ['Major groups','Cardiovascular, cancer, diabetes and chronic respiratory disorders are major groups.','NCDs affect younger people as well as older adults.'],
 ['Multimorbidity','Two or more long-term conditions constitute multimorbidity.','Interacting conditions complicate single-disease treatment pathways and affect wellbeing.'],
 ['Risk and causes','Genetic, physiological, behavioural and environmental factors interact.','Modifiable factors include smoking, inactivity, diet and harmful alcohol exposure; age and family history inform baseline risk.'],
 ['Prevention','Health promotion, appropriate screening, early detection and treatment have complementary roles.','A risk factor changes probability rather than guaranteeing disease; historical population estimates are not personal predictions.']
],
'substrate-metabolism':[
 ['Fuel handling','Catabolism releases energy from breakdown; anabolism uses energy for synthesis.','Glucose, fatty acids, amino acids and ketones supply different needs and can participate in substrate interconversion.'],
 ['Prandial states','Absorptive metabolism handles incoming nutrients; postabsorptive metabolism increasingly uses endogenous stores.','The lecture’s time boundaries are approximate, with prolonged fasting treated separately.'],
 ['Coordinate organs','Whole-body metabolism asks where fuel comes from, where it goes and how organs share it.','Hormonal signals coordinate liver, muscle and adipose stores to maintain circulating fuel concentrations.'],
 ['Energy conservation','Intake minus expenditure changes stored energy; intake equals output only when stores are stable.','Energy emerges as work, storage and heat; fat stores are much larger by mass than glycogen stores.'],
 ['Dysregulation','Chronic positive energy balance and disrupted partitioning can contribute to obesity and insulin resistance.','Appetite has homeostatic, reward and environmental influences; metabolic disease involves impaired substrate control rather than simply personal choice.']
],
'glucose-metabolism':[
 ['Hormonal signals','Glucose stimulates insulin; GLP-1/GIP support the incretin response. Hypoglycaemia stimulates glucagon.','Glucagon supports hepatic glycogenolysis and gluconeogenesis, while insulin tends to suppress endogenous production.'],
 ['Balance glucose','At steady concentration, dietary plus endogenous appearance equals clearance.','Gluconeogenesis is already part of endogenous production, so do not count it twice.'],
 ['Transport and storage','Insulin recruits GLUT4 to muscle/adipose membranes; hepatic glucose entry is not directly insulin-dependent.','Liver glycogen supports circulating glucose; muscle glycogen primarily serves muscle. The liver buffers glucose across meals.'],
 ['Resistance','Reduced insulin responsiveness can impair peripheral clearance and suppression of hepatic production simultaneously.','Different tissues and pathways need not be equally resistant; sensitivity and maximum responsiveness are distinct.'],
 ['Interpret the whole body','A right-shifted dose–response indicates that more insulin is needed for a comparable response.','Exercise and sustained weight management can improve sensitivity; the slide’s inevitable-insulin treatment claim is not a universal clinical pathway.']
],
'lipid-metabolism':[
 ['Basic structures','Triglycerides contain glycerol plus three fatty acids; saturation concerns carbon–carbon double bonds.','Lipids provide fuel, membrane components and signalling precursors.'],
 ['Adipose function','Adipose tissue is endocrine as well as a storage organ.','Inflammatory dysfunction and excessive fatty-acid release can promote ectopic lipid deposition and insulin resistance.'],
 ['Transport','Non-esterified fatty acids travel mainly with albumin; triglycerides and cholesterol travel in lipoproteins.','Lipoproteins have a hydrophobic core and surface phospholipid monolayer with apolipoproteins.'],
 ['Compare particles','Intestinal chylomicrons carry dietary fat and apoB-48; hepatic VLDL carries endogenous lipids and apoB-100.','Chylomicrons reach circulation via lymph; particle origin differs even when both are triglyceride-rich.'],
 ['Mobilise and interpret','LPL acts on circulating triglyceride-rich particles; ATGL/HSL mobilise stored adipocyte lipid.','Post-meal lipaemia is prolonged exposure that a fasting sample can miss. Turbid plasma is a clue, not a complete diagnosis.']
],
'research-methods-introduction':[
 ['Synthesis','Research requires combining evidence from multiple sources into a reasoned account.','Critical evaluation considers quality and implications rather than merely describing findings.'],
 ['Problem formulation','Insight statements motivate a literature review and a clear problem statement.','Multidisciplinary collaboration brings complementary perspectives to complex problems.'],
 ['Data analysis','Hypothesis testing should be linked to the experimental design.','R is the analysis language; RStudio is a working environment rather than a different statistical theory.'],
 ['Communication','Match the form and detail of scientific communication to the audience.','An infographic offers a concise visual account, complementing longer written analysis.'],
 ['Reflection','Critical reflection evaluates progress, evidence of learning and goals.','Use that analysis to guide future action rather than producing only a chronology of activities.']
],
'scientific-method-design-thinking':[
 ['Different purposes','Scientific method tests hypotheses and generates evidence-based knowledge.','Design thinking develops practical solutions grounded in users’ needs.'],
 ['Scientific reasoning','Observe a knowledge gap, formulate a falsifiable hypothesis, and design an appropriate experiment.','Analyse evidence and draw bounded conclusions; unsupported predictions can guide revision rather than proving the process failed.'],
 ['Frame a design problem','Empathise/discover gathers user perspectives; define produces a problem statement.','An open problem statement leaves room for different solutions rather than dictating one product too early.'],
 ['Iterate','Ideation generates alternatives; prototypes make ideas testable.','User testing supplies feedback that can refine the design or reframe the problem.'],
 ['Combine approaches','A device needs valid biological measurement and workable everyday usability.','Scientific testing and user-centred design complement one another; accuracy alone does not guarantee adoption.']
],
'genetics-practical-overview':[
 ['Workflow','Testing connects a sample with an interpreted clinical result.','Extraction, amplification, product checking and sequencing answer different questions.'],
 ['Extract and clean','Detergent disrupts membranes; proteinase and RNase address other cellular material.','Silica binding retains DNA, and elution returns it to solution. Track the correct fraction at each stage.'],
 ['Quality and controls','Assess purity as well as amount before downstream reactions.','A no-template control substitutes water for template to reveal contamination.'],
 ['Product checking','The gel reveals product presence and apparent length relative to a ladder.','A labelled image is useful evidence; a band alone does not identify a pathogenic variant.'],
 ['Sequencing','Amplification uses both primers together; the practical prepares forward and reverse sequencing reactions separately.','The PCR amplicon supplies sequencing template, connecting the wet-lab stages.']
],
'genetics-practical-1':[
 ['Disease targets','CFTR affects chloride transport; HBB encodes beta-globin.','PAH encodes phenylalanine hydroxylase; HEXA encodes a hexosaminidase-A subunit.'],
 ['Track the sample','Transfer clarified DNA-containing supernatant to the column while avoiding debris.','During washing retain column-bound DNA; after elution retain the eluate.'],
 ['Cleanup','Ethanol-containing wash removes contaminants, and the extra spin reduces wash carry-over.','A concentrated sample can still be impure or unsuitable for amplification.'],
 ['Quantification','Blank with the elution buffer and distinguish concentration from A260/A280 purity.','Pool only same-source samples as directed; combining patients compromises later variant attribution.'],
 ['PCR interpretation','The sample contains DNA and the NTC contains water with otherwise comparable components.','A contaminated NTC undermines interpretation; two absent bands do not establish a normal genotype or successful PCR.']
],
'genetics-practical-2':[
 ['Gel purpose','Check whether amplification produced a product of the expected apparent size.','A gel cannot determine the product’s full nucleotide sequence.'],
 ['Controls','A clean NTC is expected but does not alone establish sample success.','An appropriately sized sample band with a clean NTC supports amplification, not a particular genotype.'],
 ['Lane records','Use the sample contents to identify the NTC: tube numbering conflicts between the two handouts.','A lane map and ladder let another reader interpret the gel image.'],
 ['Handling','The PCR mix already contains loading dye and density components.','Use the supervised gel-doc system and appropriate UV protection.'],
 ['Sequencing setup','Each sequencing tube uses one primer; forward and reverse reactions are separate.','Both use the PCR amplicon as template, and the next output is a sequence read.']
],
'breast-cancer-lecture':[
 ['Normal architecture','Locate the terminal ductal lobular unit, lobules and individual acini.','Luminal cells lie inside the myoepithelial layer and basement membrane; cutting angle changes the apparent duct profile.'],
 ['Risk and detection','Familial clustering is not identical to a proven hereditary pathogenic variant.','Mammography uses X-rays; a palpable lump may be a benign solid lesion or a cyst rather than cancer.'],
 ['Histology versus markers','H&E shows architecture and invasion; IHC assesses receptor proteins and supporting cell markers.','E-cadherin loss supports lobular differentiation but does not alone establish invasion.'],
 ['Recognise patterns','DCIS stays within duct boundaries; LCIS expands lobular acini without stromal invasion.','Cohesive invasive nests favour IDC, while dyscohesive single-file infiltration favours ILC.'],
 ['Interpret cautiously','Tumour in an axillary node represents metastasis; in situ lesions are not defined by receptor status.','Do not guess the unkeyed practice-slide diagnoses. Benign lesions can grow, and DCIS progression is not inevitable.']
],
'cardiovascular-practical-handout':[
 ['Current protocol','Use the 2026–27 handout alongside demonstrator instructions; some older theory-slide limits differ.','The current occlusion upper limit is 150 mmHg and the stated duration is 30 seconds, with immediate stopping for adverse symptoms.'],
 ['Baseline and change','Average repeated resting measurements to define baseline.','Calculate the largest pressor change using the peak minus baseline of the same pressure variable.'],
 ['Pressure is not flow','Arterial BP is an indirect local-flow indicator rather than a direct perfusion measurement.','A local resistance fall can increase flow despite a lower systemic pressure.'],
 ['Study design','Different volunteers reduce direct carry-over but introduce between-person variation.','Record skin/venous observations and measurement timing as well as numerical pressures.'],
 ['Interpret evidence','An exaggerated cold-pressor response is a risk association rather than a standalone hypertension diagnosis.','Blank tables are templates, not observations; report actual data and limitations without inventing results.']
]
};
sheets['inheritance-clarification']=[
 ['Transmission and expression','Mendelian classification concerns transmission and genotype ratios rather than every visible phenotype ratio.','Incomplete dominance, codominance and multiple population alleles can still preserve ordinary segregation.'],
 ['Viability','An allele can be dominant for coat colour and recessive for lethality.','Eliminating a homozygous-lethal class gives a 2:1 survivor ratio without distorting the original 1:2:1 segregation.'],
 ['Interacting loci','Epistasis and complementary pathways change phenotypes even when each unlinked locus is inherited normally.','Linkage constrains independent assortment but allows predictions from genetic maps and recombination frequencies.'],
 ['Other inheritance routes','Mitochondrial transmission is predominantly maternal; it differs from ordinary nuclear inheritance.','Epigenetic marks can reset, while maternal-effect phenotypes reflect products deposited under the maternal genotype.'],
 ['Distortion','Meiotic drive preferentially transmits alleles through segregation or gamete-function advantages.','Identify the stage being counted and distinguish transmission, phenotype, viability and sampling before assigning a mechanism.']
];
export const WEEK8_SUMMARIES=Object.fromEntries(Object.entries(sheets).map(([id,sections])=>[id,{intro:'The main mechanisms, comparisons and interpretation points from this lecture.',sections:sections.map(([title,...points])=>({title,points}))}]));
