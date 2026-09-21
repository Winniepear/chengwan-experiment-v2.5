# Netlify 正式上线检查表

- [ ] Git 仓库包含 `public`、`netlify/functions`、`netlify/database/migrations` 和 `netlify.toml`
- [ ] Netlify 构建日志显示数据库迁移成功
- [ ] 已设置高强度 `ADMIN_TOKEN`，且重新部署
- [ ] `/api/health` 返回 200 和 `ok: true`
- [ ] 城市介绍页不显示图片和标签
- [ ] 帖子页三张图片、六个头像均加载
- [ ] 四组随机化与配额正常
- [ ] 刷新页面后可恢复当前步骤
- [ ] 完整提交后管理页人数增加
- [ ] 四类 CSV 可下载且中文正常
- [ ] `participants`、`responses`、`events` 表均有测试数据
- [ ] 删除正式招募前的测试数据或使用新的 `wave_id`
- [ ] 手机微信浏览器、iOS Safari、Android Chrome 技术试运行通过
- [ ] 伦理审批、知情同意、撤回说明和联系方式已填写
- [ ] 只向受试者发送生产域名，不发送 Deploy Preview 地址
