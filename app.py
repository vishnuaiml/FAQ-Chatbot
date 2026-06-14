import os
import json
import re
from flask import Flask, request, jsonify, render_template

# Initialize Flask Application
app = Flask(__name__)

# Fallback FAQs if json is missing or corrupt
FALLBACK_FAQS = [
    {
        "category": "E-Commerce & Orders",
        "question": "What is your return policy?",
        "answer": "You can return standard products within 30 days of purchase for a full refund."
    },
    {
        "category": "General Support",
        "question": "How can I contact support?",
        "answer": "You can reach our customer support team via email at support@techcorp.com or call 1-800-555-0199."
    }
]

# Load FAQs from faq.json at root
def load_faqs():
    faq_path = os.path.join(os.path.dirname(__file__), "faq.json")
    if os.path.exists(faq_path):
        try:
            with open(faq_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading faq.json: {e}")
            return FALLBACK_FAQS
    return FALLBACK_FAQS

FAQS = load_faqs()

# Define common english stopwords inline for maximum zero-dependency portability
STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
    'couldn', 'did', 'didn', 'do', 'does', 'doesn', 'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'hadn', 'has', 'hasn', 'have', 'haven', 'having', 'he', 'her', 'here', 'hers', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'me', 'more', 'most', 'mustn', 'my',
    'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'should', 'shouldn', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'wasn', 'we', 'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'won', 'would', 'wouldn', 'you', 'your', 'yours', 'yourself', 'yourselves'
}

# ----------------- NLP preprocessing module -----------------
def preprocess_text(text):
    """
    NLP Preprocessing:
    1. convert to lowercase
    2. strip punctuation & special characters
    3. tokenize by splitting words
    4. remove stopwords
    5. custom stem/lemmatize ending roots
    """
    if not text:
        return []
    
    # 1. Lowercase & 2. Punctuation Strip
    text = text.lower()
    text = re.sub(r"[^\w\s']", " ", text)
    
    # 3. Tokenize
    raw_tokens = text.split()
    
    # 4. Filter Stopwords & 5. Light Lemmatization
    tokens = []
    for token in raw_tokens:
        if token in STOP_WORDS:
            continue
            
        # Basic plural / progressive inflection lemmatizer rules
        if token.endswith("ies") and len(token) > 4:
            token = token[:-3] + "y"
        elif token.endswith("es") and len(token) > 3 and not token.endswith("ses"):
            token = token[:-1]
        elif token.endswith("s") and len(token) > 2 and not token.endswith("ss") and not token.endswith("us"):
            token = token[:-1]
            
        if token.endswith("ing") and len(token) > 4:
            token = token[:-3]
            
        if token:
            tokens.append(token)
            
    return tokens

# ----------------- Manual TF-IDF & Cosine Similarity vector space matching -----------------
# Built-in mathematical fallbacks to prevent dependency friction during offline run.
class SimpleTFIDFMatcher:
    def __init__(self, faqs_dataset):
        self.faqs = faqs_dataset
        self.vocab = []
        self.doc_vectors = []
        self.idfs = {}
        self.build_model()
        
    def build_model(self):
        N = len(self.faqs)
        if N == 0:
            return
            
        # Tokenize documents
        tokenized_questions = [preprocess_text(f["question"]) for f in self.faqs]
        
        # Build Vocab & document frequencies
        vocab_set = set()
        doc_counts = {}
        for tokens in tokenized_questions:
            unique_toks = set(tokens)
            for t in unique_toks:
                vocab_set.add(t)
                doc_counts[t] = doc_counts.get(t, 0) + 1
                
        self.vocab = list(vocab_set)
        
        # Calculate TF-IDF IDF (Inverse Document Frequency)
        import math
        for term in self.vocab:
            df = doc_counts.get(term, 0)
            # Smooth IDF
            self.idfs[term] = math.log((1 + N) / (1 + df)) + 1
            
        # Compute L2-Normalized Vectors
        for tokens in tokenized_questions:
            # Term Frequency
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
                
            length = len(tokens) if len(tokens) > 0 else 1
            tfidf_vec = {}
            for t in tf:
                tfidf_vec[t] = (tf[t] / length) * self.idfs.get(t, 1.0)
                
            # L2 Norm
            sq_sum = sum(v * v for v in tfidf_vec.values())
            magnitude = math.sqrt(sq_sum)
            
            normalized_vec = {}
            if magnitude > 0:
                for t in tfidf_vec:
                    normalized_vec[t] = tfidf_vec[t] / magnitude
                    
            self.doc_vectors.append(normalized_vec)
            
    def match(self, query_text, threshold=0.15):
        import math
        q_tokens = preprocess_text(query_text)
        if not q_tokens:
            return None, 0.0
            
        # Compute Query TF-IDF
        q_tf = {}
        for t in q_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1
            
        q_length = len(q_tokens)
        q_tfidf = {}
        for t in q_tf:
            if t in self.idfs:
                q_tfidf[t] = (q_tf[t] / q_length) * self.idfs[t]
                
        # L2 Norm Query
        sq_sum = sum(v * v for v in q_tfidf.values())
        magnitude = math.sqrt(sq_sum)
        
        q_norm = {}
        if magnitude > 0:
            for t in q_tfidf:
                q_norm[t] = q_tfidf[t] / magnitude
                
        # pairwise cosine matching
        best_sim = -1.0
        best_idx = -1
        
        for idx, doc_vec in enumerate(self.doc_vectors):
            similarity = 0.0
            # Dot product of normalized vectors
            for term in q_norm:
                if term in doc_vec:
                    similarity += q_norm[term] * doc_vec[term]
                    
            if similarity > best_sim:
                best_sim = similarity
                best_idx = idx
                
        if best_idx != -1 and best_sim >= threshold:
            return self.faqs[best_idx], best_sim
            
        return None, best_sim if best_idx != -1 else 0.0

# Boot Similarity Resolver mapping
matcher = SimpleTFIDFMatcher(FAQS)

@app.route("/")
def index():
    return "<h3>FAQ Chatbot Flask Service running successfully! Use POST /chat API endpoint to query support.</h3>"

@app.route("/chat", methods=["POST"])
def chat():
    """
    Accepts: JSON payload containing {'question': '...'}
    Processes: Preprocessing, manual TF-IDF weighting, cosine matching
    Returns: JSON response containing matched answer and similarity confidence.
    """
    data = request.get_json(silent=True) or {}
    user_question = data.get("question", "").strip()
    threshold = data.get("threshold", 0.15)
    
    if not user_question:
        return jsonify({
            "success": False,
            "error": "Missing required 'question' string parameter."
        }), 400
        
    best_match, similarity = matcher.match(user_question, threshold)
    
    if best_match:
        return jsonify({
            "success": True,
            "user_question": user_question,
            "matched_question": best_match["question"],
            "similarity": round(float(similarity), 4),
            "answer": best_match["answer"]
        })
    else:
        return jsonify({
            "success": True,
            "user_question": user_question,
            "matched_question": "",
            "similarity": round(float(similarity), 4),
            "answer": "Sorry, I could not understand your question."
        })

# Bind to standard Port 3000 if booted as main python container
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
