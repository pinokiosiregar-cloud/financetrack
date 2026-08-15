// =============================================
// GANTI DENGAN NILAI DARI SUPABASE KAMU
// =============================================
const SUPABASE_URL = 'https://wwtzcbaxymdebwffrrud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dHpjYmF4eW1kZWJ3ZmZycnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjIzODAsImV4cCI6MjA5MzY5ODM4MH0.CBS6QNCc9cBoNbnGLcJtEfGStJFS7uCtJsFosLsyF3k';
// =============================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== STATE ==========
const COLORS={},LIGHT={},THEME={};
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function loadTheme(){
  ['green','blue','red','purple','amber'].forEach(k=>{
    COLORS[k]=cssVar('--'+k); LIGHT[k]=cssVar('--'+k+'-soft');
  });
  THEME.brand=cssVar('--brand');
  THEME.text2=cssVar('--text-2');
  THEME.text3=cssVar('--text-3');
  THEME.border=cssVar('--border');
  THEME.surface=cssVar('--surface');
}
loadTheme();
let categories=[],transactions=[],currentType='pemasukan',editId=null,currentUser=null;
let activePeriod='month',activeInvFilter='semua';
let lineChart=null,doughnutChart=null,catChart=null,inCatChart=null,invChart=null;
let selectedCoin=null,livePrices={};
let isLoading=false;

// ========== UTILS: HTML ESCAPING & SAFE RENDERING ==========
// Escape HTML untuk mencegah XSS
const escapeHtml=s=>{const m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};return(s||'').replace(/[&<>"']/g,c=>m[c])};

// Safe text content tanpa HTML interpretation
const safeTxt=(el,txt)=>{if(el)el.textContent=txt};
const safeHtml=(el,html)=>{if(el)el.innerHTML=html};

// Loading state helpers
function setLoading(show){
  isLoading=show;
  const btn=document.querySelector('.modal-actions .btn-primary');
  const catBtn=document.getElementById('saveCatBtn');
  if(btn){btn.disabled=show;btn.innerHTML=show?'<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Menyimpan...':'<i class="ti ti-check"></i>Simpan';}
  if(catBtn){catBtn.disabled=show;catBtn.innerHTML=show?'<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Menyimpan...':'<i class="ti ti-check"></i>Simpan';}
}

function showMsg(el,msg,success=false){
  if(!el)return;
  el.textContent=msg;
  el.style.display='block';
  el.style.color=success?'var(--green-ink)':'var(--red-ink)';
}

// ========== UTILS ==========
const fmt=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
function fmtShort(n){
  const a=Math.abs(n);
  if(a>=1e9)return(n/1e9).toFixed(1).replace('.',',')+'m';
  if(a>=1e6)return(n/1e6).toFixed(1).replace('.',',')+'jt';
  if(a>=1e3)return Math.round(n/1e3)+'rb';
  return String(Math.round(n));
}
const isoLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>isoLocal(new Date());
const getCat=id=>categories.find(c=>c.id==id);
function catColor(c){return COLORS[c?.color]||'var(--text-3)'}
function catBg(c){return LIGHT[c?.color]||'var(--border)'}
function catIcon(c){
  if(!c)return'<div class="cat-icon" style="background:var(--border)"><i class="ti ti-tag"></i></div>';
  return`<div class="cat-icon" style="background:${catBg(c)};color:${catColor(c)}"><i class="ti ti-${c.icon}"></i></div>`;
}
function getCatType(catId){
  const c=getCat(catId);if(!c)return'other';
  const n=c.name.toLowerCase();
  if(n.includes('saham'))return'saham';
  if(n.includes('kripto')||n.includes('crypto'))return'crypto';
  if(n.includes('emas'))return'emas';
  if(n.includes('obligasi'))return'obligasi';
  return'other';
}

// ========== AUTH ==========
async function handleLogin(){
  const email=document.getElementById('authEmail').value.trim();
  const pass=document.getElementById('authPassword').value;
  const msg=document.getElementById('authMsg');
  msg.style.display='none';
  try{
    const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){showMsg(msg,error.message);return;}
    currentUser=data.user;showApp();
  }catch(e){
    showMsg(msg,'Terjadi kesalahan: '+e.message);
  }
}
async function handleRegister(){
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPassword').value;
  const msg=document.getElementById('regMsg');
  msg.style.display='none';
  try{
    const{data,error}=await sb.auth.signUp({email,password:pass});
    if(error){showMsg(msg,error.message);return;}
    showMsg(msg,'Registrasi berhasil! Silakan login.',true);
  }catch(e){
    showMsg(msg,'Terjadi kesalahan: '+e.message);
  }
}
async function handleLogout(){
  try{
    await sb.auth.signOut();
    document.getElementById('appPage').style.display='none';
    document.getElementById('loginPage').style.display='flex';
    currentUser=null;categories=[];transactions=[];
  }catch(e){
    console.error('Logout error:',e);
  }
}
function showRegister(){document.getElementById('loginForm').style.display='none';document.getElementById('registerForm').style.display='block';}
function showLogin(){document.getElementById('registerForm').style.display='none';document.getElementById('loginForm').style.display='block';}

async function showApp(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('appPage').style.display='flex';
  const email=currentUser.email;
  safeTxt(document.getElementById('userEmail'),email);
  safeTxt(document.getElementById('userAvatar'),email[0].toUpperCase());
  safeTxt(document.getElementById('userName'),email.split('@')[0]);
  safeTxt(document.getElementById('currentDate'),new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  document.getElementById('fDate').value=today();
  await loadCategories();
  await loadTransactions();
  loadTheme();
  setPeriod(activePeriod);
  ['fBuyPrice','fCurPrice','fUnits'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('input',updateGainPreview);
  });
  setupKeyboardShortcuts();
}

// ========== KEYBOARD SHORTCUTS ==========
function setupKeyboardShortcuts(){
  document.addEventListener('keydown',e=>{
    // Escape untuk close modal
    if(e.key==='Escape'){
      if(document.getElementById('modalBg').classList.contains('open')){closeModal();}
      if(document.getElementById('catModalBg').classList.contains('open')){closeCatModal();}
      if(document.getElementById('analysisModalBg').classList.contains('open')){document.getElementById('analysisModalBg').classList.remove('open');}
    }
  });
  
  // Enter untuk submit form di modal
  const modal=document.getElementById('modalBg');
  if(modal){
    modal.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!isLoading){
        const saveBtn=document.querySelector('#modalBg .btn-primary');
        if(saveBtn&&e.target.tagName!=='TEXTAREA')saveBtn.click();
      }
    });
  }
  
  const catModal=document.getElementById('catModalBg');
  if(catModal){
    catModal.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!isLoading){
        const saveBtn=document.getElementById('saveCatBtn');
        if(saveBtn)saveBtn.click();
      }
    });
  }
}

