# alvy 学习终端

终端学习工具。从 TOEFL 词根到 AP 备考，一行命令就能开始。

- **TOEFL 词根** — 30 个词根 × 5 个单词 = 150 个核心词汇
- **AP 心理学** — 36 个概念 / 607 个术语（完整 CED 覆盖）
- **AP 计算机科学原理** — 35 个概念 / 385 个术语（完整 CED 覆盖）
- **AP 世界历史** — 19 个概念 / 255 个术语
- **AP 微观经济学** — 36 个概念 / 499 个术语（完整 CED 覆盖）
- **AP 宏观经济学** — 42 个概念 / 492 个术语（完整 CED 覆盖）

## 安装

### macOS / Linux

需要 Node.js 18+。如果没有，安装脚本会自动安装。

```bash
curl -fsSL https://raw.githubusercontent.com/derekhut/alvy/main/install.sh | bash
```

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g @derekhut/alvy
```

## 命令

| 命令 | 说明 |
|------|------|
| `alvy` | 科目选择器（上次选的科目会高亮，回车继续） |
| `alvy review` | 复习 TOEFL 的薄弱词根 |
| `alvy psych` / `alvy psych review` | AP 心理学（学习 / 复习） |
| `alvy csp` / `alvy csp review` | AP 计算机科学原理（学习 / 复习） |
| `alvy whap` / `alvy whap review` | AP 世界历史（学习 / 复习） |
| `alvy micro` / `alvy micro review` | AP 微观经济学（学习 / 复习） |
| `alvy macro` / `alvy macro review` | AP 宏观经济学（学习 / 复习） |
| `alvy profile` | 查看个人资料（头像、等级、综合得分） |
| `alvy stats` | 导出学习进度 |
| `alvy doctor` | 检查运行环境 |

## 学习方式

TOEFL 词根模式通过词根推导链来记忆每个单词：

```
bene(好的) + fit(做) → 做好事 → 益处
bene(好的) + vol(意愿) + ent(…的) → 有好意愿的 → 仁慈的
pre(提前) + dict(说) → 提前说出 → 预测
```

AP 科目则按 College Board CED（课程考试说明）组织，每次学习 3 个概念，每个概念下 4-30 个核心术语。每个术语都有：中英文定义、联想记忆小技巧、英文例句和中文翻译。学完一组后进入小测验，用 [1]/[2] 快速作答巩固。

## 操作方式

- **→** — 下一步（进入下一个单词/词根）
- **←** — 上一步
- **Esc** — 退出（自动保存进度）
- **1/2** — 测验选择

## 数据存储

学习进度保存在 `~/.alvy/data.json`。

- 首次运行自动创建该文件
- 从旧版（`~/.toefl-roots/`）升级时自动迁移数据
- 如果文件损坏，自动备份至 `data.backup.json` 并重新开始
- 重置进度：删除 `~/.alvy/data.json` 即可从头开始

```bash
# 查看进度文件
cat ~/.alvy/data.json

# 重置所有进度
rm ~/.alvy/data.json
```

## 卸载

```bash
npm uninstall -g @derekhut/alvy
```

## 开发

### 项目结构

```
src/
  index.tsx           # CLI 入口
  app.tsx             # 命令路由
  components/         # UI 组件（Ink/React）
  lib/                # 业务逻辑和数据层
  data/roots.json     # 词根数据库
DESIGN.md             # 设计系统
ARCHITECTURE.md       # 架构文档
```

### 开发命令

```bash
npm run build          # 编译 TypeScript
npm run dev            # 监听模式编译
npm test               # 运行测试
node dist/index.js     # 运行
```
