import type { DiscoveryBook } from './types';

/** A small offline starter collection. Summaries are original editorial notes, not scraped reviews. */
export const DISCOVERY_CATALOG: readonly DiscoveryBook[] = [
  {
    id: 'fortress-besieged',
    title: '围城',
    author: '钱钟书',
    category: 'literature',
    summary:
      '从归国、求职到婚恋，方鸿渐总在选择与逃避之间徘徊。适合想读一部语言机锋密集、又能照见日常困境的小说。',
    titleAliases: ['Fortress Besieged'],
    authorAliases: ['Qian Zhongshu'],
  },
  {
    id: 'to-live',
    title: '活着',
    author: '余华',
    category: 'literature',
    summary:
      '福贵的一生经历失去与变迁，故事把宏大的时代落在一个普通家庭身上。篇幅不长，却会让人重新思考活着的分量。',
    titleAliases: ['To Live'],
    authorAliases: ['Yu Hua'],
  },
  {
    id: 'blood-merchant',
    title: '许三观卖血记',
    author: '余华',
    category: 'literature',
    summary:
      '许三观用卖血应付家庭的难关，荒诞与温情交替出现。可以从中读到普通人维持生活的韧性，以及父亲身份如何被行动塑造。',
    authorAliases: ['Yu Hua'],
  },
  {
    id: 'human-flora',
    title: '人间草木',
    author: '汪曾祺',
    category: 'literature',
    summary:
      '从花草、食物到故乡人物，文字把平常生活写得有滋有味。适合不想追逐复杂情节、只想慢慢读几页的时候。',
  },
  {
    id: 'ordinary-world',
    title: '平凡的世界',
    author: '路遥',
    category: 'literature',
    summary:
      '孙少安和孙少平在城乡变化中寻找各自的位置。适合愿意投入一段长阅读，观察劳动、亲情与个人选择如何交织的人。',
  },
  {
    id: 'border-town',
    title: '边城',
    author: '沈从文',
    category: 'literature',
    summary:
      '一座湘西小城、一条渡船和少女翠翠的情感，组成安静而带有遗憾的故事。适合喜欢乡土景物与含蓄叙事的读者。',
  },
  {
    id: 'right-bank',
    title: '额尔古纳河右岸',
    author: '迟子建',
    category: 'literature',
    summary:
      '一位鄂温克老人回望族人的生活，讲述森林、迁徙与失去。人与自然的关系贯穿故事，也让文明变化有了具体的面孔。',
  },
  {
    id: 'little-prince',
    title: '小王子',
    author: '安托万·德·圣埃克苏佩里',
    category: 'literature',
    summary:
      '一个孩子走过不同星球，遇见执着于权力、数字和占有的大人。读起来轻巧，却不断追问关系、责任与真正重要的事。',
    titleAliases: ['The Little Prince', 'Le Petit Prince'],
    authorAliases: ['Antoine de Saint-Exupéry', '圣埃克苏佩里'],
  },
  {
    id: 'nineteen-eighty-four',
    title: '1984',
    author: '乔治·奥威尔',
    category: 'literature',
    summary:
      '温斯顿试图保留自己的记忆与判断，面对的是一个控制语言和历史的世界。适合思考信息、权力以及个人自由的边界。',
    titleAliases: ['Nineteen Eighty-Four'],
    authorAliases: ['George Orwell', '乔治奥威尔', '奥威尔'],
  },
  {
    id: 'animal-farm',
    title: '动物农场',
    author: '乔治·奥威尔',
    category: 'literature',
    summary:
      '动物们推翻旧秩序后，新的规则渐渐改变。一个短小的寓言，把理想、组织和权力如何变形写得十分清楚。',
    titleAliases: ['Animal Farm'],
    authorAliases: ['George Orwell', '奥威尔'],
  },
  {
    id: 'solitude',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    category: 'literature',
    summary:
      '布恩迪亚家族的几代人在马孔多相聚、离散，现实与奇异事件自然相融。适合想体验不同叙事节奏、愿意慢慢辨认人物关系的人。',
    titleAliases: ['One Hundred Years of Solitude', 'Cien años de soledad'],
    authorAliases: ['Gabriel García Márquez'],
  },
  {
    id: 'moon-sixpence',
    title: '月亮和六便士',
    author: '威廉·萨默塞特·毛姆',
    category: 'literature',
    summary:
      '一位证券经纪人突然离开原有生活去绘画，旁观者试图理解他的选择。故事让艺术追求与现实责任之间的冲突变得尖锐。',
    titleAliases: ['The Moon and Sixpence'],
    authorAliases: ['W. Somerset Maugham', '毛姆', 'Somerset Maugham'],
  },
  {
    id: 'walden',
    title: '瓦尔登湖',
    author: '亨利·戴维·梭罗',
    category: 'literature',
    summary:
      '梭罗记录湖边的简朴生活，思考人究竟需要多少东西。适合想暂停忙碌、重新审视时间与生活方式的读者。',
    titleAliases: ['Walden'],
    authorAliases: ['Henry David Thoreau', '梭罗'],
  },
  {
    id: 'fifteen-eighty-seven',
    title: '万历十五年',
    author: '黄仁宇',
    category: 'history',
    summary:
      '从一个看似平静的年份切入，观察明代官僚制度与个人命运。适合想从几位具体人物理解制度困境，而不是背诵年表的人。',
    titleAliases: ['1587, A Year of No Significance'],
    authorAliases: ['Ray Huang'],
  },
  {
    id: 'political-history',
    title: '中国历代政治得失',
    author: '钱穆',
    category: 'history',
    summary:
      '围绕汉、唐、宋、明、清的政治制度展开比较，讨论制度怎样运行、又怎样遇到限制。适合建立中国政治史的初步问题框架。',
  },
  {
    id: 'ming-history',
    title: '明朝那些事儿',
    author: '当年明月',
    category: 'history',
    summary:
      '以人物和事件串起明朝历史，叙述容易进入。适合从故事打开历史兴趣，再进一步寻找更专门的研究。',
  },
  {
    id: 'su-tungpo',
    title: '苏东坡传',
    author: '林语堂',
    category: 'history',
    summary:
      '沿苏轼的仕途、流放、交游与创作，理解一个人在逆境中如何生活。文学与人生相互映照，适合喜欢人物传记的读者。',
    titleAliases: ['The Gay Genius'],
    authorAliases: ['Lin Yutang'],
  },
  {
    id: 'sapiens',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    category: 'history',
    summary:
      '从人类合作、农业到现代社会，作者尝试用一条大尺度线索连接许多变化。适合带着问题阅读，并把论断与其他历史研究相互比较。',
    titleAliases: ['Sapiens', 'Sapiens: A Brief History of Humankind'],
    authorAliases: ['Yuval Noah Harari', '尤瓦尔·诺亚·赫拉利'],
  },
  {
    id: 'guns-germs-steel',
    title: '枪炮、病菌与钢铁',
    author: '贾雷德·戴蒙德',
    category: 'history',
    summary:
      '为什么不同地区的社会发展路径不同？作者从地理、作物、动物和传播条件寻找解释，适合关心历史长期成因的读者。',
    titleAliases: ['Guns, Germs, and Steel'],
    authorAliases: ['Jared Diamond'],
  },
  {
    id: 'from-soil',
    title: '乡土中国',
    author: '费孝通',
    category: 'society',
    summary:
      '从熟人社会、差序格局与礼治等概念，理解传统乡土社会的组织方式。篇幅精练，适合把身边关系放到更大的结构中观察。',
    titleAliases: ['From the Soil'],
    authorAliases: ['Fei Xiaotong'],
  },
  {
    id: 'factfulness',
    title: '事实',
    author: '汉斯·罗斯林',
    category: 'society',
    summary:
      '我们对世界的印象为何常常偏离数据？通过常见认知习惯和实例，作者鼓励读者建立更有尺度的判断。',
    titleAliases: ['Factfulness'],
    authorAliases: ['Hans Rosling'],
  },
  {
    id: 'amusing-ourselves',
    title: '娱乐至死',
    author: '尼尔·波兹曼',
    category: 'society',
    summary:
      '当公共讨论越来越依赖娱乐形式，表达的内容会发生什么变化？从电视时代出发的问题，也适合拿来观察今天的信息环境。',
    titleAliases: ['Amusing Ourselves to Death'],
    authorAliases: ['Neil Postman'],
  },
  {
    id: 'justice',
    title: '公正',
    author: '迈克尔·桑德尔',
    category: 'society',
    summary:
      '通过具体的道德两难，比较不同的公正观念。适合喜欢先讨论一个生活问题，再追问其背后原则的人。',
    titleAliases: ['Justice', "Justice: What's the Right Thing to Do?"],
    authorAliases: ['Michael J. Sandel', 'Michael Sandel'],
  },
  {
    id: 'selfish-gene',
    title: '自私的基因',
    author: '理查德·道金斯',
    category: 'science',
    summary:
      '从基因的视角解释进化中的竞争与合作，改变观察生命行为的尺度。适合愿意跟着论证思考，而不把书名直接等同于道德判断的人。',
    titleAliases: ['The Selfish Gene'],
    authorAliases: ['Richard Dawkins'],
  },
  {
    id: 'cosmos',
    title: '宇宙',
    author: '卡尔·萨根',
    category: 'science',
    summary:
      '把天文学、科学史与人类的好奇心连接起来，讲述我们如何理解宇宙。适合想获得宏观视野，又喜欢科学故事的读者。',
    titleAliases: ['Cosmos'],
    authorAliases: ['Carl Sagan'],
  },
  {
    id: 'brief-history-time',
    title: '时间简史',
    author: '史蒂芬·霍金',
    category: 'science',
    summary:
      '从空间、时间与黑洞等问题出发，介绍现代宇宙观。可以按自己的节奏阅读，把暂时不懂的地方留作下一次探索的入口。',
    titleAliases: ['A Brief History of Time'],
    authorAliases: ['Stephen Hawking', '斯蒂芬·霍金', '霍金'],
  },
  {
    id: 'silent-spring',
    title: '寂静的春天',
    author: '蕾切尔·卡森',
    category: 'science',
    summary:
      '追踪化学杀虫剂在生态系统中的影响，展示环境问题如何超出单一地点。适合关心科学证据与公共决策之间关系的读者。',
    titleAliases: ['Silent Spring'],
    authorAliases: ['Rachel Carson'],
  },
  {
    id: 'thinking-fast-slow',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    category: 'psychology',
    summary:
      '直觉与审慎思考怎样合作，又在哪些地方容易出错？通过判断与决策的研究，帮助读者辨认日常思维中的捷径。',
    titleAliases: ['Thinking, Fast and Slow'],
    authorAliases: ['Daniel Kahneman'],
  },
  {
    id: 'influence',
    title: '影响力',
    author: '罗伯特·西奥迪尼',
    category: 'psychology',
    summary:
      '互惠、承诺、社会认同等因素如何影响人的选择？适合想更清楚地理解说服过程，并识别自己何时受到推动的人。',
    titleAliases: ['Influence', 'Influence: The Psychology of Persuasion'],
    authorAliases: ['Robert B. Cialdini', 'Robert Cialdini'],
  },
  {
    id: 'courage-disliked',
    title: '被讨厌的勇气',
    author: '岸见一郎、古贺史健',
    category: 'psychology',
    summary:
      '以对话形式讨论人际关系、自我选择与课题分离。适合把书中的观点与自己的生活经验相互检验，而不急着把它们变成标准答案。',
    titleAliases: ['The Courage to Be Disliked'],
    authorAliases: ['Ichiro Kishimi', '岸见一郎'],
  },
];
