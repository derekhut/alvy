# alvy 词根学习

终端词根记忆工具，用新东方词根词缀记忆法帮你拆解英语单词。

30个词根 × 5个单词 = 150个核心词汇

## 安装

### macOS / Linux

需要 Node.js 18+。如果没有，安装脚本会自动安装。

```bash
curl -fsSL https://raw.githubusercontent.com/derekhut/alvy/main/install.sh | bash
```

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g alvy
```

## 命令

| 命令 | 说明 |
|------|------|
| `alvy` | 开始今天的学习（每次3个词根） |
| `alvy review` | 复习已学词根 |
| `alvy stats` | 导出学习进度 |
| `alvy doctor` | 检查运行环境 |

## 学习方式

每个单词通过词根推导链来记忆：

```
bene(好的) + fit(做) → 做好事 → 益处
bene(好的) + vol(意愿) + ent(…的) → 有好意愿的 → 仁慈的
pre(提前) + dict(说) → 提前说出 → 预测
```

每次学习3个词根，每个词根5个单词。按回车逐个学习，每个单词都有词根拆解、推导链、中文释义和例句。

## 操作方式

- **Enter** — 下一步（进入下一个单词/词根）
- **q** — 退出（自动保存进度）
- **Ctrl+C** — 退出（自动保存进度）

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
npm uninstall -g alvy
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
