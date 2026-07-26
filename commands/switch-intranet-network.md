---
description: "在不同网络间切换 battle-simulator 内网部署的监听 IP（公司↔家↔热点等），自动探测当前私网 IP 并重新发布"
agent: amagi-leader
---


# 切换 battle-simulator 内网网络

$ARGUMENTS

本命令把 battle-simulator 内网部署从一个网络迁移到另一个。内网服务只监听 `deploy/intranet.env` 里写死的那个私网 IP，换了网络（公司带回家、连热点、换 Wi-Fi）后 IP 一变，就会出现"容器在跑但谁也连不上"——这是唯一的根因，处理方式是一次更新配置并重新发布。数据库数据不受影响。

## 执行授权（直接执行，无需逐步确认）

主上显式调用本命令即授权直接执行。按下方流程一次性完成探测、改配置、发布与验证：**不要逐步骤向主上确认，也不要先复述计划等待回复**。仅在命中「停止条件」时停下并在最终报告列明；未命中即一路执行到底。停止条件是硬边界，不是"逐项询问是否继续"。

## 项目定位

内网项目根目录为 `/Users/maorun/maorun-workpace/battle-sim/battle-simulator`。其下关键文件：

- `deploy/intranet.env`：内网配置，本命令要改的就是其中三行 IP。该文件含密码与令牌，**只改 IP，绝不回显或改动密码、SESSION_SECRET、各 token**。
- `deploy/production.sh`：发布脚本，`release --profile intranet` 子命令。
- `docs/内网部署指南（macOS 与 Windows）.md`：完整人工流程，可在命令不可用时兜底。

若该路径下的 `deploy/intranet.env` 不存在，停止并报告——可能不在正确项目，不要创建空配置。

## 参数解析

解析 `$ARGUMENTS`：

- 第一个非 flag 参数若形如私网 IP，则作为**显式 IP**采用（跳过自动探测，但仍做校验）。
- `--no-deploy`：只改配置并打印新值，不触发重新发布。用于只想预先改好、稍后手动发布的场景。

两者可组合。其余未知参数停止并报告，不猜测意图。

## 1. 确定目标 IP

若提供了显式 IP，直接用；否则自动探测当前主网卡私网地址：

```bash
ipconfig getifaddr en0
```

`en0` 无地址时可依次尝试 `en1`，仍无则停止报告（可能是有线/不同网卡，请用户用显式 IP 重跑）。

**校验（硬边界，不满足即停止）**：

- 必须是合法 IPv4，且属 RFC1918 私网段（`10/8`、`172.16/12`、`192.168/16`）。可用 `python3 -c "import ipaddress; print(ipaddress.ip_address(IP).is_private)"` 校验。
- 拒绝 `127.0.0.1`（loopback）、Docker/WSL 虚拟网卡地址、公网地址。
- 若探测到的 IP 与 `deploy/intranet.env` 中现有 IP **相同**，说明无需切换：打印状态后正常结束（退出码 0），不要白跑一遍发布。

## 2. 改配置

读取 `deploy/intranet.env`，用 Edit 把以下三行中的**旧 IP** 全部替换为**新 IP**（这三行的旧 IP 值相同，用 `replace_all` 一次替换即可）：

- `INTRANET_HOST`
- `INTRANET_BIND_ADDRESS`
- `PUBLIC_ORIGIN`（形如 `http://<旧 IP>:8080`，只替换 IP 部分，端口 `8080` 不变）

**不动**：`POSTGRES_PASSWORD`、`DATABASE_URL`（其 host 是 `postgres` 内部服务名，与本机 IP 无关）、`SESSION_SECRET`、`DRAIN_TOKEN`、`METRICS_TOKEN` 及所有其他行。

改完后用 `grep` 复核三行已一致（`INTRANET_HOST` 与 `INTRANET_BIND_ADDRESS` 相同，`PUBLIC_ORIGIN` 恰好等于 `http://$INTRANET_HOST:$INTRANET_HTTP_PORT`）。不一致即停止报告——预检脚本也会拦，但提前发现更省时。

若是 `--no-deploy`，到此处打印新配置三行后结束。

## 3. 重新发布

在项目根执行（**注意末尾不带 `--sync-bundled-content`**，见下方说明）：

```bash
bash deploy/production.sh release --profile intranet \
  --env-file deploy/intranet.env \
  --backup-dir "$HOME/.battle-simulator-backups" --apply
```

该命令为长任务（含镜像构建，首次或代码变动时数分钟），用后台执行并轮询日志。它内部会：先备份数据库到 `~/.battle-simulator-backups` → 构建 → 排空并重建 authority → 重建 proxy（这一步让端口绑定到新 IP）→ 等待 healthy → 稳定性观察 15s。数据库卷 `battle-simulator-intranet-pg` 被保留，不会删除。

**关于 `--sync-bundled-content`（重要）**：纯切换网络只是改 IP 绑定，**不要**带这个参数。同步内置场景（襄阳/江汉）是更新地图的独立步骤；若数据库里某内置场景缺少已发布修订，它会抛 `seed refuses upgrade` 让脚本返回非零退出码（服务其实已起来，但脚本判定失败）。需要更新地图时单独、明确地执行日常更新流程，而不是在切网络时夹带。

**停止条件**：

- 发布脚本退出码非 0 且 **proxy 容器未成功重建/绑定到新 IP**（见第 4 步验证）。若退出码非 0 但 proxy 已正确绑定新 IP 且 `/healthz` 200，属"脚本因后续无关步骤报错、但切换目标已达成"，按"切换成功+附带告警"报告，不判定为失败。
- 构建或健康检查阶段失败。保留终端日志，**绝不**执行 `docker compose down -v`（会删数据库卷）。

## 4. 验证

依次确认（均为只读）：

1. `docker ps --filter name=intranet --format ...` 三个容器都在，proxy 端口列显示 `<新 IP>:8080->80/tcp`，authority/postgres 为 healthy。
2. `lsof -nP -iTCP:8080 -sTCP:LISTEN` 显示监听地址为 `<新 IP>:8080`。
3. `curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://<新 IP>:8080/healthz` 返回 200，body 含 `"ok":true,"phase":"serving"`。
4. 可选：旧 IP `curl` 应超时（已自然失效，非问题）。

## 5. 副作用提示（务必在报告中告知）

- 浏览器 cookie 按主机名绑定，旧地址的登录态不会带到新地址，**需在新地址重新登录一次**——这是浏览器行为，非数据丢失。
- 账号、房间、对局、历史数据全部保留。
- 新访问地址：`http://<新 IP>:8080/`。

## 报告

```text
【内网网络切换报告】
- 项目：battle-simulator 内网部署
- 旧 IP：{旧值}（来源：deploy/intranet.env）
- 新 IP：{新值}（来源：{自动探测en0/显式参数}）
- 校验：RFC1918 私网 {PASS/FAIL}
- 配置改动：{三行已更新/无需变更（新旧相同）}
- 发布：{--no-deploy 未发布 / 退出码 / proxy 重建结果}
- 验证：容器 {3/3} / 监听 {新IP:8080} / healthz {状态}
- 新访问地址：http://{新 IP}:8080/
- 提醒：需在新地址重新登录一次（非数据丢失）
- 附带告警：{若有，如脚本非零退出但服务已正常 / 无}
```
