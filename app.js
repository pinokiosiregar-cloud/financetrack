// =============================================
// GANTI DENGAN NILAI DARI SUPABASE KAMU
// =============================================
const SUPABASE_URL = 'https://wwtzcbaxymdebwffrrud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dHpjYmF4eW1kZWJ3ZmZycnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjIzODAsImV4cCI6MjA5MzY5ODM4MH0.CBS6QNCc9cBoNbnGLcJtEfGStJFS7uCtJsFosLsyF3k';
// =============================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== STATE ==========
const COLORS={green:'#16a34a',blue:'#2563eb',red:'#dc2626',purple:'#7c3aed',amber:'#d97706'};
const LIGHT={green:'#dcfce7',blue:'#dbeafe',red:'#fee2e2',purple:'#ede9fe',amber:'#fef3c7'};
let categories=[];
let transactions=[];
let currentType='pemasukan';
let editId=null;
let currentUser=null;
let activePeriod='today';
let lineChart=null,doughnutChart=null,catChart=null,inCatChart=null,invChart=null;

// ========== UTILS ==========
const fmt=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const today=()=>new Date().toISOString().split('T')[0];
const getCat=id=>categories.find(c=>c.id==id);
function catColor(c){return COLORS[c?.color]||'#888'}
function catBg(c){return LIGHT[c?.color]||'#eee'}
function catIcon(c){
  if(!c)return'<div class="cat-icon" style="background:#eee"><i class="ti ti-tag"></i></div>';
  return`<div class="cat-icon" style="background:${catBg(c)};color:${catColor(c)}"><i class="ti ti-${c.icon}" aria-hidden="true"></i></div>`;
}

// ========== AUTH ==========
async function handleLogin(){
  const email=document.getElementById('authEmail').value.trim();
  const pass=document.getElementById('authPassword').value;
  const msg=document.getElementById('authMsg');
  msg.style.display='none';
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){msg.textContent=error.message;msg.style.display='block';return;}
  currentUser=data.user;
  showApp();
}
async function handleRegister(){
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPassword').value;
  const msg=document.getElementById('regMsg');
  msg.style.display='none';
  const {data,error}=await sb.auth.signUp({email,password:pass});
  if(error){msg.textContent=error.message;msg.style.display='block';return;}
  msg.style.color='#16a34a';
  msg.textContent='Registrasi berhasil! Silakan login.';
  msg.style.display='block';
}
async function handleLogout(){
  await sb.auth.signOut();
  document.getElementById('appPage').style.display='none';
  document.getElementById('loginPage').style.display='flex';
  currentUser=null;categories=[];transactions=[];
}
function showRegister(){document.getElementById('loginForm').style.display='none';document.getElementById('registerForm').style.display='block';}
function showLogin(){document.getElementById('registerForm').style.display='none';document.getElementById('loginForm').style.display='block';}

async function showApp(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('appPage').style.display='flex';
  const email=currentUser.email;
  document.getElementById('userEmail').textContent=email;
  document.getElementById('userAvatar').textContent=email[0].toUpperCase();
  document.getElementById('userName').textContent=email.split('@')[0];
  document.getElementById('currentDate').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('fDate').value=today();
  await loadCategories();
  await loadTransactions();
  renderDashboard();
  ['fBuyPrice','fCurPrice','fUnits'].forEach(id=>{
    document.getElementById(id).addEventListener('input',updateGainPreview);
  });
}

function updateGainPreview(){
  const buy=parseFloat(document.getElementById('fBuyPrice').value)||0;
  const cur=parseFloat(document.getElementById('fCurPrice').value)||0;
  const units=parseFloat(document.getElementById('fUnits').value)||0;
  const preview=document.getElementById('gainPreview');
  if(!buy||!cur||!units){preview.style.display='none';return;}
  const modal=buy*units;
  const kini=cur*units;
  const gain=kini-modal;
  const pct=((gain/modal)*100).toFixed(2);
  const isGain=gain>=0;
  preview.style.display='block';
  preview.style.background=isGain?'#dcfce7':'#fee2e2';
  preview.style.color=isGain?'#15803d':'#b91c1c';
  preview.innerHTML=`<strong>${isGain?'GAIN':'LOSS'}:</strong> ${isGain?'+':''}${fmt(gain)} (${isGain?'+':''}${pct}%) &nbsp;|&nbsp; Modal: ${fmt(modal)} → Nilai kini: ${fmt(kini)}`;
}

