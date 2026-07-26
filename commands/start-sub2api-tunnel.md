---
description: "在已配置的 Windows 环境中启动、停止或检查 sub2api Docker Compose 服务与 FRP 隧道"
agent: amagi-leader
---


# 管理 sub2api 与 FRP 隧道

$ARGUMENTS

这是设备专用运维命令。只接受 `start|stop|status`，默认 `start`；其他参数停止。不得从 prompt、日志或报告读取/输出数据库密码、JWT、FRP token 等 secret。

## 配置与执行器

从以下来源按顺序发现配置，读取前先确认文件存在：用户环境变量、用户私有配置、当前工作区的非敏感运维配置。兼容的设备默认值可包括：

- `SUB2API_COMPOSE_FILE`（既有设备可为 `X:/WorkSpace/sub2api/docker-compose.yml`）
- `DOCKER_DESKTOP_EXE`（优先使用环境变量或私有配置；Windows 兼容回退为 `C:/Program Files/Docker/Docker/Docker Desktop.exe`）
- `FRPC_DIR` / `FRPC_CONFIG`（既有设备可位于 `X:/WorkSpace/sub2api-tunnel-deploy/frp-windows/`）
- `SUB2API_LOCAL_URL`（默认 `http://127.0.0.1:8080/health`）
- `FRPS_HOST`、`FRPS_PORT`（既有配置可能为 `47.103.109.56:7000`）
- `SUB2API_PUBLIC_URL`（既有配置可能为 `http://47.103.109.56:8081/health`）

FRP 认证必须已经存在于权限受控的 `frpc.toml` 或安全环境变量中；缺失时停止，不生成或回显 token。只检查配置文件存在、权限合理和可解析，不打印全文。

在 Windows 上由 Bash 调用可发现的 `powershell.exe -NoProfile -File <script>`；不可用时停止，不能假装已执行。复杂 PowerShell 写入临时 `.ps1` 后运行并清理，不做高风险内联转义。

## `status`：只读检查

依次检查并记录：

1. `docker info --format "{{.ServerVersion}}"`。
2. `docker compose -f $SUB2API_COMPOSE_FILE ps`。
3. 本地健康 URL（HTTP 状态与超时）。
4. `frpc` 进程；若存在，用 PID 检查到 `$FRPS_HOST:$FRPS_PORT` 的 TCP `Established`。
5. 公网健康 URL。

FRP 成功必须同时满足 TCP Established 与公网 HTTP 2xx；不得以可能缓冲为空的 `frpc.log` 作为成功证据。

## `start`：启动并验证

1. 校验 compose、frpc executable/config、Docker CLI 和端口配置。解析 `DOCKER_DESKTOP_EXE` 时优先使用环境变量或私有配置；未配置则采用 Windows 兼容回退 `C:/Program Files/Docker/Docker/Docker Desktop.exe`。启动前必须检查该可执行文件存在；需要启动 daemon 但文件缺失时停止并报告实际检查路径，不猜测其他位置。
2. `docker info` 失败时按已校验的 `DOCKER_DESKTOP_EXE` 启动 Docker Desktop；随后最多等待 120 秒，每 5 秒执行一次 `docker info` 探测。启动失败或探测超时即停止并报告。
3. 执行 `docker compose -f $SUB2API_COMPOSE_FILE up -d`，轮询本地健康 URL最多 120 秒，并检查 compose 中所有声明服务的实际状态/health；不得硬编码恰好三个服务作为成功条件。
4. 若已有 frpc，核对其 executable、配置与连接是否匹配；不匹配则停止，不杀进程。无进程时以 `$FRPC_DIR` 为工作目录启动 frpc，并保留 PID。
5. 验证 TCP Established 和公网 HTTP 2xx。任一失败即总体失败，报告当前容器与进程状态；不得因进程存在宣称成功。

## `stop`：停止但保留数据

1. 只停止由本配置启动/匹配的 frpc 进程；PID 或 executable/config 归属不明时停止并报告，不按名称强杀所有进程。
2. 执行 `docker compose -f $SUB2API_COMPOSE_FILE down`，复查容器和进程状态。
3. 永远不自动使用 `down -v`。删除数据卷属于不可逆操作，只能在用户另行明确授权具体 compose 项目与数据范围后执行。

## 报告

```text
【sub2api/FRP 报告】
- 模式：start|stop|status
- 配置来源：{路径/环境变量名，不含 secret}
- Docker/Compose：{PASS/FAIL + 版本与服务状态}
- 本地健康检查：{URL + status}
- frpc：{PID/状态 + TCP 连接}
- 公网健康检查：{URL + status}
- 总体：PASS/FAIL
- 保留数据：是（未执行 down -v）
- 风险/失败恢复：{可复核事实}
```
