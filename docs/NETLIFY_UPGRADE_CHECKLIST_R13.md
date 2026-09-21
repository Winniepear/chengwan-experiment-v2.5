# Netlify V2.5 / R13 upgrade checklist

1. 解压并覆盖Git仓库根目录，而不是只上传public。
2. 保留Netlify Database与ADMIN_TOKEN。
3. Build command `npm run build`; publish `public`; functions `netlify/functions`.
4. Deploy Preview检查 `/api/health` 返回R13/Q13/PRETEST-W6/29。
5. 手机实机依次检查城市介绍、帖子、基线、评论提示、六条评论、29题、提交与/admin导出。
6. 确认emoji在目标浏览器/微信WebView中正常显示。
7. 正式招募前补全联系人、邮箱和伦理审批信息。
8. 预测试通过后，如进入正式实验，另起正式wave并把招募目标设为312（78/组）；不要与PRETEST-W6混用。
