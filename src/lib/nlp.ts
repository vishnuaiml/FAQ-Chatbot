import { FAQItem } from '../types';

// Standard English stopwords list
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into',
  'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shant',
  'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were',
  'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom',
  'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours',
  'yourself', 'yourselves', 'us', 'our', 'ours', 'them', 'their', 'theirs', 'me', 'my', 'myself'
]);

/**
 * Perform rule-based lemmatization/stemming to normalize plural nouns, progressive verb forms,
 * past tenses, and common suffixes to their base words.
 */
function lemmatize(word: string): string {
  if (word.length <= 2) return word;

  let base = word;

  // Handle common contractions expansion
  if (base.endsWith("'s")) base = base.slice(0, -2);
  if (base.endsWith("n't")) base = base.slice(0, -3);

  // Plurals and plurals inflected with -ies
  if (base.endsWith('ies')) {
    // replies -> reply, countries -> country
    base = base.slice(0, -3) + 'y';
  } else if (base.endsWith('es') && !base.endsWith('aes') && !base.endsWith('ees') && !base.endsWith('oes')) {
    // boxes -> box, changes -> change
    if (base.endsWith('shes') || base.endsWith('ches') || base.endsWith('xes')) {
      base = base.slice(0, -2);
    } else {
      base = base.slice(0, -1); // e.g. changes -> change
    }
  } else if (base.endsWith('s') && !base.endsWith('ss') && !base.endsWith('is') && !base.endsWith('us') && !base.endsWith('as')) {
    base = base.slice(0, -1);
  }

  // Progressive -ing
  if (base.endsWith('ing')) {
    // shipping -> ship, crashing -> crash
    let stem = base.slice(0, -3);
    if (stem.endsWith('pl') || stem.endsWith('bl')) {
      // doubling -> double
      base = stem + 'e';
    } else if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      // shipping -> shipp -> ship
      // stopping -> stopp -> stop
      // Ensure we don't overstem double letters like "billing" -> "bill" or "selling" -> "sell"
      const doubleConsonants = ['p', 't', 'g', 'm', 'n', 'd', 'r', 'b'];
      if (doubleConsonants.includes(stem[stem.length - 1])) {
        base = stem.slice(0, -1);
      } else {
        base = stem;
      }
    } else {
      base = stem;
    }
  }

  // Past tense -ed
  if (base.endsWith('ed')) {
    let stem = base.slice(0, -2);
    if (stem.endsWith('i')) {
      // cried -> cry
      base = stem.slice(0, -1) + 'y';
    } else if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      // shipped -> shipp -> ship
      const doubleConsonants = ['p', 't', 'g', 'm', 'n', 'd', 'r', 'b'];
      if (doubleConsonants.includes(stem[stem.length - 1])) {
        base = stem.slice(0, -1);
      } else {
        base = stem;
      }
    } else {
      // accepted -> accept, processed -> process
      // Check if need trailing 'e' (like "saved" -> "save")
      const silentEEndings = ['v', 'z', 'c', 'u', 'l'];
      if (silentEEndings.includes(stem[stem.length - 1])) {
        base = stem + 'e';
      } else {
        base = stem;
      }
    }
  }

  // Nominal suffixes like -ment
  if (base.endsWith('ment') && base.length > 6) {
    base = base.slice(0, -4);
  }

  return base;
}

/**
 * Preprocesses a raw text string:
 * 1. Convert to lowercase
 * 2. Remove punctuation & special characters
 * 3. Tokenize by splitting whitespace
 * 4. Remove stopwords
 * 5. Apply lemmatizer rules
 */
export function preprocessText(text: string): string[] {
  if (!text) return [];
  
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s']/gu, ' ') // Strip punctuation except internal apostrophes
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanText.split(' ').filter(w => w.length > 0);
  
  return words
    .filter(word => !STOP_WORDS.has(word))
    .map(word => lemmatize(word));
}

export interface VectorTerms {
  [term: string]: number;
}

export class FAQEngine {
  private faqs: FAQItem[];
  private vocabulary: string[] = [];
  private idfs: VectorTerms = {};
  private faqVectors: VectorTerms[] = []; // List of L2-normalized TF-IDF question vectors

  constructor(faqData: FAQItem[]) {
    this.faqs = faqData;
    this.buildTFIDFModel();
  }

