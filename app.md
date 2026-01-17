# AWS Knowledge agent

## アプリの内容
AWSに関する質問に答えるエージェントです。AWSのサービス、ベストプラクティス、料金体系、セキュリティ、アーキテクチャ設計など、幅広いトピックに対応できます。AmplifyとBedrock AgentCoreを使用して構築をします。
- UI：チャットインターフェース
- 機能：AWSに関する質問応答、ドキュメント参照、ベストプラクティスの提案

## 使用技術
AWS Knowledge mcp サーバーを利用します。AgentCore GatewayでMCPサーバーを接続します。

## AWSアカウント
- アカウントID:003252302937
- --profile AdministratorAccess-003252302937でAWS CLIにアクセス可能

## 参考リポジトリ
https://github.com/minorun365/amplify-agentcore-sample

## 参考記事
https://qiita.com/minorun365/items/11be2c3565923b96ab54

## Cognito設定
- ユーザープールID: ap-northeast-1_WnSvAHDRg
- アプリケーションクライアントID: 7th5hltttpgb46mnqmpuis936u
- ユーザープールARN: arn:aws:cognito-idp:ap-northeast-1:003252302937:userpool/ap-northeast-1_WnSvAHDRg

## AgentCore設定
- Agent ARN: arn:aws:bedrock-agentcore:ap-northeast-1:003252302937:runtime/awsknowledgeagent-3HQagv4w1Z
- Agent ID: awsknowledgeagent-3HQagv4w1Z
- Memory ID: awsknowledgeagent_mem-HthEFEFj6c