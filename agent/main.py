# 必要なライブラリをインポート
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp import StdioServerParameters
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# AgentCoreランタイム用のAPIサーバーを作成
app = BedrockAgentCoreApp()


def convert_event(event) -> dict | None:
    """Strandsのイベントをフロントエンド向けJSON形式に変換"""
    try:
        if not hasattr(event, 'get'):
            return None

        inner_event = event.get('event')
        if not inner_event:
            return None

        # テキスト差分を検知
        content_block_delta = inner_event.get('contentBlockDelta')
        if content_block_delta:
            delta = content_block_delta.get('delta', {})
            text = delta.get('text')
            if text:
                return {'type': 'text', 'data': text}

        # ツール使用開始を検知
        content_block_start = inner_event.get('contentBlockStart')
        if content_block_start:
            start = content_block_start.get('start', {})
            tool_use = start.get('toolUse')
            if tool_use:
                tool_name = tool_use.get('name', 'unknown')
                return {'type': 'tool_use', 'tool_name': tool_name}

        return None
    except Exception:
        return None


# エージェント呼び出し関数を、APIサーバーのエントリーポイントに設定
@app.entrypoint
async def invoke_agent(payload, context):

    # フロントエンドで入力されたプロンプトを取得
    prompt = payload.get("prompt")

    # AWS Knowledge MCPサーバーに接続
    mcp_client = MCPClient(
        lambda: StdioServerParameters(
            command="uvx",
            args=["awslabs.aws-documentation-mcp-server@latest"],
            env={"FASTMCP_LOG_LEVEL": "ERROR"}
        )
    )

    with mcp_client:
        # MCPサーバーからツールを取得
        tools = mcp_client.list_tools_sync()

        # AIエージェントを作成
        agent = Agent(
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            system_prompt="""あなたはAWSの専門家です。ユーザーからのAWSに関する質問に対して、
AWS公式ドキュメントを参照しながら正確で分かりやすい回答を提供してください。

回答する際は以下の点に注意してください：
- 公式ドキュメントの情報を基に回答する
- ベストプラクティスがあれば提案する
- 必要に応じてコード例やアーキテクチャの説明を含める
- 日本語で回答する""",
            tools=tools
        )

        # エージェントの応答をストリーミングで取得
        async for event in agent.stream_async(prompt):
            converted = convert_event(event)
            if converted:
                yield converted


# APIサーバーを起動
if __name__ == "__main__":
    app.run()
