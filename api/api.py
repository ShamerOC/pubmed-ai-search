from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import torch
from transformers import AutoTokenizer, AutoModel
from qdrant_client import QdrantClient
from typing import List, Optional
import time
import os
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(
    title="MedCPT Search API",
    description="API for medical text search using MedCPT embeddings and Qdrant",
    version="1.0.0"
)

# Configure CORS - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model, tokenizer, and Qdrant client
model = None
tokenizer = None
qdrant_client = None

# Configuration - read from environment variables
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "pubmed_medcpt")

# Request and Response models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query text", min_length=1)
    limit: Optional[int] = Field(5, description="Number of results to return", ge=1, le=100)

class PubMedDocument(BaseModel):
    date: str = Field(..., description="Publication date in YYYY-MM-DD format")
    title: str = Field(..., description="Article title")
    abstract: str = Field(..., description="Article abstract")
    pmid: str = Field(..., description="PubMed ID")
    source_file: str = Field(..., description="Source file name")

    @field_validator('date')
    @classmethod
    def format_date(cls, v: str) -> str:
        """Convert date from YYYYMMDD to YYYY-MM-DD format"""
        if len(v) == 8 and v.isdigit():
            return f"{v[:4]}-{v[4:6]}-{v[6:8]}"
        return v

class SearchResult(BaseModel):
    id: str
    score: float
    document: PubMedDocument

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_time: float
    embedding_time: float
    search_time: float
    results_count: int

@app.on_event("startup")
async def startup_event():
    """Initialize model, tokenizer, and Qdrant client on startup"""
    global model, tokenizer, qdrant_client

    print("Loading MedCPT model and tokenizer...")
    model = AutoModel.from_pretrained("ncbi/MedCPT-Query-Encoder")
    tokenizer = AutoTokenizer.from_pretrained("ncbi/MedCPT-Query-Encoder")
    print("✓ Model and tokenizer loaded!")

    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    qdrant_client = QdrantClient(
        host=QDRANT_HOST,
        port=QDRANT_PORT,
        timeout=300
    )
    print("✓ Qdrant client initialized!")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "MedCPT Search API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "qdrant_connected": qdrant_client is not None,
        "qdrant_host": QDRANT_HOST,
        "qdrant_port": QDRANT_PORT
    }

def create_embedding(query: str) -> tuple[list, float]:
    """
    Create embedding for the given query

    Args:
        query: Text query to embed

    Returns:
        Tuple of (embedding vector as list, time taken in seconds)
    """
    start_time = time.time()

    with torch.no_grad():
        # Tokenize the query
        encoded = tokenizer(
            [query],
            truncation=True,
            padding=True,
            return_tensors='pt',
            max_length=64,
        )

        # Create embedding (use [CLS] token from last hidden state)
        embeds = model(**encoded).last_hidden_state[:, 0, :]

        # Convert to list
        embedding_vector = embeds[0].detach().cpu().numpy().tolist()

    embedding_time = time.time() - start_time
    return embedding_vector, embedding_time

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search for similar documents using query embedding

    Args:
        request: SearchRequest containing query and optional limit

    Returns:
        SearchResponse with results and timing information
    """
    total_start = time.time()

    try:
        # Step 1: Create embedding
        query_vector, embedding_time = create_embedding(request.query)

        # Step 2: Search in Qdrant
        search_start = time.time()
        results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=request.limit
        )
        search_time = time.time() - search_start

        # Step 3: Format results
        formatted_results = [
            SearchResult(
                id=str(point.id),
                score=point.score,
                document=PubMedDocument(**point.payload)
            )
            for point in results
        ]

        total_time = time.time() - total_start

        return SearchResponse(
            query=request.query,
            results=formatted_results,
            total_time=total_time,
            embedding_time=embedding_time,
            search_time=search_time,
            results_count=len(formatted_results)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)