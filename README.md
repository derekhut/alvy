# toefl-roots 词根学习

终端词根记忆工具，用新东方词根词缀记忆法帮你拆解英语单词。

30个词根 × 5个单词 = 150个TOEFL核心词汇

## 快速开始

需要 Node.js 18+（[下载](https://nodejs.org)）

```bash
git clone https://github.com/derekhut/memorize-words.git
cd memorize-words
npm install
npm run build
node dist/index.js
```

如果 `npm install` 遇到权限问题：

```bash
# 方法1：修复npm缓存权限
sudo chown -R $(whoami) ~/.npm
npm install

# 方法2：使用临时缓存目录
npm install --cache /tmp/npm-cache
```

## 命令

| 命令 | 说明 |
|------|------|
| `node dist/index.js` | 开始今天的学习（每次3个词根） |
| `node dist/index.js review` | 复习已学词根 |
| `node dist/index.js stats` | 导出学习进度 |
| `node dist/index.js doctor` | 检查运行环境 |

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

学习进度保存在 `~/.toefl-roots/data.json`。

- 首次运行自动创建该文件
- 如果文件损坏，自动备份至 `data.backup.json` 并重新开始
- 重置进度：删除 `~/.toefl-roots/data.json` 即可从头开始

```bash
# 查看进度文件
cat ~/.toefl-roots/data.json

# 重置所有进度
rm ~/.toefl-roots/data.json
```

## 开发

### 项目结构

```
toefl-roots/
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
node dist/index.js     # 运行
```

### 注意事项

- 目前没有测试套件
- UI 文字全部使用中文（见 DESIGN.md）
- CJK 字符不加粗（会影响笔画清晰度）
- import 路径使用 `.js` 扩展名（ESM 规范）
- 数据写入使用原子操作（先写 `.tmp` 再 `rename`）
