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

每个单词通过词根拆解来记忆：

```
bene(好的) + fit(做) → 做好事 → 益处
bene(好的) + vol(意愿) + ent(…的) → 有好意愿的 → 仁慈的
pre(提前) + dict(说) → 提前说出 → 预测
```

按回车逐个学习，每个单词都有词根拆解、推导链、中文释义和例句。
