(() => {
  const tokenInput = document.getElementById('token');
  const loadBtn = document.getElementById('loadBtn');
  const dashboard = document.getElementById('dashboard');
  const errorBox = document.getElementById('adminError');
  localStorage.removeItem('chengwan_admin_token'); // remove legacy persistent copy
  const stored = sessionStorage.getItem('chengwan_admin_token');
  if (stored) tokenInput.value = stored;

  async function request(path, asBlob = false) {
    const token = tokenInput.value.trim();
    if (!token) throw new Error('请输入管理员令牌');
    const res = await fetch(path, { headers: { 'X-Admin-Token': token } });
    if (!res.ok) throw new Error(res.status === 401 ? '管理员令牌错误' : `请求失败：${res.status}`);
    return asBlob ? res.blob() : res.json();
  }

  const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function table(rows, columns) {
    if (!rows.length) return '<p class="muted">暂无数据</p>';
    return `<div style="overflow:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr>${columns.map(c => `<th style="text-align:left;padding:8px;border-bottom:1px solid #d9e0e4">${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${columns.map(c => `<td style="padding:8px;border-bottom:1px solid #edf0f1">${escape(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function loadSummary() {
    errorBox.textContent = '';
    try {
      const data = await request('/api/admin/summary');
      sessionStorage.setItem('chengwan_admin_token', tokenInput.value.trim());
      document.getElementById('waveInfo').textContent = `${data.wave_id}｜${data.revision_id}／${data.questionnaire_revision_id}｜29题｜每组 ${data.quota_per_condition} 个随机名额`;
      document.getElementById('totals').innerHTML = [
        ['创建记录', data.totals.created], ['已随机化', data.totals.randomized],
        ['已提交', data.totals.submitted], ['筛除', data.totals.screened_out]
      ].map(([k,v]) => `<div class="status-item"><span>${k}</span><strong>${v ?? 0}</strong></div>`).join('');
      document.getElementById('conditions').innerHTML = table(data.conditions, ['condition_id','randomized','submitted']);
      document.getElementById('steps').innerHTML = table(data.steps, ['current_step','n']);
      dashboard.classList.remove('hidden');
    } catch (err) {
      errorBox.textContent = err.message;
      dashboard.classList.add('hidden');
    }
  }

  document.getElementById('logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('chengwan_admin_token'); tokenInput.value=''; dashboard.classList.add('hidden'); errorBox.textContent='本页令牌已清除。'; });
  loadBtn.addEventListener('click', loadSummary);
  document.querySelectorAll('[data-export]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const name = btn.dataset.export;
      const blob = await request(`/api/admin/export/${name}${document.getElementById('currentOnly').checked ? '?scope=current' : ''}`, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = ({'wide.csv':'experiment_wide.csv','responses.csv':'responses_long.csv'})[name] || name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { errorBox.textContent = err.message; }
  }));

  document.getElementById('manifestBtn').addEventListener('click', async () => {
    try {
      const data = await request('/api/admin/manifest');
      const pre = document.getElementById('manifest');
      pre.textContent = JSON.stringify(data, null, 2);
      pre.classList.remove('hidden');
    } catch (err) { errorBox.textContent = err.message; }
  });
})();