// ========== LOAD DATA ==========
async function loadCategories(){
  const{data}=await sb.from('categories').select('*').eq('user_id',currentUser.id).order('name');
  if(data&&data.length>0){categories=data;}
  else{await seedCategories();}
}

async function seedCategories(){
  const defaults=[
    {type:'pemasukan',name:'Gaji',icon:'briefcase',color:'green'},
    {type:'pemasukan',name:'Freelance',icon:'laptop',color:'blue'},
    {type:'pemasukan',name:'Bonus',icon:'gift',color:'amber'},
    {type:'pemasukan',name:'Honor',icon:'award',color:'purple'},
    {type:'pemasukan',name:'Dividen',icon:'chart-line',color:'purple'},
    {type:'pemasukan',name:'Sewa',icon:'home',color:'green'},
    {type:'pemasukan',name:'Bisnis',icon:'building-store',color:'blue'},
    {type:'pengeluaran',name:'Makan & Minum',icon:'bowl-spoon',color:'amber'},
    {type:'pengeluaran',name:'Transport',icon:'car',color:'blue'},
    {type:'pengeluaran',name:'Tagihan',icon:'file-invoice',color:'red'},
    {type:'pengeluaran',name:'Belanja',icon:'shopping-cart',color:'purple'},
    {type:'pengeluaran',name:'Pakaian',icon:'shirt',color:'purple'},
    {type:'pengeluaran',name:'Cicilan Pinjaman',icon:'credit-card',color:'red'},
    {type:'pengeluaran',name:'Kesehatan',icon:'heart-rate-monitor',color:'red'},
    {type:'pengeluaran',name:'Hiburan',icon:'device-gamepad-2',color:'purple'},
    {type:'pengeluaran',name:'Game',icon:'device-gamepad-2',color:'blue'},
    {type:'pengeluaran',name:'Kirim ke Rumah',icon:'home-move',color:'green'},
    {type:'pengeluaran',name:'Cemilan',icon:'cookie',color:'amber'},
    {type:'pengeluaran',name:'Pendidikan',icon:'school',color:'blue'},
    {type:'pengeluaran',name:'Lainnya',icon:'dots-circle-horizontal',color:'amber'},
    {type:'investasi',name:'Saham',icon:'chart-candle',color:'blue'},
    {type:'investasi',name:'Reksa Dana',icon:'chart-pie',color:'purple'},
    {type:'investasi',name:'Kripto',icon:'currency-bitcoin',color:'amber'},
    {type:'investasi',name:'Emas',icon:'star',color:'amber'},
    {type:'investasi',name:'Obligasi',icon:'file-dollar',color:'green'},
    {type:'investasi',name:'Properti',icon:'building',color:'blue'},
  ];
  const rows=defaults.map(d=>({...d,user_id:currentUser.id}));
  const{data}=await sb.from('categories').insert(rows).select();
  if(data)categories=data;
}

async function loadTransactions(){
  const{data}=await sb.from('transactions').select('*').eq('user_id',currentUser.id).order('date',{ascending:false});
  transactions=data||[];
}

// ========== NAV ==========
function showPage(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el)el.classList.add('active');
  const titles={dashboard:'Dashboard',transaksi:'Data Transaksi',investasi:'Investasi',laporan:'Laporan & Analisis',kategori:'Data Kategori'};
  document.getElementById('pageTitle').textContent=titles[name]||name;
  if(name==='dashboard')renderDashboard();
  if(name==='transaksi')renderTables();
  if(name==='investasi')renderInvest();
  if(name==='laporan')renderLaporan();
  if(name==='kategori')renderCategories();
}

