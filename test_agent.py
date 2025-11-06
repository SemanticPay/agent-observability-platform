"""Test script for the driver's license renewal agent."""
import sys
import os
from typing import List

def test_document_ingestion():
    """Test document ingestion without RAG pipeline."""
    print("=" * 60)
    print("TEST 1: Document Ingestion")
    print("=" * 60)
    
    try:
        from document_ingestion import DocumentIngester
        from config import DOCUMENT_URLS
        
        ingester = DocumentIngester()
        print(f"\nFetching {len(DOCUMENT_URLS)} documents...")
        
        documents = ingester.fetch_all_documents(DOCUMENT_URLS)
        
        if documents:
            print(f"\n✅ Successfully fetched {len(documents)} documents:")
            for doc in documents:
                print(f"  - {doc['title']}")
                print(f"    URL: {doc['url']}")
                print(f"    Content length: {len(doc['content'])} characters")
                print(f"    Preview: {doc['content'][:200]}...")
                print()
            return True
        else:
            print("\n❌ No documents were fetched")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_configuration():
    """Test configuration loading."""
    print("=" * 60)
    print("TEST 2: Configuration")
    print("=" * 60)
    
    try:
        import config
        
        print(f"\nProject: {config.GOOGLE_CLOUD_PROJECT}")
        print(f"Location: {config.VERTEX_AI_LOCATION}")
        print(f"Datastore ID: {config.RAG_DATASTORE_ID}")
        print(f"Embedding Model: {config.EMBEDDING_MODEL}")
        print(f"Document URLs: {len(config.DOCUMENT_URLS)}")
        
        if config.GOOGLE_CLOUD_PROJECT and config.RAG_DATASTORE_ID:
            print("\n✅ Configuration loaded successfully")
            return True
        else:
            print("\n❌ Missing required configuration")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_rag_pipeline_init():
    """Test RAG pipeline initialization (without ingestion)."""
    print("=" * 60)
    print("TEST 3: RAG Pipeline Initialization")
    print("=" * 60)
    
    try:
        from rag_pipeline import VertexAIRAGPipeline
        
        print("\nInitializing RAG pipeline...")
        rag = VertexAIRAGPipeline()
        
        print(f"✅ RAG pipeline initialized")
        print(f"  - Embedding model: {rag.embeddings.model_name}")
        print(f"  - LLM model: {rag.llm.model_name}")
        print(f"  - Datastore ID: {rag.datastore_id}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nNote: This might fail if Google Cloud credentials are not set up.")
        print("You can still test document ingestion without RAG pipeline.")
        import traceback
        traceback.print_exc()
        return False

def test_full_workflow():
    """Test the full workflow: ingestion + query."""
    print("=" * 60)
    print("TEST 4: Full Workflow (Ingestion + Query)")
    print("=" * 60)
    
    try:
        from agent import DriversLicenseAgent
        
        print("\nInitializing agent...")
        agent = DriversLicenseAgent(ingest_on_init=False)
        
        print("\nFetching documents...")
        from document_ingestion import DocumentIngester
        from config import DOCUMENT_URLS
        
        ingester = DocumentIngester()
        documents = ingester.fetch_all_documents(DOCUMENT_URLS)
        
        if not documents:
            print("❌ No documents fetched, cannot test ingestion")
            return False
        
        print(f"\nIngesting {len(documents)} documents into RAG pipeline...")
        agent.rag_pipeline.ingest_documents(documents)
        
        print("\n✅ Documents ingested successfully")
        
        # Test query
        test_queries = [
            "Preciso fazer exame médico para renovar minha carteira?",
            "Quais documentos são necessários para renovação?",
            "Tenho 58 anos e tirei minha carteira há 8 anos. Posso renovar online ou preciso de exame médico?",
        ]
        
        print("\n" + "=" * 60)
        print("Testing queries:")
        print("=" * 60)
        
        for query in test_queries:
            print(f"\n📝 Query: {query}")
            print("-" * 60)
            try:
                answer = agent.answer_question(query)
                print(f"✅ Answer:\n{answer}\n")
            except Exception as e:
                print(f"❌ Error answering query: {e}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nNote: This requires full Vertex AI setup with a datastore.")
        import traceback
        traceback.print_exc()
        return False

def test_query_only():
    """Test querying without ingestion (assumes documents already ingested)."""
    print("=" * 60)
    print("TEST 5: Query Only (Assumes Documents Already Ingested)")
    print("=" * 60)
    
    try:
        from agent import DriversLicenseAgent
        
        print("\nInitializing agent...")
        agent = DriversLicenseAgent(ingest_on_init=False)
        
        test_query = "Preciso fazer exame médico para renovar minha carteira?"
        print(f"\n📝 Query: {test_query}")
        print("-" * 60)
        
        answer = agent.answer_question(test_query)
        print(f"✅ Answer:\n{answer}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("Driver's License Renewal Agent - Test Suite")
    print("=" * 60)
    print("\nThis script will test different components of the agent.")
    print("Some tests require Vertex AI setup, others don't.\n")
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1].lower()
        
        if test_name == "ingestion":
            test_document_ingestion()
        elif test_name == "config":
            test_configuration()
        elif test_name == "rag":
            test_rag_pipeline_init()
        elif test_name == "full":
            test_full_workflow()
        elif test_name == "query":
            test_query_only()
        else:
            print(f"Unknown test: {test_name}")
            print("Available tests: ingestion, config, rag, full, query")
    else:
        # Run all tests
        results = []
        
        # Test 1: Document Ingestion (no Vertex AI needed)
        results.append(("Document Ingestion", test_document_ingestion()))
        
        # Test 2: Configuration
        results.append(("Configuration", test_configuration()))
        
        # Test 3: RAG Pipeline Init (requires credentials)
        results.append(("RAG Pipeline Init", test_rag_pipeline_init()))
        
        # Test 4: Full Workflow (requires full setup)
        print("\n" + "=" * 60)
        print("Full workflow test requires Vertex AI datastore setup.")
        print("Skipping... (run 'python test_agent.py full' to test)")
        print("=" * 60)
        
        # Summary
        print("\n" + "=" * 60)
        print("Test Summary:")
        print("=" * 60)
        for name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status}: {name}")
        
        print("\n" + "=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("1. If document ingestion passed, you can fetch documents")
        print("2. Set up Vertex AI datastore to test full workflow")
        print("3. Run 'python test_agent.py full' to test complete system")
        print("4. Or run 'python agent.py' for interactive mode")

if __name__ == "__main__":
    main()

