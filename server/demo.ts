import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { safePath } from './vault.js';

export async function seedDemo(vault: string) {
  await fs.mkdir(vault, { recursive: true });
  const entries = [
    {
      ago: 150,
      title: '一次没有完成的开始',
      text: '这是虚构示例人物的记录，不代表使用者。\n\n我开始了一个新的个人知识工具项目，同时还在做另外两个项目。\n我重视自主与创造，希望做出一个真正能长期使用的作品。\n每天下班后开发到很晚，睡眠约5.5小时，身体逐渐疲惫。\n最后因为精力不足暂停了项目。失败并不来自缺少想法，而是无法维持同时推进三个项目的节奏。',
    },
    {
      ago: 95,
      title: '一个小作品被人使用',
      text: '这是虚构示例人物的记录，不代表使用者。\n\n这次我决定只做一个很小的阅读工具，每周留两个晚上开发。\n我完成并发布了第一个版本，收到三位朋友的具体反馈。\n保持每周三次运动，睡眠约7.5小时，精力逐渐恢复。\n我学会了先验证一个最重要的问题，再继续增加功能。\n真正让我在乎的是创造能长期陪伴人的东西，而不是短期热度。',
    },
    {
      ago: 30,
      title: '开始思考时间与自我',
      text: '这是虚构示例人物的记录，不代表使用者。\n\n我开始构思三世镜，希望把个人记录变成可以回顾的时间模型。\n最近阅读了有关叙事身份与长期决策的文章，练习把复杂概念做成简单原型。\n目前有稳定工作，给副项目的预算有限，暂时没有改变收入来源的计划。\n我重视长期积累与自主，不愿意为了快速增长牺牲作品的深度。',
    },
    {
      ago: 7,
      title: '灵感正在变多',
      text: '这是虚构示例人物的记录，不代表使用者。\n\n三世镜项目的原型有了进展，但我再次同时开启了三个功能方向。\n注意力开始分散，总是想把所有想法一起实现。\n这周睡眠约6小时，精力偏低，运动减少。\n我跟朋友聊了这个作品，想起真实的关系与陪伴也需要时间。',
    },
    {
      ago: 1,
      title: '给当下留一个位置',
      text: '这是虚构示例人物的记录，不代表使用者。\n\n今天完成了三世镜的核心流程草图，项目方向比上周清晰。\n我希望把注意力收回到一个最小闭环，专注提升了一点。\n最近睡眠约6小时，精力仍然偏低，需要恢复。\n我决定暂不增加新的项目，先每周完成一个可以被体验的小版本。\n接下来要判断：未来三个月，应当投入多少时间给三世镜？',
    },
  ];
  for (const entry of entries) {
    const date = new Date(Date.now() - entry.ago * 86400000).toISOString().slice(0, 10);
    const file = await safePath(vault, `Journal/${date} ${entry.title}.md`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
      await fs.writeFile(
        file,
        `---\n${YAML.stringify({ title: entry.title, date, source: 'fictional_demo', kind: 'self_report', demo: true })}---\n\n# ${entry.title}\n\n${entry.text}\n`,
        { flag: 'wx' },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
}