  /**
   * Builds the TF-IDF vocabulary, document frequencies, IDFs, and
   * pre-computes L2-normalized vector weights for all FAQ questions.
   */
  private buildTFIDFModel() {
    const N = this.faqs.length;
    if (N === 0) return;

    // Tokenize each FAQ question
    const tokenizedQuestions = this.faqs.map(faq => preprocessText(faq.question));

    // Compile vocabulary & doc frequencies
    const docFrequencies: { [term: string]: number } = {};
    const vocabSet = new Set<string>();

    tokenizedQuestions.forEach(tokens => {
      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach(token => {
        vocabSet.add(token);
        docFrequencies[token] = (docFrequencies[token] || 0) + 1;
      });
    });

    this.vocabulary = Array.from(vocabSet);

    // Compute Smooth Inverse Document Frequency (smooth IDF logic from scikit-learn)
    this.vocabulary.forEach(term => {
      const df = docFrequencies[term] || 0;
      this.idfs[term] = Math.log((1 + N) / (1 + df)) + 1;
    });

    // Compute and L2-normalize TF-IDF vectors for each question
    this.faqVectors = tokenizedQuestions.map(tokens => {
      const tf: VectorTerms = {};
      tokens.forEach(token => {
        tf[token] = (tf[token] || 0) + 1;
      });

      // Compute TF-IDF
      const tfidf: VectorTerms = {};
      const numTokens = tokens.length || 1;
      
      Object.keys(tf).forEach(term => {
        const tfRate = tf[term] / numTokens;
        const idf = this.idfs[term] || 1;
        tfidf[term] = tfRate * idf;
      });

      return this.l2Normalize(tfidf);
    });
  }

  /**
   * Scales a term-weight vector to unit length (L2 norm = 1)
   */
  private l2Normalize(vector: VectorTerms): VectorTerms {
    let sumSquares = 0;
    Object.values(vector).forEach(val => {
      sumSquares += val * val;
    });

    const magnitude = Math.sqrt(sumSquares);
    if (magnitude === 0) return {};

    const normalized: VectorTerms = {};
    Object.keys(vector).forEach(key => {
      normalized[key] = vector[key] / magnitude;
    });

    return normalized;
  }

  /**
   * Computes the Cosine Similarity (dot product of L2-normalized vectors)
   */
  private cosineSimilarity(v1: VectorTerms, v2: VectorTerms): number {
    let dotProduct = 0;
    // Iterate over the smaller vector keys for efficiency
    const keys1 = Object.keys(v1);
    const keys2 = Object.keys(v2);
    const iterateKeys = keys1.length < keys2.length ? keys1 : keys2;
    const targetVec = keys1.length < keys2.length ? v2 : v1;
    const sourceVec = keys1.length < keys2.length ? v1 : v2;

    iterateKeys.forEach(term => {
      if (targetVec[term]) {
        dotProduct += sourceVec[term] * targetVec[term];
      }
    });

    return dotProduct;
  }

  /**
   * Matches raw user question with the FAQ records.
   * Returns match statistics and the corresponding answer.
   */
  public query(userQuestion: string, threshold: number = 0.15): {
    bestMatch: FAQItem | null;
    similarity: number;
    answer: string;
    matchedQuestion: string;
  } {
    const qTokens = preprocessText(userQuestion);
    
    if (qTokens.length === 0) {
      return {
        bestMatch: null,
        similarity: 0,
        answer: "Sorry, I could not understand your question.",
        matchedQuestion: ""
      };
    }

    // Compute TF for query
    const qTf: VectorTerms = {};
    qTokens.forEach(token => {
      qTf[token] = (qTf[token] || 0) + 1;
    });

    // Compute TF-IDF for query using precompiled IDFs
    const qTfidf: VectorTerms = {};
    const totalQTokens = qTokens.length;
    Object.keys(qTf).forEach(term => {
      if (this.idfs[term]) {
        const tfRate = qTf[term] / totalQTokens;
        qTfidf[term] = tfRate * this.idfs[term];
      }
    });

    const normalizedQuery = this.l2Normalize(qTfidf);

    // Compute similarity of query with all questions
    let maxSim = -1;
    let bestIdx = -1;

    this.faqVectors.forEach((faqVec, idx) => {
      const sim = this.cosineSimilarity(normalizedQuery, faqVec);
      if (sim > maxSim) {
        maxSim = sim;
        bestIdx = idx;
      }
    });

    if (bestIdx !== -1 && maxSim >= threshold) {
      const bestMatch = this.faqs[bestIdx];
      return {
        bestMatch,
        similarity: parseFloat(maxSim.toFixed(4)),
        answer: bestMatch.answer,
        matchedQuestion: bestMatch.question
      };
    }

    return {
      bestMatch: null,
      similarity: parseFloat((maxSim > 0 ? maxSim : 0).toFixed(4)),
      answer: "Sorry, I could not understand your question.",
      matchedQuestion: bestIdx !== -1 ? this.faqs[bestIdx].question : ""
    };
  }
}
