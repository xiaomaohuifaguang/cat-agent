from langchain_core.runnables import RunnableLambda
from openai import OpenAI

base_url = "https://api.deepseek.com"
model_name = "deepseek-v4-flash"
api_key = "sk-28a87d5a55884c68943f03df7a2a7d15"

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

messages = [{"role": "user", "content": "9.11 和 9.8, 哪个大?"}]
response = client.chat.completions.create(
    model=model_name,
    messages=messages,
    stream=True,
    reasoning_effort="high",
    extra_body={"thinking": {"type": "enabled"}},
)

reasoning_content = ""
content = ""

for chunk in response:
    # 1. 提取并拼接思考过程（同样建议加上判空）
    if chunk.choices[0].delta.reasoning_content is not None:
        reasoning_content += chunk.choices[0].delta.reasoning_content

    # 2. 提取并拼接最终回复（加上判空，防止 NoneType 报错）
    if chunk.choices[0].delta.content is not None:
        content += chunk.choices[0].delta.content

print("💭 思考过程：")
print(reasoning_content)
print("\n🤖 最终回复：")
print(content)