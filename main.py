from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from graph import agent
load_dotenv()

config = {"configurable": {"thread_id": "session-1"}}



def run():
    print("=== Predictive Maintenance Agent ===")
    print("Type 'exit' to quit.\n")

    while True:
        query = input("Question: ")
        if query.lower() in ("exit", "quit"):
            break

        result = agent.invoke(
            {
                "messages": [HumanMessage(content=query)],
                "machine_id": "",
                "sensor_result": "",
                "escalate": False,
            },
            config=config,
        )


        print("\n--- Answer ---")
        print(result["messages"][-1].content)
        print()



if __name__ == "__main__":
    run()








