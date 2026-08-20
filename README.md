# 淘宝文创工具

项目采用 **TradeMind + 淘宝开放平台 + Adobe Photoshop API v2** 的集成路线，不另造商品后台、任务队列、采集器或图片处理引擎。产品方案和接入边界见 [`docs/solution.md`](docs/solution.md)。

## Web 工具启动准备

```powershell
Copy-Item .env.example .env
./scripts/bootstrap-trademind.ps1
```

脚本会按 [`vendor/trademind.lock.json`](vendor/trademind.lock.json) 固定的上游版本获取 TradeMind，并保留其 Web 管理端、PostgreSQL、Redis、Playwright 采集器、人工草稿审核与发布任务机制。项目只实现 Provider 配置，不复制这些能力。

完整安装、配置和业务操作说明见 [`docs/使用说明.md`](docs/使用说明.md)。

---

# 可恢复 Agent 执行循环

一个零第三方依赖的本地执行框架。它把计划步骤、工具结果、预算、事件日志和当前快照分开保存，并在中断后从最后一个已验证检查点继续。

## 快速开始

```powershell
Copy-Item examples/task.json task.json
python -m agent_harness run task.json
python -m agent_harness status .agent-runs/demo
python -m agent_harness resume .agent-runs/demo
```

任务契约包含：

- `run_id`：稳定运行标识。
- `steps`：顺序执行的命令，每步带稳定 `id`、超时和重试次数。
- `verifier`：机器可执行的最终验收命令；只有退出码为 0 才算成功。
- `budgets`：最大动作数、运行秒数和重复动作数。
- `env`：任务级环境变量；名称含 `TOKEN/SECRET/PASSWORD/KEY` 的值在轨迹中脱敏。

每次状态转移都会原子写入 `.agent-runs/<run_id>/state.json`，并追加到 `events.jsonl`。已成功步骤记录到 `completed_step_ids`，恢复时不会重放。

## 终态

`SUCCEEDED`、`FAILED`、`BLOCKED`、`CANCELLED`、`BUDGET_EXCEEDED`。

## 验证

```powershell
python -m unittest discover -s tests -v
```

测试覆盖正常完成、工具失败、重复动作、意外中断后恢复、验收拒绝和预算耗尽。

## 回滚与清理

循环本身不会猜测如何撤销业务副作用。为需要回滚的步骤，把补偿命令建模为独立任务并使用新的 `run_id`；运行记录可审计保留。仅清理执行状态时，删除对应的 `.agent-runs/<run_id>` 目录即可，项目产物不会被框架自动删除。
