import os
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

DATA_FILE = "data/maintenance_logs.csv"
PERSIST_DIR = "chroma_store"
COLLECTION_NAME = "maintenance-docs"

if not os.path.exists(DATA_FILE):
    raise FileNotFoundError(f"'{DATA_FILE}' not found.")

loader = CSVLoader(file_path=DATA_FILE)
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

embeddings = OllamaEmbeddings(model="nomic-embed-text")


Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory=PERSIST_DIR,
    collection_name=COLLECTION_NAME,
)


print(f"Vector store built at '{PERSIST_DIR}' with {len(chunks)} chunks")

