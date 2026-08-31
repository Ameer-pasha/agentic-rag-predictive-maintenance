"""
Evaluates the RAG pipeline using RAGAS metrics: Faithfulness,
Context Precision, Context Recall, Answer Relevancy.

Run this after ingest.py has built the vector store, and after you've
confirmed the agent works via main.py.

Usage: python evaluate.py
"""
from datasets import Dataset
from ragas import evaluate, RunConfig
from ragas.metrics import faithfulness, context_precision, context_recall, answer_relevancy
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.messages import HumanMessage

from graph import agent
from tools import retriever_tool

# RAGAS needs its own LLM + embeddings to judge the results (e.g. to
# check if the answer is "faithful" to the context). By default it
# tries to use OpenAI, which will crash without an API key — so point
# it at the same local Ollama models the agent itself uses.
ragas_llm = LangchainLLMWrapper(ChatOllama(model="llama3.2", temperature=0))
ragas_embeddings = LangchainEmbeddingsWrapper(OllamaEmbeddings(model="nomic-embed-text"))

# --- Your test set: real questions + the correct answer you expect ---
# Add more rows as you think of edge cases. ground_truth is what a
# human would consider the correct answer — you write this by hand,
# using your own maintenance_logs.csv as the source of truth.
TEST_CASES = [
    {
        "question": "What was the fix for M12's grinding noise issue?",
        "ground_truth": "The spindle bearing was replaced and fresh lubricant was applied.",
    },
    {
        "question": "How many machines are in the data?",
        "ground_truth": "There are 20 machines, M01 through M20.",
    },
    # Add 5-10 more covering: RAG questions, sensor questions,
    # threshold questions, and at least one machine that doesn't exist.
]


def run_agent(question: str, thread_id: str) -> str:
    """Runs the real agent and returns its final text answer."""
    result = agent.invoke(
        {
            "messages": [HumanMessage(content=question)],
            "machine_id": "",
            "sensor_result": "",
            "escalate": False,
        },
        config={"configurable": {"thread_id": thread_id}},
    )
    return result["messages"][-1].content


def get_retrieved_context(question: str) -> list[str]:
    """Runs the retriever directly to capture what chunks were used —
    RAGAS needs these separately from the agent's final answer."""
    raw = retriever_tool.invoke({"query": question})
    # retriever_tool returns one joined string; split back into a list
    # of chunks for RAGAS's expected format.
    return [chunk for chunk in raw.split("\n\n") if chunk.strip()]


def main():
    questions, answers, contexts, ground_truths = [], [], [], []

    for i, case in enumerate(TEST_CASES):
        print(f"Running case {i + 1}/{len(TEST_CASES)}: {case['question']}")
        answer = run_agent(case["question"], thread_id=f"eval-{i}")
        context = get_retrieved_context(case["question"])

        questions.append(case["question"])
        answers.append(answer)
        contexts.append(context)
        ground_truths.append(case["ground_truth"])

    dataset = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        }
    )

    # Local models are much slower than hosted APIs, and RAGAS fires
    # several LLM calls per test case in parallel by default — that
    # overwhelms a local Ollama instance and causes timeouts (seen as
    # 'nan' results). Give it more time per call, and run fewer calls
    # at once so Ollama isn't flooded with concurrent requests.
    run_config = RunConfig(timeout=300, max_workers=1)

    result = evaluate(
        dataset,
        metrics=[faithfulness, context_precision, context_recall, answer_relevancy],
        llm=ragas_llm,
        embeddings=ragas_embeddings,
        run_config=run_config,
    )

    print("\n=== RAGAS Evaluation Results ===")
    print(result)


if __name__ == "__main__":
    main()