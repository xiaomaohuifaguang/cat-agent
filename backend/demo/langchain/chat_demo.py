"""
LangChain 简单 Demo：从 Redis 读取配置，调用 Chat Model 对话

用法：
    cd backend
    python -m demo.langchain.chat_demo
"""

import json

from langchain_openai import ChatOpenAI

from app.core.redis import redis_client


def get_llm(category: str = "chat") -> ChatOpenAI:
    """从 Redis 读取指定用途的模型配置，构建 LangChain ChatOpenAI 实例"""
    raw = redis_client.get(f"llm:setting:{category}")
    if not raw:
        raise ValueError(f"用途 '{category}' 未配置，请先在前端添加配置")
    config = json.loads(raw)
    return ChatOpenAI(
        base_url=config["base_url"],
        model=config["model_name"],
        api_key=config["api_key"],
    )


if __name__ == "__main__":
    llm = get_llm("chat")
    print(f"使用模型: {llm.model_name}")
    print("输入 'quit' 退出\n")

    while True:
        question = input("你: ").strip()
        if question.lower() == "quit":
            break
        if not question:
            continue
        response = llm.invoke(question)
        print(f"AI: {response.content}\n")