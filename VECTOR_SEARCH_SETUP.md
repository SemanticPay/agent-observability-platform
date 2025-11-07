# Vertex AI Vector Search Setup Guide

This guide explains how to set up and use Vertex AI Vector Search with this RAG pipeline to **persist documents** and **reuse them** across multiple runs.

## Why Use Vector Search?

Vector Search allows you to:
- **Store documents once** and reuse them across multiple application restarts
- **Avoid re-ingesting documents** every time you run queries
- **Persist embeddings** in a managed service
- **Scale efficiently** for large document collections

## Prerequisites

1. Google Cloud Project with Vertex AI API enabled
2. A GCS bucket for staging data
3. Proper IAM permissions (Vertex AI User, Storage Object Admin)

## One-Time Setup Steps

### Step 1: Create a GCS Bucket (if you don't have one)

```bash
export PROJECT_ID="your-project-id"
export BUCKET_NAME="your-rag-bucket"  # Just the name, no gs:// prefix
export LOCATION="us-central1"

gsutil mb -p $PROJECT_ID -l $LOCATION gs://$BUCKET_NAME
```

### Step 2: Create a Vector Search Index

You can create the index using:

#### Option A: Using gcloud CLI

```bash
# Set variables
export INDEX_DISPLAY_NAME="drivers-license-rag-index"
export DIMENSIONS=768  # For textembedding-gecko@003

# Create index configuration file
cat > index_config.json <<EOF
{
  "displayName": "$INDEX_DISPLAY_NAME",
  "metadata": {
    "contentsDeltaUri": "gs://$BUCKET_NAME/initial_index",
    "config": {
      "dimensions": $DIMENSIONS,
      "approximateNeighborsCount": 150,
      "distanceMeasureType": "DOT_PRODUCT_DISTANCE",
      "algorithmConfig": {
        "treeAhConfig": {
          "leafNodeEmbeddingCount": 500,
          "leafNodesToSearchPercent": 7
        }
      }
    }
  }
}
EOF

# Create the index
gcloud ai indexes create \
  --metadata-file=index_config.json \
  --region=$LOCATION \
  --project=$PROJECT_ID
```

This will output an INDEX_ID like `projects/123456789/locations/us-central1/indexes/1234567890123456789`

#### Option B: Using the Google Cloud Console

1. Go to [Vertex AI > Vector Search](https://console.cloud.google.com/vertex-ai/matching-engine/indexes)
2. Click "Create Index"
3. Configure:
   - **Name**: drivers-license-rag-index
   - **Region**: us-central1
   - **Dimensions**: 768 (for textembedding-gecko@003)
   - **Distance Measure**: DOT_PRODUCT_DISTANCE
4. Click "Create"
5. Note the INDEX_ID from the index details page

### Step 3: Create and Deploy an Endpoint

```bash
# Create endpoint
export ENDPOINT_DISPLAY_NAME="drivers-license-rag-endpoint"

gcloud ai index-endpoints create \
  --display-name=$ENDPOINT_DISPLAY_NAME \
  --region=$LOCATION \
  --project=$PROJECT_ID

# This outputs an ENDPOINT_ID
export ENDPOINT_ID="1234567890123456789"  # Replace with your actual ID
export INDEX_ID="1234567890123456789"     # Replace with your actual ID from Step 2

# Deploy index to endpoint
gcloud ai index-endpoints deploy-index $ENDPOINT_ID \
  --deployed-index-id=deployed_index_v1 \
  --display-name="Deployed Index v1" \
  --index=$INDEX_ID \
  --region=$LOCATION \
  --project=$PROJECT_ID
```

**Note**: Deployment can take 15-30 minutes.

### Step 4: Configure Your Environment

Update your `.env` file with the Vector Search configuration:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
VERTEX_AI_LOCATION=us-central1

# Vector Search Configuration (use these instead of RAG_DATASTORE_ID)
VECTOR_SEARCH_INDEX_ID=1234567890123456789
VECTOR_SEARCH_ENDPOINT_ID=1234567890123456789
VECTOR_SEARCH_GCS_BUCKET=your-rag-bucket  # Just the name, no gs:// prefix

# Embedding Model
EMBEDDING_MODEL=textembedding-gecko@003

# Legacy (not needed if using Vector Search)
# RAG_DATASTORE_ID=  # Leave empty or comment out
```

## Usage Pattern

### One-Time Document Ingestion

Run this **once** to ingest your documents:

```bash
python agent.py ingest
```

This will:
1. Fetch documents from the configured URLs
2. Split them into chunks
3. Generate embeddings
4. Store them in your Vector Search index

### Querying (Reuses Stored Documents)

Now you can query as many times as you want **without re-ingesting**:

```bash
# Single query
python agent.py query "Preciso fazer exame médico para renovar minha carteira?"

# Interactive mode
python agent.py
```

Each query will:
1. Connect to your existing Vector Search index (fast!)
2. Search for relevant chunks
3. Generate an answer using the LLM

## How It Works

### Document Persistence

The `VectorSearchVectorStore.from_components()` method connects to an **existing** index:

```python
# This CONNECTS to existing index (doesn't create new one)
vector_store = VectorSearchVectorStore.from_components(
    project_id="your-project",
    region="us-central1",
    gcs_bucket_name="your-bucket",
    index_id="your-index-id",
    endpoint_id="your-endpoint-id",
    embedding=embeddings,
    stream_update=True,
)

# Add documents (persisted in the index)
vector_store.add_documents(documents)

# Later, in a different session...
# Connect again (same index, same data!)
vector_store = VectorSearchVectorStore.from_components(...)

# Search works immediately (no re-ingestion needed)
results = vector_store.similarity_search(query, k=5)
```

### Key Differences from `from_documents()`

| Method | Behavior | Use Case |
|--------|----------|----------|
| `from_documents()` | Creates NEW index, adds docs, **ephemeral** | Quick testing, notebooks |
| `from_components()` | Connects to EXISTING index, **persistent** | Production, reusable storage |

## Troubleshooting

### Error: "Vector Search not configured"

Make sure you set all three required environment variables:
- `VECTOR_SEARCH_INDEX_ID`
- `VECTOR_SEARCH_ENDPOINT_ID`
- `VECTOR_SEARCH_GCS_BUCKET`

### Error: "Index not found"

Verify your index ID:
```bash
gcloud ai indexes list --region=$LOCATION --project=$PROJECT_ID
```

### Error: "Endpoint not found"

Verify your endpoint ID and that the index is deployed:
```bash
gcloud ai index-endpoints list --region=$LOCATION --project=$PROJECT_ID
gcloud ai index-endpoints describe $ENDPOINT_ID --region=$LOCATION --project=$PROJECT_ID
```

### Slow Performance

- Ensure index is fully deployed (check status in console)
- Consider increasing `approximateNeighborsCount` in index config
- Use `stream_update=True` for individual document additions

## Cost Considerations

- **Index**: Charged based on size and number of nodes
- **Endpoint**: Charged for deployed compute resources
- **GCS**: Standard storage costs for bucket
- **Embeddings**: Charged per 1000 characters processed

See [Vertex AI Vector Search Pricing](https://cloud.google.com/vertex-ai/pricing#vectorsearch) for details.

## Next Steps

- Monitor index usage in Cloud Console
- Set up automated document updates (e.g., daily sync)
- Implement incremental updates for changed documents
- Add document metadata for better filtering
