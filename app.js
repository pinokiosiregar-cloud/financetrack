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
  msg.textContent='Registrasi berhasil! Cek email untuk konfirmasi, lalu login.';
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
  document.getElementById('userEmail').textContent=currentUser.email;
  document.getElementById('currentDate').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('fDate').value=today();
  await loadCategories();
  await loadTransactions();
  renderDashboard();
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
    {type:'pemasukan',name:'Dividen',icon:'chart-line',color:'purple'},
    {type:'pemasukan',name:'Sewa',icon:'home',color:'green'},
    {type:'pemasukan',name:'Bisnis',icon:'building-store',color:'blue'},
    {type:'pengeluaran',name:'Makan & Minum',icon:'bowl-spoon',color:'amber'},
    {type:'pengeluaran',name:'Transport',icon:'car',color:'blue'},
    {type:'pengeluaran',name:'Tagihan',icon:'file-invoice',color:'red'},
    {type:'pengeluaran',name:'Belanja',icon:'shopping-cart',color:'purple'},
    {type:'pengeluaran',name:'Kesehatan',icon:'heart-rate-monitor',color:'red'},
    {type:'pengeluaran',name:'Hiburan',icon:'device-gamepad-2',color:'purple'},
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
  const titles={dashboard:'Dashboard',transaksi:'Transaksi',investasi:'Investasi',laporan:'Laporan & Analisis',kategori:'Manajemen Kategori'};
  document.getElementById('pageTitle').textContent=titles[name]||name;
  if(name==='dashboard')renderDashboard();
  if(name==='transaksi')renderTables();
  if(name==='investasi')renderInvest();
  if(name==='laporan')renderLaporan();
  if(name==='kategori')renderCategories();
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
      document.getElementById('fBuyPrice').value=t.buy_price||0;
      document.getElementById('fCurPrice').value=t.cur_price||0;
      document.getElementById('fUnits').value=t.units||1;
    }
    document.getElementById('modalTitleText').textContent='Edit Transaksi';
  } else {
    setType('pemasukan');
    ['fAmount','fDesc','fNote','fBuyPrice','fCurPrice','fUnits'].forEach(id=>document.getElementById(id).value='');
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
  const sel=document.getElementById('fCat');
  sel.innerHTML='';
  categories.filter(c=>c.type===t).forEach(c=>{
    const o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o);
  });
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
    obj.buy_price=parseFloat(document.getElementById('fBuyPrice').value)||0;
    obj.cur_price=parseFloat(document.getElementById('fCurPrice').value)||0;
    obj.units=parseFloat(document.getElementById('fUnits').value)||1;
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
  const ins=transactions.filter(t=>t.type==='pemasukan');
  const outs=transactions.filter(t=>t.type==='pengeluaran');
  const invs=transactions.filter(t=>t.type==='investasi');
  const sumIn=ins.reduce((a,t)=>a+Number(t.amount),0);
  const sumOut=outs.reduce((a,t)=>a+Number(t.amount),0);
  const sumInv=invs.reduce((a,t)=>a+Number(t.amount),0);
  const bal=sumIn-sumOut;
  document.getElementById('totalIn').textContent=fmt(sumIn);
  document.getElementById('totalOut').textContent=fmt(sumOut);
  document.getElementById('totalInv').textContent=fmt(sumInv);
  document.getElementById('totalBal').textContent=fmt(bal);
  document.getElementById('countIn').textContent=ins.length+' transaksi';
  document.getElementById('countOut').textContent=outs.length+' transaksi';
  document.getElementById('countInv').textContent=invs.length+' aset';
  document.getElementById('balStatus').textContent=bal>=0?'Keuangan sehat ✓':'Pengeluaran melebihi pemasukan';
  document.getElementById('balStatus').style.color=bal>=0?'#16a34a':'#dc2626';
  const recent=transactions.slice(0,5);
  const tb=document.getElementById('recentTbl');
  if(!recent.length){tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada transaksi</div></td></tr>';return;}
  tb.innerHTML=recent.map(t=>{
    const c=getCat(t.cat_id);
    const badgeCls=t.type==='pemasukan'?'badge-green':t.type==='pengeluaran'?'badge-red':'badge-blue';
    const amtCls=t.type==='pemasukan'?'amt-in':t.type==='pengeluaran'?'amt-out':'amt-inv';
    const sign=t.type==='pemasukan'?'+':t.type==='pengeluaran'?'-':'';
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${c?.name||'-'}</span></div></td><td>${t.description}</td><td style="color:var(--muted)">${t.date}</td><td><span class="badge ${badgeCls}">${t.type}</span></td><td class="${amtCls}" style="text-align:right">${sign}${fmt(t.amount)}</td></tr>`;
  }).join('');
  buildLineChart();buildDoughnut(sumIn,sumOut,sumInv);
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
      {label:'Investasi',data:labels.map(m=>(months[m]?.inv||0)/1e6),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',tension:.4,pointStyle:'rect'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>v+'jt'}}}}
  });
}
function buildDoughnut(sumIn,sumOut,sumInv){
  if(doughnutChart)doughnutChart.destroy();
  doughnutChart=new Chart(document.getElementById('chartDoughnut'),{
    type:'doughnut',
    data:{labels:['Pemasukan','Pengeluaran','Investasi'],datasets:[{data:[sumIn,sumOut,sumInv],backgroundColor:['#16a34a','#dc2626','#2563eb'],borderWidth:2}]},
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
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${c?.name||'-'}</span></div></td><td>${t.description}</td><td style="color:var(--muted)">${t.date}</td><td><span class="badge ${badgeCls}">${t.type}</span></td><td style="color:var(--muted);font-size:12px">${t.note||'-'}</td><td class="${amtCls}" style="text-align:right">${sign}${fmt(t.amount)}</td><td><button class="btn btn-ghost btn-sm" onclick="openModal(${t.id})"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})" style="color:var(--red)"><i class="ti ti-trash"></i></button></td></tr>`;
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
  document.getElementById('invGain').style.color=gain>=0?'#16a34a':'#dc2626';
  document.getElementById('invReturn').textContent=(ret>=0?'+':'')+ret+'%';
  document.getElementById('invReturn').style.color=ret>=0?'#16a34a':'#dc2626';
  const tb=document.getElementById('invTbl');
  if(!invs.length){tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada investasi</div></td></tr>';return;}
  tb.innerHTML=invs.map(t=>{
    const c=getCat(t.cat_id);
    const kini=t.cur_price&&t.units?t.cur_price*t.units:Number(t.amount);
    const g=kini-Number(t.amount);
    const gPct=t.amount?((g/Number(t.amount))*100).toFixed(1):0;
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${t.description}</span></div></td><td><span class="badge badge-blue">${c?.name||'-'}</span></td><td>${fmt(t.amount)}</td><td>${fmt(kini)}</td><td style="text-align:right"><span class="${g>=0?'gain-pos':'gain-neg'}">${g>=0?'+':''}${fmt(g)}<br><small>${gPct}%</small></span></td></tr>`;
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
