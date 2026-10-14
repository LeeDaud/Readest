# 发现书籍：评分与书评 API 接入调研

调研日期：2026-10-14。范围为官方文档、官方开发者入口及不带凭证的公开请求；未使用私有移动端接口、第三方代理或未授权密钥。网络探测结果仅代表当前开发环境，不代表手机网络。未找到公开接入渠道不等于不存在商务合作接口。

## 来源比较

| 来源 | 正式接入能力 | 能提供什么 | 第一版选择 |
| --- | --- | --- | --- |
| 豆瓣读书 | 历史 v2 API 存在；本次公开请求返回 HTTP 400、`apikey_required`。开发者站未能访问，未找到当前新项目可稳定申请图书权限的正式流程 | 获得授权后的具体字段、书评权限需要另行确认；不能把历史 SDK 当作当前服务承诺 | 应用内打开豆瓣图书搜索，由用户查看原站评分与书评 |
| Open Library | 无密钥公开 JSON API；查询实测 HTTP 200 | 书名、作者、作品 ID、封面；搜索索引中部分作品含评分平均值和人数，不能保证每本书都有 | 已接入封面与评分，保留来源链接；本地简介离线可用 |
| Google Books | 官方 Books v1；公开资料无需用户登录，但请求须用 API Key 或 OAuth 标识应用 | 简介、封面、ISBN；可选 `averageRating`、`ratingsCount`。文档中的 `userInfo.review` 是当前用户自己的评论，并非完整公开书评库 | 后续作为补充源；不依赖共享的无密钥配额，不把 Key 打包为项目公共凭证 |
| Hardcover | 官方 GraphQL，需个人账号令牌，当前文档标为 beta | 书目信息及权限允许的公开/本人/所关注用户数据；评分和评论字段应按实际 schema、授权核验 | 后续复用 Readest 已有 Hardcover 集成；推荐首版不要求新账号 |
| Goodreads | 本次官方 `/api` 入口跳转首页；帮助页未能取得可读的接口说明 | 未获得适用于新项目的正式开发者文档或申请通道，未持旧 Key 验证 | 不作为首版 API 依赖；不使用非官方抓取服务 |
| The StoryGraph | 官方路线图的 API 功能仍为 `Long-term`，未找到已发布通用 API 文档 | 当前不足以据此实现正式接入 | 暂不接入 |

## 官方依据

- [豆瓣官方历史 Python OAuth 客户端](https://github.com/douban/douban-client)：证明历史接口，不证明当前新申请可用。入口：[豆瓣开发者站](https://developers.douban.com/)。本次只请求 `https://api.douban.com/v2/book/search?q=1984&count=1`，错误 `code: 131`、`msg: apikey_required`。
- [Open Library API 使用规范](https://openlibrary.org/developers/api)：默认每秒 1 次；带应用及真实联系方式标识的请求每秒 3 次。支持以人为中心的实时书籍查询；要求缓存，不适合作为高流量或批量抓取后台。
- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)：支持指定返回字段、作品与版本查询；索引 schema 不保证永久稳定。[官方搜索 schema](https://github.com/internetarchive/openlibrary/blob/master/openlibrary/plugins/worksearch/schemes/works.py) 可核验评分字段。
- [Google Books 接入指南](https://developers.google.com/books/docs/v1/using)、[Volume 字段说明](https://developers.google.com/books/docs/v1/reference/volumes)：公开数据的用户认证要求与应用标识要求是两回事。当前无凭证探测返回 HTTP 429、共享消费者配额已耗尽，不能以偶尔可访问证明无密钥稳定可用。
- [Hardcover 接入说明](https://docs.hardcover.app/api/getting-started/)：每分钟 60 请求、查询最长 30 秒、深度限制 3；令牌不得放入浏览器，需安全后端。文档最后更新 2025-07-21，接入前需重新确认 token 生命周期和当前 schema。
- [Goodreads 官方 API 入口](https://www.goodreads.com/api)、[官方 API 帮助入口](https://help.goodreads.com/s/article/Does-Goodreads-support-the-use-of-APIs)：本次不能据此确认完整的新项目接入流程，故不承诺 API 能力。
- [StoryGraph 官方 API 路线图](https://roadmap.thestorygraph.com/features/posts/an-api)：状态 `Long-term`，不等同于已开放接口。

## 第一版实现与边界

1. 应用内独立的“发现书籍”模块，单张卡片展示，30 本编辑书单覆盖文学、历史、社会、科学、心理。简介由本项目撰写，不冒充网站评论或排行榜。
2. 随机选择排除当前书架、已读、不感兴趣、已选择及本轮已展示作品。左滑等同“不感兴趣”，上下滑用于滚动；按钮可执行同样操作。切换推荐不等同已读。
3. 记录保存到 Readest 系统设置的 `bookDiscovery`，支持手工补记、恢复推荐；本轮记录在退出后保留。新一轮只重置展示记录，保留已读与偏好。暂无专门云端同步或完整插件安装协议。
4. Open Library 由用户点“获取封面与评分”触发，只查当前书籍。匹配完整书名/已知译名和作者，宁可不显示也不误用改编版或同名书评分。默认请求间隔至少 1.1 秒，同一作品请求合并、缓存 7 天、8 秒请求超时。网络失败不阻断本地推荐。
5. 评分明确标注 Open Library、5 分制和人数；未获得真实评分时不填入模拟数据。豆瓣按钮打开原站搜索，不在卡片内展示抓取的书评。
6. 选择书籍后，在用户配置的 Z-Library 站点打开 `/s/{书名 作者}`，每个备用站保留搜索词。用户在网页确认版本并下载，复用已有手机应用内浏览器、下载入库与打开阅读能力；不自动绕过登录、验证码或下载额度。
7. 当前开发网络对 Z-Library 首页和搜索探测返回 503。URL 编码、备用站顺序和导入监听经测试；真实站点搜索与新页面下载阅读仍需手机验证。

## 后续接入优先级

优先取得可正式使用的中文图书数据授权，或扩展自有书单；Google Books 适合补充元数据，Hardcover 适合已有用户授权后的评分/阅读记录整合。若要直接展示第三方书评正文，需先确定正式 endpoint、展示许可、作者/来源归属和缓存约束，不能只因网站可浏览就认为有可调用的公共 API。