// ========== LOAD DATA ==========
async function loadCategories(){
  try{
    const{data,error}=await sb.from('categories').select('*').eq('user_id',currentUser.id).order('name');
    if(error)throw error;
    if(data&&data.length>0){categories=data;}else{await seedCategories();}
  }catch(e){
    console.error('Load categories error:',e);
  }
}
async function seedCategories(){
  try{
    const defaults=[
      {type:'pemasukan',name:'Gaji',icon:'briefcase',color:'green'},
      {type:'pemasukan',name:'Freelance',icon:'laptop',color:'blue'},
      {type:'pemasukan',name:'Bonus',icon:'gift',color:'amber'},
      {type:'pemasukan',name:'Honor',icon:'award',color:'purple'},
      {type:'pemasukan',name:'THR',icon:'gift',color:'amber'},
      {type:'pemasukan',name:'Tunjangan',icon:'coin',color:'green'},
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
    const{data,error}=await sb.from('categories').insert(rows).select();
    if(error)throw error;
    if(data)categories=data;
  }catch(e){
    console.error('Seed categories error:',e);
  }
}
async function loadTransactions(){
  try{
    const{data,error}=await sb.from('transactions').select('*').eq('user_id',currentUser.id).order('date',{ascending:false});
    if(error)throw error;
    transactions=data||[];
  }catch(e){
    console.error('Load transactions error:',e);
  }
}

// ========== LIVE PRICES ==========
async function fetchCryptoPrice(coinId){
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=idr`);
    if(!r.ok)return 0;
    const d=await r.json();
    return d[coinId]?.idr||0;
  }catch(e){
    console.error('Fetch crypto price error:',e);
    return 0;
  }
}
async function fetchGoldPrice(){
  try{
    const r=await fetch('https://api.metals.live/v1/spot/gold');
    if(!r.ok)return 0;
    const d=await r.json();
    return(d.price||0)*1.03*24e6;
  }catch(e){
    console.error('Fetch gold price error:',e);
    return 0;
  }
}
async function searchCoin(){
  const q=document.getElementById('fCoinSearch').value.toLowerCase().trim();
  const dd=document.getElementById('coinDropdown');
  if(!q){dd.innerHTML='';return;}
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
    if(!r.ok){dd.innerHTML='<div style="padding:8px;color:var(--red)">Gagal memuat</div>';return;}
    const d=await r.json();
    const coins=(d.coins||[]).slice(0,5);
    dd.innerHTML=coins.map(c=>`<div class="coin-item" onclick="selectCoin({id:'${escapeHtml(c.id)}',name:'${escapeHtml(c.name)}',symbol:'${escapeHtml(c.symbol)}',image:'${escapeHtml(c.large||'')}'})" style="cursor:pointer;padding:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"><img src="${escapeHtml(c.large||'')}" style="width:24px;height:24px;border-radius:50%"><span>${escapeHtml(c.name)} (${escapeHtml(c.symbol).toUpperCase()})</span></div>`).join('');
  }catch(e){
    console.error('Search coin error:',e);
    dd.innerHTML='<div style="padding:8px;color:var(--red)">Terjadi kesalahan</div>';
  }
}
async function selectCoin(coin){
  selectedCoin=coin;
  const sel=document.getElementById('fCoinSelected');
  sel.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--border);border-radius:4px"><img src="${escapeHtml(coin.image)}" style="width:32px;height:32px;border-radius:50%"><div><b>${escapeHtml(coin.name)}</b><br><small>${escapeHtml(coin.symbol).toUpperCase()}</small></div></div>`;
  document.getElementById('coinDropdown').innerHTML='';
  document.getElementById('fCoinSearch').value='';
  const price=await fetchCryptoPrice(coin.id);
  livePrices[coin.id]=price;
  updateCryptoPreview();
}

// ========== MODAL TRANSAKSI ==========
function openModal(id){
  editId=id||null;
  const modal=document.getElementById('modalBg');
  ['sahamExtra','cryptoExtra','emasExtra','obligasiExtra','investExtra'].forEach(e=>{document.getElementById(e).style.display='none'});
  if(id){
    const t=transactions.find(x=>x.id===id);
    if(t){
      document.getElementById('fDate').value=t.date;
      document.getElementById('fType').value=t.type;
      document.getElementById('fCat').value=t.cat_id;
      document.getElementById('fDesc').value=t.description;
      document.getElementById('fAmount').value=t.amount;
      document.getElementById('fNote').value=t.note||'';
      onTypeChange();
    }
  }else{
    document.getElementById('fDate').value=today();
    document.getElementById('fType').value='pemasukan';
    document.getElementById('fDesc').value='';
    document.getElementById('fAmount').value='';
    document.getElementById('fNote').value='';
    onTypeChange();
  }
  setLoading(false);
  const msg=document.getElementById('transMsg');
  if(msg){msg.style.display='none';}
  modal.classList.add('open');
}
function closeModal(){
  document.getElementById('modalBg').classList.remove('open');
  editId=null;
}
async function saveTransaction(){
  if(isLoading)return;
  const date=document.getElementById('fDate').value;
  const type=document.getElementById('fType').value;
  const catId=document.getElementById('fCat').value;
  const desc=document.getElementById('fDesc').value.trim();
  const amount=document.getElementById('fAmount').value;
  const note=document.getElementById('fNote').value.trim();
  const msg=document.getElementById('transMsg');
  
  if(!date||!type||!catId||!desc||!amount){
    showMsg(msg,'Harap lengkapi semua bidang wajib');
    return;
  }
  
  setLoading(true);
  try{
    const payload={date,type,cat_id:parseInt(catId),description:desc,amount:parseFloat(amount),note:note,user_id:currentUser.id};
    if(editId){
      const{error}=await sb.from('transactions').update(payload).eq('id',editId);
      if(error)throw error;
    }else{
      const{error}=await sb.from('transactions').insert([payload]);
      if(error)throw error;
    }
    await loadTransactions();
    closeModal();
    renderDashboard();
    renderTables();
    showMsg(msg,'Transaksi tersimpan',true);
  }catch(e){
    console.error('Save transaction error:',e);
    showMsg(msg,'Gagal simpan: '+e.message);
  }finally{
    setLoading(false);
  }
}
async function deleteTransaction(id){
  if(!confirm('Hapus transaksi ini?'))return;
  try{
    const{error}=await sb.from('transactions').delete().eq('id',id);
    if(error)throw error;
    await loadTransactions();
    renderDashboard();
    renderTables();
  }catch(e){
    console.error('Delete transaction error:',e);
    alert('Gagal hapus: '+e.message);
  }
}

// ========== UI CONTROL ==========
function showPage(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
  const titles={'dashboard':'Dashboard','transaksi':'Data transaksi','investasi':'Investasi','laporan':'Laporan','kategori':'Data kategori'};
  safeTxt(document.getElementById('pageTitle'),titles[page]||'Dashboard');
  if(page==='dashboard')renderDashboard();
  else if(page==='transaksi')renderTables();
  else if(page==='investasi')renderInvestasi();
  else if(page==='laporan')renderLaporan();
  else if(page==='kategori')renderCategories();
}
function onTypeChange(){
  const t=document.getElementById('fType').value;
  ['sahamExtra','cryptoExtra','emasExtra','obligasiExtra','investExtra'].forEach(id=>{
    document.getElementById(id).style.display='none';
  });
  const sel=document.getElementById('fCat');
  sel.innerHTML='';
  categories.filter(c=>c.type===t).forEach(c=>{
    const o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o);
  });
  if(t==='investasi')onCatChange();
}

