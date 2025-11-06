"""Script to verify the setup and configuration."""
import sys
import os

def check_environment():
    """Check if environment variables are set."""
    print("Checking environment configuration...")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "RAG_DATASTORE_ID",
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
            print(f"  ❌ {var} is not set")
        else:
            print(f"  ✅ {var} is set")
    
    optional_vars = {
        "GOOGLE_APPLICATION_CREDENTIALS": "Service account key path",
        "VERTEX_AI_LOCATION": "Vertex AI location (default: us-central1)",
        "EMBEDDING_MODEL": "Embedding model (default: textembedding-gecko@003)",
    }
    
    print("\nOptional configuration:")
    for var, desc in optional_vars.items():
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value}")
        else:
            print(f"  ⚠️  {var}: {desc} (using default)")
    
    if missing:
        print(f"\n❌ Missing required environment variables: {', '.join(missing)}")
        print("Please set them in your .env file or environment.")
        return False
    
    return True

def check_credentials():
    """Check if Google Cloud credentials are accessible."""
    print("\nChecking Google Cloud credentials...")
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        if os.path.exists(creds_path):
            print(f"  ✅ Credentials file found: {creds_path}")
        else:
            print(f"  ❌ Credentials file not found: {creds_path}")
            return False
    else:
        print("  ⚠️  GOOGLE_APPLICATION_CREDENTIALS not set")
        print("  Trying to use default credentials...")
    
    try:
        from google.auth import default
        credentials, project = default()
        print(f"  ✅ Successfully authenticated (project: {project})")
        return True
    except Exception as e:
        print(f"  ❌ Authentication failed: {e}")
        return False

def check_dependencies():
    """Check if required Python packages are installed."""
    print("\nChecking Python dependencies...")
    
    required_packages = [
        "google.cloud.aiplatform",
        "google.cloud.discoveryengine",
        "langchain",
        "langchain_google_vertexai",
        "beautifulsoup4",
        "requests",
        "html2text",
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace(".", "_") if "." in package else package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} is not installed")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print("Please install them with: pip install -r requirements.txt")
        return False
    
    return True

def main():
    """Run all verification checks."""
    print("=" * 60)
    print("Driver's License Renewal Agent - Setup Verification")
    print("=" * 60)
    
    checks = [
        ("Environment Variables", check_environment),
        ("Google Cloud Credentials", check_credentials),
        ("Python Dependencies", check_dependencies),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Error during {name} check: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Verification Summary:")
    print("=" * 60)
    
    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n✅ All checks passed! You're ready to use the agent.")
        print("\nNext steps:")
        print("  1. Run: python agent.py ingest")
        print("  2. Run: python agent.py query 'your question'")
    else:
        print("\n❌ Some checks failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

