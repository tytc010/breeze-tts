# dsh-breeze-tts

把本地 [Breeze TTS 2](https://github.com/HoppouAI/Breeze-TTS-2.cpp) 包装成 DeepSeek Harness（DSH）插件的面板：连服务、选音色、生成语音、管文件，并能一键接入 [Aurabot（dsh-aurabot-qq）](https://github.com/accomplish07zrh-eng/dsh-aurabot-qq) 的语音条。

> 纯前端 + Node 自带能力，无第三方依赖；宿主侧只管 `/breeze-tts/api/*`，网页侧是一个 `ModuleLoader` 模块。

## 功能

| 标签 | 能做什么 |
|---|---|
| **连接** | 绿/红灯显示 Breeze 是否在线、延迟、采样率、WS 端口；一键启动/停止 `breeze-server.exe`（带日志窗口）；配置 exe、模型、输出目录、开机自启 |
| **生成** | 音色设计（描述造音）、音色克隆（参考音频 + 逐字稿）、音色导演（克隆 + 指令）、变声（实验，保留原表演换音色）；结果自动落盘并可直接播放 |
| **音色** | 列出 Breeze 已保存音色（时长/描述）、设为默认、改描述、移除、**从参考音频新建并保存到 Breeze**；另存「音色设计预设」（描述文本） |
| **文件** | 列出输出目录里的音频（大小/时间）、在线播放、下载、勾选批量删除、打开文件夹 |
| **接入 Aurabot** | 选音色 + 导演指令 → 写入 Aurabot 的 `local/tts.mjs` 并打开 `local.tts` 开关；可一键断开并还原 |

## 前置条件

1. **Breeze TTS 2.cpp 的可执行文件**（Windows/Linux 预编译包）：<https://github.com/HoppouAI/Breeze-TTS-2.cpp/releases>
2. **GGUF 权重**：<https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp>（推荐 `breeze-tts-2-q8_0.gguf`，约 3.3 GB，Q8_0 显存约 4 GB）
3. DeepSeek Harness（桌面版或 `dsh web`）

## 安装

### 方式 A：手工放进 profile（推荐，开发期）

```powershell
# 1. 放到 profile 的插件目录
git clone https://github.com/<你的用户名>/dsh-breeze-tts.git `
  "$env:USERPROFILE\.dsh\profiles\desktop\plugins\dsh-breeze-tts"

# 2. 建目录联接（Windows；Linux/macOS 用 ln -s）
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-breeze-tts" `
  -Target "$env:USERPROFILE\.dsh\profiles\desktop\plugins\dsh-breeze-tts"
```

在 profile 的 `package.json` 里登记：

```json
{
  "dependencies": { "dsh-breeze-tts": "file:./plugins/dsh-breeze-tts" },
  "dsh": { "profile": { "bundles": ["...", "dsh-breeze-tts"] } }
}
```

**重启 DSH**（插件图在启动时构建），侧栏就会出现「Breeze TTS」。

### 方式 B：插件管理器

如果你的 DSH 支持从本地目录或 npm 安装插件，让它在安装后把 `dsh-breeze-tts` 加进 `bundles` 即可，等价于方式 A。

## 首次配置

打开面板 →「连接」页：

| 项 | 说明 |
|---|---|
| 服务地址 | 默认 `http://127.0.0.1:8080` |
| 端口 | 启动服务时用，默认 8080 |
| `breeze-server.exe` | 指向解压出来的可执行文件 |
| 模型 `.gguf` | 指向下载的 GGUF |
| 语音输出文件夹 | 生成的音频落在这里，默认 `~/BreezeTTS-voice` |

填好点「保存设置」→「启动服务」，等约 20 秒（模型加载 + warmup），状态灯变绿即可。

## 接入 Aurabot

「接入 Aurabot」页选一个音色（或留空用描述现场设计）、填可选导演指令、点「接入 Aurabot」。插件会：

1. 写 `plugins-data/aurabot/local/tts.mjs`（先备份同名的非本插件脚本为 `.bak`）
2. 把 `plugins-data/aurabot/config.json` 的 `local.tts` 置为 `true`
3. 再调一次 Aurabot 的 `/aurabot/api/save`，让它热加载配置（否则它内存里还是旧值）

「断开并还原」会把 `.bak` 还原或删除脚本，并把开关置回 `false`。

> 这依赖 dsh-aurabot-qq 的「本地接口」约定（`local/tts.mjs` + `config.local.tts`）。Aurabot 大版本更新后如果改了这套约定，需要同步调整。

## 安全

Breeze 的 HTTP / WebSocket 端口**没有鉴权和限流**。插件默认只绑 `127.0.0.1`，请不要改成 `0.0.0.0` 后直接暴露到公网。

## 已知限制

- **单并发**：Breeze 一次只处理一个请求，第二个会返回 409。插件内部做了串行队列（顶部显示队列长度），Aurabot 侧的脚本也做了退避重试，但极端并发仍会排队。
- **音色设计的结果不能存进 Breeze**：`POST /v1/voices` 只接受「参考音频 + 逐字稿」，设计出来的音色只能用「预设」保存描述。
- 变声（voice conversion）是 Breeze 的实验特性，长音频与唱腔的稳定性有限。

## 许可

本插件源码：[MIT](LICENSE)。

Breeze TTS 2 的**模型权重**另受 BreezeBlue Research and Non-Commercial License 约束（仅研究 / 非商用），与本插件的 MIT 许可无关。使用者需自行确保参考音频、克隆对象与生成内容的权利。