// ========== PERIOD ==========
function setPeriod(p){
  activePeriod=p;
  document.querySelectorAll('.period-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('ptab-'+p).classList.add('active');
  renderDashboard();
}
function filterByPeriod(list){
  const now=new Date();
  const todayStr=now.toISOString().split('T')[0];
  const monthStr=todayStr.slice(0,7);
  const yearStr=todayStr.slice(0,4);
  return list.filter(t=>{
    if(activePeriod==='today')return t.date===todayStr;
    if(activePeriod==='month')return t.date.startsWith(monthStr);
    if(activePeriod==='year')return t.date.startsWith(yearStr);
    return true;
  });
}

// ========== MODAL ==========
function openModal(id=null){
  editId=id;
  if(id){
    const t=transactions.find(x=>x.id==id);
    setType(t.type);
    document.getElementById('fAmount').value=t.amount;
    document.getElementById('fDate').value=t.date;
    document.getElementById('fDesc').value=t.description;
    document.getElementById('fNote').value=t.note||'';
    document.getElementById('fCat').value=t.cat_id;
    if(t.type==='investasi'){
      document.getElementById('fTicker').value=t.ticker||'';
      document.getElementById('fBuyPrice').value=t.buy_price||0;
      document.getElementById('fCurPrice').value=t.cur_price||0;
      document.getElementById('fUnits').value=t.units||1;
      updateGainPreview();
    }
    document.getElementById('modalTitleText').textContent='Edit Transaksi';
  } else {
    setType('pemasukan');
    ['fAmount','fDesc','fNote','fTicker','fBuyPrice','fCurPrice','fUnits'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('gainPreview').style.display='none';
    document.getElementById('fDate').value=today();
    document.getElementById('modalTitleText').textContent='Tambah Transaksi';
  }
  document.getElementById('modalBg').classList.add('open');
}
function closeModal(){document.getElementById('modalBg').classList.remove('open')}

function setType(t){
  currentType=t;
  ['pemasukan','pengeluaran','investasi'].forEach(x=>{
    const el=document.getElementById('tab-'+x);
    el.className='type-tab'+(t===x?' active-'+x:'');
  });
  document.getElementById('investExtra').style.display=t==='investasi'?'block':'none';
  document.getElementById('gainPreview').style.display='none';
  document.getElementById('obligasiExtra').style.display='none';
  const sel=document.getElementById('fCat');
  sel.innerHTML='';
  categories.filter(c=>c.type===t).forEach(c=>{
    const o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o);
  });
  if(t==='investasi'){
    sel.addEventListener('change',checkObligasi);
    checkObligasi();
  }
}

function checkObligasi(){
  const sel=document.getElementById('fCat');
  const selected=categories.find(c=>c.id==sel.value);
  const isObligasi=selected&&selected.name.toLowerCase().includes('obligasi');
  document.getElementById('obligasiExtra').style.display=isObligasi?'block':'none';
  if(isObligasi){
    ['fKuponRate','fNominal','fTglBeli','fTglJatuhTempo'].forEach(id=>{
      document.getElementById(id).addEventListener('input',updateObligasiPreview);
    });
  }
}

function updateObligasiPreview(){
  const nominal=parseFloat(document.getElementById('fNominal').value)||0;
  const rate=parseFloat(document.getElementById('fKuponRate').value)||0;
  const tglBeli=document.getElementById('fTglBeli').value;
  const tglJatuh=document.getElementById('fTglJatuhTempo').value;
  const preview=document.getElementById('obligasiPreview');
  if(!nominal||!rate||!tglBeli||!tglJatuh){preview.style.display='none';return;}
  const beli=new Date(tglBeli);
  const jatuh=new Date(tglJatuh);
  const now=new Date();
  const totalBulan=Math.max(0,Math.round((jatuh-beli)/(1000*60*60*24*30)));
  const bulanBerjalan=Math.max(0,Math.min(Math.round((now-beli)/(1000*60*60*24*30)),totalBulan));
  const kuponPerBulan=(nominal*rate/100)/12;
  const totalKuponKotor=kuponPerBulan*totalBulan;
  const kuponDiterima=kuponPerBulan*bulanBerjalan;
  const pajak=totalKuponKotor*0.1;
  const gainBersih=totalKuponKotor-pajak;
  // auto isi amount
  document.getElementById('fAmount').value=nominal;
  preview.style.display='block';
  preview.innerHTML=`
    <strong>📋 Kalkulasi Obligasi:</strong><br>
    Kupon/bulan (kotor): <b>${fmt(kuponPerBulan)}</b><br>
    Total kupon s/d jatuh tempo: <b>${fmt(totalKuponKotor)}</b><br>
    Pajak kupon (10%): <b>-${fmt(pajak)}</b><br>
    <strong>Total gain bersih: ${fmt(gainBersih)}</strong><br>
    Sudah berjalan: <b>${bulanBerjalan} bulan</b> dari ${totalBulan} bulan<br>
    Kupon sudah diterima: <b>${fmt(kuponDiterima)}</b>
  `;
}

async function saveTransaction(){
  const amount=parseFloat(document.getElementById('fAmount').value)||0;
  const date=document.getElementById('fDate').value;
  const description=document.getElementById('fDesc').value.trim();
  const cat_id=parseInt(document.getElementById('fCat').value);
  const note=document.getElementById('fNote').value.trim();
  if(!amount||!date||!description){alert('Lengkapi data terlebih dahulu!');return;}
  const obj={type:currentType,amount,date,description,cat_id,note,user_id:currentUser.id};
  if(currentType==='investasi'){
    obj.ticker=document.getElementById('fTicker').value.trim().toUpperCase();
    obj.buy_price=parseFloat(document.getElementById('fBuyPrice').value)||0;
    obj.cur_price=parseFloat(document.getElementById('fCurPrice').value)||0;
    obj.units=parseFloat(document.getElementById('fUnits').value)||1;
    // Obligasi
    const selected=categories.find(c=>c.id==cat_id);
    if(selected&&selected.name.toLowerCase().includes('obligasi')){
      obj.kupon_rate=parseFloat(document.getElementById('fKuponRate').value)||0;
      obj.tgl_beli=document.getElementById('fTglBeli').value||null;
      obj.tgl_jatuh_tempo=document.getElementById('fTglJatuhTempo').value||null;
      // Hitung cur_price otomatis dari gain obligasi
      const nominal=amount;
      const rate=obj.kupon_rate;
      const tglBeli=new Date(obj.tgl_beli);
      const tglJatuh=new Date(obj.tgl_jatuh_tempo);
      const totalBulan=Math.max(0,Math.round((tglJatuh-tglBeli)/(1000*60*60*24*30)));
      const kuponPerBulan=(nominal*rate/100)/12;
      const totalKuponBersih=kuponPerBulan*totalBulan*0.9;
      obj.cur_price=nominal+totalKuponBersih;
      obj.units=1;
    }
  }
  if(editId){
    await sb.from('transactions').update(obj).eq('id',editId);
  } else {
    await sb.from('transactions').insert(obj);
  }
  closeModal();
  await loadTransactions();
  renderDashboard();renderTables();renderInvest();renderLaporan();
}

async function deleteTransaction(id){
  if(!confirm('Hapus transaksi ini?'))return;
  await sb.from('transactions').delete().eq('id',id);
  await loadTransactions();
  renderDashboard();renderTables();renderInvest();renderLaporan();
}

// ========== DASHBOARD ==========
function renderDashboard(){
  const filtered=filterByPeriod(transactions);
  const ins=filtered.filter(t=>t.type==='pemasukan');
  const outs=filtered.filter(t=>t.type==='pengeluaran');
  const invs=filtered.filter(t=>t.type==='investasi');
  const sumIn=ins.reduce((a,t)=>a+Number(t.amount),0);
  const sumOut=outs.reduce((a,t)=>a+Number(t.amount),0);
  const sumInv=invs.reduce((a,t)=>a+Number(t.amount),0);
  const bal=sumIn-sumOut;
  const now=new Date();
  const periodSub=activePeriod==='today'?now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):activePeriod==='month'?now.toLocaleDateString('id-ID',{month:'long',year:'numeric'}):activePeriod==='year'?now.getFullYear().toString():'Semua Waktu';

  document.getElementById('dashCards').innerHTML=`
    <div class="card card-grad grad-pink">
      <div class="card-label"><i class="ti ti-arrow-down-circle"></i>Total Pemasukan</div>
      <div class="card-value">${fmt(sumIn)}</div>
      <div class="card-sub">${periodSub} &nbsp;·&nbsp; ${ins.length} transaksi</div>
    </div>
    <div class="card card-grad grad-orange">
      <div class="card-label"><i class="ti ti-arrow-up-circle"></i>Total Pengeluaran</div>
      <div class="card-value">${fmt(sumOut)}</div>
      <div class="card-sub">${periodSub} &nbsp;·&nbsp; ${outs.length} transaksi</div>
    </div>
    <div class="card card-grad grad-blue">
      <div class="card-label"><i class="ti ti-building-bank"></i>Total Investasi</div>
      <div class="card-value">${fmt(sumInv)}</div>
      <div class="card-sub">${periodSub} &nbsp;·&nbsp; ${invs.length} aset</div>
    </div>
    <div class="card card-grad ${bal>=0?'grad-teal':'grad-rose'}">
      <div class="card-label"><i class="ti ti-wallet"></i>Saldo Bersih</div>
      <div class="card-value">${fmt(bal)}</div>
      <div class="card-sub">${bal>=0?'Keuangan sehat ✓':'Pengeluaran > Pemasukan'}</div>
    </div>
  `;

  const recent=filtered.slice(0,5);
  const tb=document.getElementById('recentTbl');
  if(!recent.length){tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada transaksi</div></td></tr>';}
  else tb.innerHTML=recent.map(t=>{
    const c=getCat(t.cat_id);
    const badgeCls=t.type==='pemasukan'?'badge-green':t.type==='pengeluaran'?'badge-red':'badge-blue';
    const amtCls=t.type==='pemasukan'?'amt-in':t.type==='pengeluaran'?'amt-out':'amt-inv';
    const sign=t.type==='pemasukan'?'+':t.type==='pengeluaran'?'-':'';
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${c?.name||'-'}</span></div></td><td>${t.description}</td><td style="color:var(--muted)">${t.date}</td><td><span class="badge ${badgeCls}">${t.type}</span></td><td class="${amtCls}" style="text-align:right">${sign}${fmt(t.amount)}</td></tr>`;
  }).join('');
  buildLineChart();
  buildDoughnut(sumIn,sumOut,sumInv);
}

function buildLineChart(){
  const months={};
  transactions.forEach(t=>{
    const m=t.date.slice(0,7);
    if(!months[m])months[m]={in:0,out:0,inv:0};
    months[m][t.type==='pemasukan'?'in':t.type==='pengeluaran'?'out':'inv']+=Number(t.amount);
  });
  const labels=Object.keys(months).sort().slice(-6);
  if(lineChart)lineChart.destroy();
  lineChart=new Chart(document.getElementById('chartLine'),{
    type:'line',
    data:{labels,datasets:[
      {label:'Pemasukan',data:labels.map(m=>(months[m]?.in||0)/1e6),borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,.08)',tension:.4,pointStyle:'circle'},
      {label:'Pengeluaran',data:labels.map(m=>(months[m]?.out||0)/1e6),borderColor:'#dc2626',backgroundColor:'rgba(220,38,38,.08)',tension:.4,pointStyle:'triangle'},
      {label:'Investasi',data:labels.map(m=>(months[m]?.inv||0)/1e6),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.08)',tension:.4,pointStyle:'rect'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>v+'jt'}}}}
  });
}
function buildDoughnut(sumIn,sumOut,sumInv){
  if(doughnutChart)doughnutChart.destroy();
  doughnutChart=new Chart(document.getElementById('chartDoughnut'),{
    type:'doughnut',
    data:{labels:['Pemasukan','Pengeluaran','Investasi'],datasets:[{data:[sumIn,sumOut,sumInv],backgroundColor:['#16a34a','#dc2626','#6366f1'],borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
  });
}

// ========== TRANSAKSI ==========
function renderTables(){
  const type=document.getElementById('filterType')?.value||'';
  const month=document.getElementById('filterMonth')?.value||'';
  const search=(document.getElementById('filterSearch')?.value||'').toLowerCase();
  let data=transactions.filter(t=>{
    if(type&&t.type!==type)return false;
    if(month&&!t.date.startsWith(month))return false;
    if(search){const c=getCat(t.cat_id);if(!t.description.toLowerCase().includes(search)&&!(c&&c.name.toLowerCase().includes(search)))return false;}
    return true;
  });
  const tb=document.getElementById('fullTbl');
  if(!data.length){tb.innerHTML='<tr><td colspan="7"><div class="empty"><i class="ti ti-inbox"></i>Tidak ada data</div></td></tr>';return;}
  tb.innerHTML=data.map(t=>{
    const c=getCat(t.cat_id);
    const badgeCls=t.type==='pemasukan'?'badge-green':t.type==='pengeluaran'?'badge-red':'badge-blue';
    const amtCls=t.type==='pemasukan'?'amt-in':t.type==='pengeluaran'?'amt-out':'amt-inv';
    const sign=t.type==='pemasukan'?'+':t.type==='pengeluaran'?'-':'';
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${c?.name||'-'}</span></div></td><td>${t.description}${t.ticker?` <span class="badge badge-blue">${t.ticker}</span>`:''}</td><td style="color:var(--muted)">${t.date}</td><td><span class="badge ${badgeCls}">${t.type}</span></td><td style="color:var(--muted);font-size:12px">${t.note||'-'}</td><td class="${amtCls}" style="text-align:right">${sign}${fmt(t.amount)}</td><td><button class="btn btn-ghost btn-sm" onclick="openModal(${t.id})"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})" style="color:var(--red)"><i class="ti ti-trash"></i></button></td></tr>`;
  }).join('');
}

// ========== INVESTASI ==========
function renderInvest(){
  const invs=transactions.filter(t=>t.type==='investasi');
  const totalModal=invs.reduce((a,t)=>a+Number(t.amount),0);
  const totalKini=invs.reduce((a,t)=>a+(t.cur_price&&t.units?t.cur_price*t.units:Number(t.amount)),0);
  const gain=totalKini-totalModal;
  const ret=totalModal?((gain/totalModal)*100).toFixed(2):0;
  document.getElementById('invModal').textContent=fmt(totalModal);
  document.getElementById('invGain').textContent=(gain>=0?'+':'')+fmt(gain);
  document.getElementById('invReturn').textContent=(ret>=0?'+':'')+ret+'%';
  const tb=document.getElementById('invTbl');
  if(!invs.length){tb.innerHTML='<tr><td colspan="6"><div class="empty"><i class="ti ti-inbox"></i>Belum ada investasi</div></td></tr>';return;}
  tb.innerHTML=invs.map(t=>{
    const c=getCat(t.cat_id);
    const kini=t.cur_price&&t.units?t.cur_price*t.units:Number(t.amount);
    const g=kini-Number(t.amount);
    const gPct=t.amount?((g/Number(t.amount))*100).toFixed(1):0;
    return`<tr>
      <td><div class="cat-row">${catIcon(c)}<span>${t.description}</span></div></td>
      <td>${t.ticker?`<span class="badge badge-blue">${t.ticker}</span>`:'-'}</td>
      <td><span class="badge badge-blue">${c?.name||'-'}</span></td>
      <td>${fmt(t.amount)}</td>
      <td>${fmt(kini)}</td>
      <td style="text-align:right"><span class="${g>=0?'gain-pos':'gain-neg'}">${g>=0?'+':''}${fmt(g)}<br><small>${gPct}%</small></span></td>
    </tr>`;
  }).join('');
  const catMap={};
  invs.forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';catMap[nm]=(catMap[nm]||0)+Number(t.amount);});
  const lbls=Object.keys(catMap);
  if(invChart)invChart.destroy();
  invChart=new Chart(document.getElementById('chartInv'),{
    type:'doughnut',
    data:{labels:lbls,datasets:[{data:lbls.map(k=>catMap[k]),backgroundColor:['#2563eb','#7c3aed','#d97706','#16a34a','#dc2626','#0891b2'],borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
  });
}

// ========== LAPORAN ==========
function renderLaporan(){
  const outMap={};
  transactions.filter(t=>t.type==='pengeluaran').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';outMap[nm]=(outMap[nm]||0)+Number(t.amount);});
  const outLbls=Object.keys(outMap);
  if(catChart)catChart.destroy();
  catChart=new Chart(document.getElementById('chartCat'),{
    type:'bar',data:{labels:outLbls,datasets:[{label:'Pengeluaran',data:outLbls.map(k=>outMap[k]/1e6),backgroundColor:'#dc2626',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45}}}}
  });
  const inMap={};
  transactions.filter(t=>t.type==='pemasukan').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';inMap[nm]=(inMap[nm]||0)+Number(t.amount);});
  const inLbls=Object.keys(inMap);
  if(inCatChart)inCatChart.destroy();
  inCatChart=new Chart(document.getElementById('chartInCat'),{
    type:'bar',data:{labels:inLbls,datasets:[{label:'Pemasukan',data:inLbls.map(k=>inMap[k]/1e6),backgroundColor:'#16a34a',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45}}}}
  });
  const months={};
  transactions.forEach(t=>{const m=t.date.slice(0,7);if(!months[m])months[m]={in:0,out:0,inv:0};months[m][t.type==='pemasukan'?'in':t.type==='pengeluaran'?'out':'inv']+=Number(t.amount);});
  const sorted=Object.keys(months).sort().reverse();
  const tb=document.getElementById('monthlyTbl');
  if(!sorted.length){tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>';return;}
  tb.innerHTML=sorted.map(m=>{
    const d=months[m];const bal=d.in-d.out;
    return`<tr><td style="font-weight:500">${m}</td><td class="amt-in" style="text-align:right">+${fmt(d.in)}</td><td class="amt-out" style="text-align:right">-${fmt(d.out)}</td><td class="amt-inv" style="text-align:right">${fmt(d.inv)}</td><td style="text-align:right;font-weight:600;color:${bal>=0?'#16a34a':'#dc2626'}">${bal>=0?'+':''}${fmt(bal)}</td></tr>`;
  }).join('');
}

// ========== KATEGORI ==========
function renderCategories(){
  ['pemasukan','pengeluaran','investasi'].forEach(type=>{
    const id=type==='pemasukan'?'catIn':type==='pengeluaran'?'catOut':'catInv';
    const el=document.getElementById(id);
    const cats=categories.filter(c=>c.type===type);
    el.innerHTML=cats.map(c=>`<div class="cat-card">${catIcon(c)}<div class="cat-card-info" style="flex:1"><div class="cat-name">${c.name}</div><div class="cat-type">${c.type}</div></div><button class="btn btn-ghost btn-sm" onclick="deleteCategory(${c.id})" style="color:var(--red)"><i class="ti ti-trash"></i></button></div>`).join('');
    if(!cats.length)el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px">Belum ada kategori</div>';
  });
}
function openCatModal(){document.getElementById('catModalBg').classList.add('open')}
function closeCatModal(){document.getElementById('catModalBg').classList.remove('open')}
async function saveCategory(){
  const type=document.getElementById('cType').value;
  const name=document.getElementById('cName').value.trim();
  const icon=document.getElementById('cIcon').value.trim()||'tag';
  const color=document.getElementById('cColor').value;
  if(!name){alert('Nama kategori wajib diisi!');return;}
  await sb.from('categories').insert({type,name,icon,color,user_id:currentUser.id});
  await loadCategories();
  closeCatModal();renderCategories();
  document.getElementById('cName').value='';document.getElementById('cIcon').value='';
}
async function deleteCategory(id){
  if(!confirm('Hapus kategori ini?'))return;
  await sb.from('categories').delete().eq('id',id);
  await loadCategories();renderCategories();
}

// ========== INIT ==========
sb.auth.getSession().then(({data:{session}})=>{
  if(session){currentUser=session.user;showApp();}
});