// ========== PREVIEWS ==========
function updateSahamPreview(){
  const lot=parseFloat(document.getElementById('fLot').value)||0;
  const avg=parseFloat(document.getElementById('fAvgPrice').value)||0;
  const cur=parseFloat(document.getElementById('fCurPriceSaham').value)||0;
  const kode=escapeHtml(document.getElementById('fKodeSaham').value||'-');
  const preview=document.getElementById('sahamPreview');
  if(!lot||!avg){preview.style.display='none';return;}
  const invested=avg*lot*100;
  const marketVal=cur?cur*lot*100:invested;
  const pl=marketVal-invested;
  const plPct=invested?((pl/invested)*100).toFixed(2):0;
  document.getElementById('fAmount').value=Math.round(invested);
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Kode Saham</span><b>${kode}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Balance Lot</span><b>${lot} lot</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Average Price</span><b>${fmt(avg)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Current Price</span><b>${cur?fmt(cur):'-'}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Invested</span><b>${fmt(invested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Market Value</span><b>${fmt(marketVal)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'var(--green-ink)':'var(--red-ink)'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
  `;
}
async function updateCryptoPreview(){
  const qty=parseFloat(document.getElementById('fCoinQty').value)||0;
  const buyPrice=parseFloat(document.getElementById('fCoinBuyPrice').value)||0;
  const preview=document.getElementById('cryptoPreview');
  if(!qty||!buyPrice||!selectedCoin){preview.style.display='none';return;}
  const curPrice=livePrices[selectedCoin.id]||0;
  const invested=buyPrice*qty;
  const marketVal=curPrice?curPrice*qty:invested;
  const pl=marketVal-invested;
  const plPct=invested?((pl/invested)*100).toFixed(2):0;
  document.getElementById('fAmount').value=Math.round(invested);
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Koin</span><b>${escapeHtml(selectedCoin.symbol.toUpperCase())} — ${escapeHtml(selectedCoin.name)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Jumlah</span><b>${qty}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Beli</span><b>${fmt(buyPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Kini</span><b>${curPrice?fmt(curPrice):'Memuat...'}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Invested</span><b>${fmt(invested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Market Value</span><b>${fmt(marketVal)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'var(--green-ink)':'var(--red-ink)'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
  `;
}
async function updateEmasPreview(){
  const gram=parseFloat(document.getElementById('fGoldGram').value)||0;
  const buyPrice=parseFloat(document.getElementById('fGoldBuyPrice').value)||0;
  const preview=document.getElementById('emasPreview');
  if(!gram||!buyPrice){preview.style.display='none';return;}
  const curPrice=livePrices['gold']||0;
  const invested=buyPrice*gram;
  const marketVal=curPrice?curPrice*gram:invested;
  const pl=marketVal-invested;
  const plPct=invested?((pl/invested)*100).toFixed(2):0;
  document.getElementById('fAmount').value=Math.round(invested);
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Berat</span><b>${gram} gram</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Beli/gram</span><b>${fmt(buyPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Kini/gram</span><b>${curPrice?fmt(curPrice):'Memuat...'}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Invested</span><b>${fmt(invested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Market Value</span><b>${fmt(marketVal)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'var(--green-ink)':'var(--red-ink)'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
  `;
}
async function updateObligasiPreview(){
  const kuponRate=parseFloat(document.getElementById('fKuponRate').value)||0;
  const hargaBeliPct=parseFloat(document.getElementById('fHargaBeliPct').value)||0;
  const jumlahUnit=parseInt(document.getElementById('fJumlahUnit').value)||0;
  const tglBeli=document.getElementById('fTglBeli').value;
  const tglJatuhTempo=document.getElementById('fTglJatuhTempo').value;
  const preview=document.getElementById('obligasiPreview');
  if(!kuponRate||!hargaBeliPct||!jumlahUnit||!tglBeli||!tglJatuhTempo){preview.style.display='none';return;}
  const nomial=1e6;
  const hargaBeli=nomial*hargaBeliPct/100;
  const totalInvested=hargaBeli*jumlahUnit;
  document.getElementById('fAmount').value=Math.round(totalInvested);
  const daysUntilMaturity=Math.max(0,Math.ceil((new Date(tglJatuhTempo)-new Date(tglBeli))/86400000));
  const yearsUntilMaturity=daysUntilMaturity/365;
  const estimatedKupon=nomial*kuponRate/100*yearsUntilMaturity*jumlahUnit;
  const expectedValue=nomial*jumlahUnit+estimatedKupon;
  const pl=expectedValue-totalInvested;
  const plPct=totalInvested?((pl/totalInvested)*100).toFixed(2):0;
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Kupon per tahun</span><b>${kuponRate}%</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga beli</span><b>${hargaBeliPct}% (${fmt(hargaBeli)})</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Jumlah unit</span><b>${jumlahUnit}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total investasi</span><b>${fmt(totalInvested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Est. kupon hingga jatuh tempo</span><b>${fmt(estimatedKupon)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Expected Value</span><b style="color:${pl>=0?'var(--green-ink)':'var(--red-ink)'}">${fmt(expectedValue)} (${plPct}%)</b></div>
  `;
}
async function updateGainPreview(){
  const buyPrice=parseFloat(document.getElementById('fBuyPrice').value)||0;
  const curPrice=parseFloat(document.getElementById('fCurPrice').value)||0;
  const units=parseFloat(document.getElementById('fUnits').value)||0;
  const preview=document.getElementById('gainPreview');
  if(!buyPrice||!units){preview.style.display='none';return;}
  const invested=buyPrice*units;
  const marketVal=(curPrice||buyPrice)*units;
  const pl=marketVal-invested;
  const plPct=invested?((pl/invested)*100).toFixed(2):0;
  document.getElementById('fAmount').value=Math.round(invested);
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga beli</span><b>${fmt(buyPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Jumlah unit</span><b>${units}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Invested</span><b>${fmt(invested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga kini</span><b>${fmt(curPrice||buyPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Market Value</span><b>${fmt(marketVal)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'var(--green-ink)':'var(--red-ink)'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
  `;
}

// ========== DASHBOARD ==========
function renderDashboard(){
  const period=activePeriod;
  let start,end=new Date();
  if(period==='today'){
    start=new Date(end);start.setHours(0,0,0,0);
  }else if(period==='month'){
    start=new Date(end.getFullYear(),end.getMonth(),1);
  }else if(period==='year'){
    start=new Date(end.getFullYear(),0,1);
  }else{
    start=new Date(1970,0,1);
  }
  const sDate=isoLocal(start),eDate=isoLocal(end);
  const filtered=transactions.filter(t=>t.date>=sDate&&t.date<=eDate);
  const income=filtered.filter(t=>t.type==='pemasukan').reduce((a,t)=>a+Number(t.amount),0);
  const expense=filtered.filter(t=>t.type==='pengeluaran').reduce((a,t)=>a+Number(t.amount),0);
  const invest=filtered.filter(t=>t.type==='investasi').reduce((a,t)=>a+Number(t.amount),0);
  const balance=income-expense;
  const cards=[
    {title:'Pemasukan',amount:income,icon:'ti-trending-up',color:'green'},
    {title:'Pengeluaran',amount:expense,icon:'ti-trending-down',color:'red'},
    {title:'Investasi',amount:invest,icon:'ti-chart-candle',color:'blue'},
    {title:'Saldo',amount:balance,icon:'ti-wallet',color:balance>=0?'green':'red'}
  ];
  const grid=document.getElementById('dashCards');
  grid.innerHTML=cards.map(c=>`
    <div class="card-stat" style="border-left:4px solid var(--${c.color})">
      <div class="card-icon" style="color:var(--${c.color})"><i class="ti ${c.icon}"></i></div>
      <div class="card-content">
        <div class="card-label">${c.title}</div>
        <div class="card-value">${fmt(c.amount)}</div>
      </div>
    </div>
  `).join('');
  renderCharts(filtered);
  renderRecent(filtered);
}
function renderRecent(data){
  const recent=data.slice(0,10).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('recentTbl');
  tb.innerHTML=recent.map(t=>{
    const c=getCat(t.cat_id);
    return`<tr>
      <td>${catIcon(c)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td><small>${t.date}</small></td>
      <td><span class="badge badge-${t.type==='pemasukan'?'green':t.type==='pengeluaran'?'red':'blue'}">${t.type}</span></td>
      <td class="ta-r">${t.type==='pengeluaran'?'-':''}${fmt(t.amount)}</td>
    </tr>`;
  }).join('');
  if(!recent.length)tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada transaksi</div></td></tr>';
}
function renderTables(){
  const filterType=document.getElementById('filterType').value;
  const filterMonth=document.getElementById('filterMonth').value;
  const search=document.getElementById('filterSearch').value.toLowerCase();
  let filtered=transactions;
  if(filterType)filtered=filtered.filter(t=>t.type===filterType);
  if(filterMonth)filtered=filtered.filter(t=>t.date.startsWith(filterMonth));
  if(search)filtered=filtered.filter(t=>t.description.toLowerCase().includes(search)||t.note.toLowerCase().includes(search));
  const tb=document.getElementById('fullTbl');
  tb.innerHTML=filtered.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>{
    const c=getCat(t.cat_id);
    return`<tr>
      <td>${catIcon(c)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td><small>${t.date}</small></td>
      <td><span class="badge badge-${t.type==='pemasukan'?'green':t.type==='pengeluaran'?'red':'blue'}">${t.type}</span></td>
      <td>${escapeHtml(t.note||'-')}</td>
      <td class="ta-r">${t.type==='pengeluaran'?'-':''}${fmt(t.amount)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openModal(${t.id})"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
  if(!filtered.length)tb.innerHTML='<tr><td colspan="7"><div class="empty"><i class="ti ti-inbox"></i>Tidak ada transaksi</div></td></tr>';
}

// ========== CHARTS ==========
function chartKosong(id,kosong,msg){
  const el=document.getElementById(id);
  if(!kosong){el.style.display='block';return false;}
  el.style.display='none';
  const cont=el.parentElement;
  if(!cont.querySelector('.empty')){const emptyEl=document.createElement('div');emptyEl.className='empty';emptyEl.innerHTML=`<i class="ti ti-inbox"></i>${msg}`;cont.appendChild(emptyEl);}
  return true;
}
function opsiBatang(horizontal){
  return{
    indexAxis:horizontal?'y':'x',
    responsive:true,maintainAspectRatio:true,
    plugins:{legend:{display:false}},
    scales:{x:{display:false,beginAtZero:true},y:{display:false}}
  };
}
function renderCharts(data){
  const byMonth={};
  data.forEach(t=>{
    const m=t.date.slice(0,7);
    if(!byMonth[m])byMonth[m]={in:0,out:0};
    if(t.type==='pemasukan')byMonth[m].in+=Number(t.amount);
    else if(t.type==='pengeluaran')byMonth[m].out+=Number(t.amount);
  });
  const months=Object.keys(byMonth).sort();
  const inData=months.map(m=>byMonth[m].in);
  const outData=months.map(m=>byMonth[m].out);
  if(lineChart){lineChart.destroy();lineChart=null;}
  if(chartKosong('chartLine',!months.length,'Belum ada data'))return;
  lineChart=new Chart(document.getElementById('chartLine'),{
    type:'line',
    data:{labels:months,datasets:[
      {label:'Pemasukan',data:inData,borderColor:COLORS.green,backgroundColor:LIGHT.green,tension:0.4},
      {label:'Pengeluaran',data:outData,borderColor:COLORS.red,backgroundColor:LIGHT.red,tension:0.4}
    ]},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:true}},scales:{y:{beginAtZero:true}}}
  });
  
  const expCats={};
  data.filter(t=>t.type==='pengeluaran').forEach(t=>{
    const c=getCat(t.cat_id);
    const nm=c?c.name:'Lain';
    expCats[nm]=(expCats[nm]||0)+Number(t.amount);
  });
  const topExp=Object.entries(expCats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
  const topData=topExp.map(nm=>expCats[nm]);
  if(doughnutChart){doughnutChart.destroy();doughnutChart=null;}
  if(chartKosong('chartDoughnut',!topExp.length,'Belum ada pengeluaran'))return;
  doughnutChart=new Chart(document.getElementById('chartDoughnut'),{
    type:'bar',
    data:{labels:topExp,datasets:[{data:topData,backgroundColor:COLORS.red,borderRadius:5,barThickness:24}]},
    options:{
      indexAxis:'y',responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false}},
      scales:{x:{display:true,beginAtZero:true,grid:{display:true,drawBorder:false}},y:{display:true,grid:{display:false,drawBorder:false}}}
    }
  });
}

// ========== INVESTASI ==========
function renderInvestasi(){
  const rows=transactions.filter(t=>t.type==='investasi').map(r=>{
    const c=getCat(r.cat_id);
    const type=getCatType(r.cat_id);
    let gain=0,pct=0;
    r._gain=gain;r._pct=pct;r._modal=r.amount;r._kini=r.amount;
    return r;
  });
  const html=rows.map(r=>{
    const c=getCat(r.cat_id);
    return`<tr>
      <td>${catIcon(c)}</td>
      <td>${escapeHtml(r.description)}</td>
      <td><small>${r.date}</small></td>
      <td><span class="badge badge-blue">${escapeHtml(c?.name||'-')}</span></td>
      <td>${fmt(r._modal)}</td>
      <td>${fmt(r._kini)}</td>
      <td style="text-align:right"><span class="${r._gain>=0?'gain-pos':'gain-neg'}">${r._gain>=0?'+':''}${fmt(r._gain)}<br><small>${r._pct}%</small></span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openModal(${r.id})"><i class="ti ti-edit"></i></button></td>
    </tr>`;
  }).join('');
  document.getElementById('investTbl').innerHTML=html||'<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i>Belum ada aset</div></td></tr>';
  
  const catMap={};
  rows.forEach(r=>{const c=getCat(r.cat_id);const nm=c?c.name:'Lain';catMap[nm]=(catMap[nm]||0)+r._modal;});
  const lbls=Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]);
  if(invChart){invChart.destroy();invChart=null;}
  if(chartKosong('chartInv',!lbls.length,'Belum ada aset untuk ditampilkan'))return;
  invChart=new Chart(document.getElementById('chartInv'),{
    type:'bar',
    data:{labels:lbls,datasets:[{data:lbls.map(k=>catMap[k]),backgroundColor:COLORS.blue,borderRadius:5,barThickness:18}]},
    options:opsiBatang(true)
  });
}

// ========== LAPORAN ==========
function renderLaporan(){
  const filterMonth=document.getElementById('laporanMonth')?.value||'';
  const filtered=filterMonth?transactions.filter(t=>t.date.startsWith(filterMonth)):transactions;
  const outMap={};
  filtered.filter(t=>t.type==='pengeluaran').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';outMap[nm]=(outMap[nm]||0)+Number(t.amount);});
  const outLbls=Object.keys(outMap).sort((a,b)=>outMap[b]-outMap[a]);
  if(catChart){catChart.destroy();catChart=null;}
  if(!chartKosong('chartCat',!outLbls.length,'Belum ada pengeluaran')){
    catChart=new Chart(document.getElementById('chartCat'),{
      type:'bar',
      data:{labels:outLbls.slice(0,8),datasets:[{data:outLbls.slice(0,8).map(k=>outMap[k]),backgroundColor:COLORS.red,borderRadius:5}]},
      options:opsiBatang(false)
    });
  }
  const inMap={};
  filtered.filter(t=>t.type==='pemasukan').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';inMap[nm]=(inMap[nm]||0)+Number(t.amount);});
  const inLbls=Object.keys(inMap).sort((a,b)=>inMap[b]-inMap[a]);
  if(inCatChart){inCatChart.destroy();inCatChart=null;}
  if(!chartKosong('chartInCat',!inLbls.length,'Belum ada pemasukan')){
    inCatChart=new Chart(document.getElementById('chartInCat'),{
      type:'bar',
      data:{labels:inLbls.slice(0,8),datasets:[{data:inLbls.slice(0,8).map(k=>inMap[k]),backgroundColor:COLORS.green,borderRadius:5}]},
      options:opsiBatang(false)
    });
  }
  const months={};
  transactions.forEach(t=>{const m=t.date.slice(0,7);if(!months[m])months[m]={in:0,out:0,inv:0};months[m][t.type==='pemasukan'?'in':t.type==='pengeluaran'?'out':'inv']+=Number(t.amount);});
  const sorted=Object.keys(months).sort().reverse();
  const tb=document.getElementById('monthlyTbl');
  tb.innerHTML=sorted.map(m=>{const d=months[m];const bal=d.in-d.out;return`<tr><td style="font-weight:500">${m}</td><td class="amt-in" style="text-align:right">+${fmt(d.in)}</td><td class="amt-out" style="text-align:right">-${fmt(d.out)}</td><td class="amt-inv" style="text-align:right">${fmt(d.inv)}</td><td class="${bal>=0?'amt-in':'amt-out'}" style="text-align:right">${bal>=0?'+':''}${fmt(bal)}</td></tr>`;}).join('')||'<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>';
  const allMonths=[...new Set(transactions.map(t=>t.date.slice(0,7)))].sort().reverse();
  const displayMonths=filterMonth?[filterMonth]:allMonths.slice(0,6);
  renderKategoriPerBulan('pengeluaran',displayMonths);
  renderKategoriPerBulan('pemasukan',displayMonths);
}
function renderKategoriPerBulan(type,months){
  const tbId=type==='pengeluaran'?'rekapOutTbl':'rekapInTbl';
  const headerId=type==='pengeluaran'?'rekapOutHeader':'rekapInHeader';
  const tb=document.getElementById(tbId);
  const header=document.getElementById(headerId);
  if(!tb||!header)return;
  const catMap={};
  transactions.filter(t=>t.type===type).forEach(t=>{
    const c=getCat(t.cat_id);
    const nm=c?c.name:'Lain';
    const m=t.date.slice(0,7);
    if(!catMap[nm])catMap[nm]={};
    catMap[nm][m]=(catMap[nm][m]||0)+Number(t.amount);
  });
  const catNames=Object.keys(catMap).sort();
  if(!catNames.length){tb.innerHTML='<tr><td colspan="10"><div class="empty"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>';return;}
  header.innerHTML=`<th>Kategori</th>${months.map(m=>`<th style="text-align:right">${m.slice(5)}</th>`).join('')}<th style="text-align:right">Total</th>`;
  const color=type==='pengeluaran'?'var(--red-ink)':'var(--green-ink)';
  tb.innerHTML=catNames.map(nm=>{
    const total=months.reduce((a,m)=>a+(catMap[nm][m]||0),0);
    if(total===0)return'';
    return`<tr>
      <td style="font-weight:500">${escapeHtml(nm)}</td>
      ${months.map(m=>`<td style="text-align:right;font-size:12px">${catMap[nm][m]?fmt(catMap[nm][m]):'-'}</td>`).join('')}
      <td style="text-align:right;font-weight:600;color:${color}">${fmt(total)}</td>
    </tr>`;
  }).join('')||'';
  const rowTotal=months.map(m=>transactions.filter(t=>t.type===type&&t.date.startsWith(m)).reduce((a,t)=>a+Number(t.amount),0));
  const grandTotal=rowTotal.reduce((a,v)=>a+v,0);
  tb.innerHTML+=`<tr style="background:var(--surface-2);font-weight:600;border-top:2px solid var(--border)">
    <td>TOTAL</td>
    ${rowTotal.map(v=>`<td style="text-align:right;color:${color}">${fmt(v)}</td>`).join('')}
    <td style="text-align:right;color:${color}">${fmt(grandTotal)}</td>
  </tr>`;
}

// ========== KATEGORI ==========
function renderCategories(){
  ['pemasukan','pengeluaran','investasi'].forEach(type=>{
    const id=type==='pemasukan'?'catIn':type==='pengeluaran'?'catOut':'catInv';
    const el=document.getElementById(id);
    const cats=categories.filter(c=>c.type===type);
    el.innerHTML=cats.map(c=>`<div class="cat-card">${catIcon(c)}<div class="cat-card-info" style="flex:1"><div class="cat-name">${escapeHtml(c.name)}</div><div class="cat-type">${c.type}</div></div><button class="btn btn-ghost btn-sm" onclick="deleteCategory(${c.id})" style="color:var(--red)"><i class="ti ti-trash"></i></button></div>`).join('');
    if(!cats.length)el.innerHTML='<div class="empty" style="padding:16px">Belum ada kategori di sini</div>';
  });
}
function openCatModal(){document.getElementById('catModalBg').classList.add('open')}
function closeCatModal(){document.getElementById('catModalBg').classList.remove('open')}
async function saveCategory(){
  if(isLoading)return;
  const type=document.getElementById('cType').value;
  const name=document.getElementById('cName').value.trim();
  const icon=document.getElementById('cIcon').value.trim()||'tag';
  const color=document.getElementById('cColor').value;
  const msg=document.getElementById('catMsg');
  
  if(!name){
    showMsg(msg,'Nama kategori wajib diisi');
    return;
  }
  
  setLoading(true);
  try{
    const{error}=await sb.from('categories').insert({type,name,icon,color,user_id:currentUser.id});
    if(error)throw error;
    await loadCategories();
    closeCatModal();
    renderCategories();
    document.getElementById('cName').value='';
    document.getElementById('cIcon').value='';
    showMsg(msg,'Kategori berhasil ditambah',true);
  }catch(e){
    console.error('Save category error:',e);
    showMsg(msg,'Gagal simpan: '+e.message);
  }finally{
    setLoading(false);
  }
}
async function deleteCategory(id){
  if(!confirm('Hapus kategori ini?'))return;
  try{
    const{error}=await sb.from('categories').delete().eq('id',id);
    if(error)throw error;
    await loadCategories();
    renderCategories();
  }catch(e){
    console.error('Delete category error:',e);
    alert('Gagal hapus: '+e.message);
  }
}

// ========== UI HELPERS ==========
function setPeriod(p){
  activePeriod=p;
  document.querySelectorAll('.period-tab').forEach(el=>el.classList.remove('active'));
  document.getElementById('ptab-'+p).classList.add('active');
  renderDashboard();
}

// ========== INIT ==========
sb.auth.getSession().then(({data:{session}})=>{
  if(session){currentUser=session.user;showApp();}
});
