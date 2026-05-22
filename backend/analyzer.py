import os

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

ANALYSIS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert AI Support Engineer. "
            "Analyze this error log and provide a brief root cause hypothesis "
            "and a suggested fix. "
            'Respond with JSON containing exactly two keys: "root_cause" and "suggested_fix".',
        ),
        ("human", "{log_message}"),
    ]
)


def get_llm():
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ.get("OPENAI_API_KEY", "sk-placeholder-key"),
    )


def analyze_log_message(message: str) -> dict:
    llm = get_llm()
    chain = ANALYSIS_PROMPT | llm | JsonOutputParser()
    return chain.invoke({"log_message": message})
