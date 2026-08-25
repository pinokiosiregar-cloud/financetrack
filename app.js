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
let lineChart=null,doughnutChart=null,doughnutInChart=null,catChart=null,inCatChart=null,invChart=null;
let selectedCoin=null,livePrices={};
let isLoading=false;

// State panel Rincian Pendapatan/Pengeluaran (dashboard)
let dashPeriodFiltered=[];
let rincianInSearch='',rincianInPage=1;
let rincianOutSearch='',rincianOutPage=1;
const RINCIAN_PAGE_SIZE=8;

// State Pinjaman
let pinjamanList=[],editPinjamanId=null;
let pinjamanPembayaran=[];

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
  const pinjamanBtn=document.getElementById('savePinjamanBtn');
  if(btn){btn.disabled=show;btn.innerHTML=show?'<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Menyimpan...':'<i class="ti ti-check"></i>Simpan';}
  if(catBtn){catBtn.disabled=show;catBtn.innerHTML=show?'<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Menyimpan...':'<i class="ti ti-check"></i>Simpan';}
  if(pinjamanBtn){pinjamanBtn.disabled=show;pinjamanBtn.innerHTML=show?'<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Menyimpan...':'<i class="ti ti-check"></i>Simpan';}
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
    currentUser=null;categories=[];transactions=[];pinjamanList=[];pinjamanPembayaran=[];
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
  await loadPinjaman();
  await loadPinjamanPembayaran();
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
      if(document.getElementById('pinjamanModalBg').classList.contains('open')){closePinjamanModal();}
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

  const pinjamanModal=document.getElementById('pinjamanModalBg');
  if(pinjamanModal){
    pinjamanModal.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!isLoading){
        const saveBtn=document.getElementById('savePinjamanBtn');
        if(saveBtn)saveBtn.click();
      }
    });
  }
}

// ========== LOAD DATA ==========
async function loadPinjaman(){
  try{
    const{data,error}=await sb.from('pinjaman').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(error)throw error;
    pinjamanList=data||[];
  }catch(e){
    console.error('Load pinjaman error:',e);
  }
}
async function loadPinjamanPembayaran(){
  try{
    const{data,error}=await sb.from('pinjaman_pembayaran').select('*').eq('user_id',currentUser.id);
    if(error)throw error;
    pinjamanPembayaran=data||[];
  }catch(e){
    console.error('Load pinjaman pembayaran error:',e);
  }
}
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
      // Kembalikan detail investasi dari meta agar bisa diedit ulang
      if(t.type==='investasi'&&t.meta&&typeof t.meta==='object'){
        restoreInvestMeta(t.meta);
      }
    }
  }else{
    document.getElementById('fDate').value=today();
    document.getElementById('fType').value='pemasukan';
    document.getElementById('fDesc').value='';
    document.getElementById('fAmount').value='';
    document.getElementById('fNote').value='';
    clearInvestFields();
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
    // Untuk investasi, simpan detail (unit, qty, harga beli & kini) di kolom meta
    if(type==='investasi'){
      payload.meta=buildInvestMeta(catId);
    }else{
      payload.meta=null;
    }
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

// Rangkum input form investasi menjadi objek meta yang konsisten.
// Semua tipe menghasilkan bentuk sama: {kind, unit, qty, buyPrice, curPrice, invested, extra...}
// qty & harga dinormalkan ke "per unit dasar" supaya perhitungan gain/loss seragam.
function buildInvestMeta(catId){
  const kind=getCatType(catId);
  const num=id=>parseFloat(document.getElementById(id)?.value)||0;
  const str=id=>(document.getElementById(id)?.value||'').trim();

  if(kind==='saham'){
    const lot=num('fLot'),avg=num('fAvgPrice'),cur=num('fCurPriceSaham');
    // 1 lot = 100 lembar
    const qty=lot*100;
    return{kind,unit:'lot',lot,qty,buyPrice:avg,curPrice:cur||avg,kode:str('fKodeSaham').toUpperCase(),invested:avg*qty};
  }
  if(kind==='crypto'){
    const qty=num('fCoinQty'),buy=num('fCoinBuyPrice');
    const cur=(selectedCoin&&livePrices[selectedCoin.id])||buy;
    return{kind,unit:'koin',qty,buyPrice:buy,curPrice:cur,coinId:selectedCoin?.id||'',symbol:(selectedCoin?.symbol||'').toUpperCase(),invested:buy*qty};
  }
  if(kind==='emas'){
    const qty=num('fGoldGram'),buy=num('fGoldBuyPrice');
    const cur=livePrices['gold']||buy;
    return{kind,unit:'gram',qty,buyPrice:buy,curPrice:cur,invested:buy*qty};
  }
  if(kind==='obligasi'){
    const kupon=num('fKuponRate'),hargaPct=num('fHargaBeliPct'),unit=num('fJumlahUnit');
    const nominal=1e6;
    const buyPerUnit=nominal*hargaPct/100;
    // Nilai kini obligasi diasumsikan kembali ke nominal (100%) bila dipegang hingga tempo
    return{kind,unit:'unit',qty:unit,buyPrice:buyPerUnit,curPrice:nominal,kupon,tglBeli:str('fTglBeli'),tglJatuhTempo:str('fTglJatuhTempo'),invested:buyPerUnit*unit};
  }
  // generik
  const qty=num('fUnits'),buy=num('fBuyPrice'),cur=num('fCurPrice');
  return{kind:'other',unit:'unit',qty,buyPrice:buy,curPrice:cur||buy,invested:buy*qty};
}

// Hitung gain/loss dari meta. Mengembalikan {modal, kini, gain, pct}.
// Fallback aman: bila meta tidak ada, modal=kini=amount, gain=0.
function calcInvest(t){
  const m=t.meta;
  const modalAmount=Number(t.amount)||0;
  if(!m||typeof m!=='object'){
    return{modal:modalAmount,kini:modalAmount,gain:0,pct:0};
  }
  const qty=Number(m.qty)||0;
  const buy=Number(m.buyPrice)||0;
  const cur=Number(m.curPrice)||buy;
  const modal=m.invested!=null?Number(m.invested):(buy*qty);
  // Bila qty tidak valid, anggap nilai kini = modal (gain 0) agar tidak muncul nilai 0 palsu
  const kini=qty>0?cur*qty:modal;
  const gain=kini-modal;
  const pct=modal?(gain/modal*100):0;
  return{modal,kini,gain,pct};
}

// Isi ulang field form investasi dari meta (dipakai saat mengedit transaksi).
function restoreInvestMeta(m){
  const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null)el.value=val;};
  const kind=m.kind||'other';
  if(kind==='saham'){
    set('fKodeSaham',m.kode||'');
    set('fLot',m.lot||(m.qty?m.qty/100:''));
    set('fAvgPrice',m.buyPrice||'');
    set('fCurPriceSaham',m.curPrice||'');
    updateSahamPreview();
  }else if(kind==='crypto'){
    set('fCoinQty',m.qty||'');
    set('fCoinBuyPrice',m.buyPrice||'');
    if(m.coinId){
      selectedCoin={id:m.coinId,name:m.symbol||m.coinId,symbol:m.symbol||'',image:''};
      livePrices[m.coinId]=m.curPrice||m.buyPrice||0;
      const sel=document.getElementById('fCoinSelected');
      if(sel){sel.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--border);border-radius:4px"><b>${escapeHtml(m.symbol||'')}</b></div>`;}
    }
    updateCryptoPreview();
  }else if(kind==='emas'){
    set('fGoldGram',m.qty||'');
    set('fGoldBuyPrice',m.buyPrice||'');
    if(m.curPrice)livePrices['gold']=m.curPrice;
    updateEmasPreview();
  }else if(kind==='obligasi'){
    set('fKuponRate',m.kupon||'');
    // hitung ulang harga beli % dari buyPrice per unit
    const nominal=1e6;
    if(m.buyPrice)set('fHargaBeliPct',((m.buyPrice/nominal)*100).toFixed(2));
    set('fJumlahUnit',m.qty||'');
    set('fTglBeli',m.tglBeli||'');
    set('fTglJatuhTempo',m.tglJatuhTempo||'');
    updateObligasiPreview();
  }else{
    set('fBuyPrice',m.buyPrice||'');
    set('fCurPrice',m.curPrice||'');
    set('fUnits',m.qty||'');
    updateGainPreview();
  }
}

// Kosongkan semua field & preview investasi (dipakai saat modal transaksi baru).
function clearInvestFields(){
  ['fKodeSaham','fLot','fAvgPrice','fCurPriceSaham',
   'fCoinQty','fCoinBuyPrice','fCoinSearch',
   'fGoldGram','fGoldBuyPrice',
   'fKuponRate','fHargaBeliPct','fJumlahUnit','fTglBeli','fTglJatuhTempo','fTglKuponTerakhir',
   'fBuyPrice','fCurPrice','fUnits'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['sahamPreview','cryptoPreview','emasPreview','obligasiPreview','gainPreview'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.innerHTML='';}});
  const sel=document.getElementById('fCoinSelected');if(sel)sel.innerHTML='';
  const dd=document.getElementById('coinDropdown');if(dd)dd.innerHTML='';
  selectedCoin=null;
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
  const titles={'dashboard':'Dashboard','transaksi':'Data transaksi','investasi':'Investasi','pinjaman':'Pinjaman','laporan':'Laporan','kategori':'Data kategori'};
  safeTxt(document.getElementById('pageTitle'),titles[page]||'Dashboard');
  if(page==='dashboard')renderDashboard();
  else if(page==='transaksi')renderTables();
  else if(page==='investasi')renderInvestasi();
  else if(page==='pinjaman')renderPinjaman();
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

// Tampilkan blok detail investasi sesuai kategori yang dipilih.
// Saham → sahamExtra, Kripto → cryptoExtra, Emas → emasExtra,
// Obligasi → obligasiExtra, sisanya → investExtra (generik).
function onCatChange(){
  const t=document.getElementById('fType').value;
  const blocks=['sahamExtra','cryptoExtra','emasExtra','obligasiExtra','investExtra'];
  blocks.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  if(t!=='investasi')return;
  const catId=document.getElementById('fCat').value;
  const kind=getCatType(catId);
  const map={saham:'sahamExtra',crypto:'cryptoExtra',emas:'emasExtra',obligasi:'obligasiExtra',other:'investExtra'};
  const target=document.getElementById(map[kind]||'investExtra');
  if(target)target.style.display='block';
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
  dashPeriodFiltered=filtered;
  renderRincian();
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
// ========== RINCIAN PENDAPATAN & PENGELUARAN (DASHBOARD) ==========
// Sumber data: dashPeriodFiltered, yaitu transaksi yang sudah disaring
// oleh filter periode dashboard (Hari ini/Bulan/Tahun/Semua) — jadi
// panel ini otomatis ikut filter periode tanpa filter tahun terpisah.
function rincianFilteredRows(type,search){
  let rows=dashPeriodFiltered.filter(t=>t.type===type);
  if(search){
    const q=search.toLowerCase();
    rows=rows.filter(t=>{
      const c=getCat(t.cat_id);
      return(t.description||'').toLowerCase().includes(q)
        ||(t.note||'').toLowerCase().includes(q)
        ||(c?.name||'').toLowerCase().includes(q);
    });
  }
  return rows.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
}
function renderRincianPanel(type){
  const isIn=type==='pemasukan';
  const search=isIn?rincianInSearch:rincianOutSearch;
  let page=isIn?rincianInPage:rincianOutPage;
  const tbId=isIn?'rincianInTbl':'rincianOutTbl';
  const pagerId=isIn?'rincianInPager':'rincianOutPager';

  const rows=rincianFilteredRows(type,search);
  const totalPages=Math.max(1,Math.ceil(rows.length/RINCIAN_PAGE_SIZE));
  if(page>totalPages)page=totalPages;
  if(page<1)page=1;
  if(isIn)rincianInPage=page;else rincianOutPage=page;

  const startIdx=(page-1)*RINCIAN_PAGE_SIZE;
  const pageRows=rows.slice(startIdx,startIdx+RINCIAN_PAGE_SIZE);

  const tb=document.getElementById(tbId);
  tb.innerHTML=pageRows.map((t,i)=>{
    const c=getCat(t.cat_id);
    return`<tr>
      <td>${startIdx+i+1}</td>
      <td><div class="cat-row">${catIcon(c)}<span>${escapeHtml(c?.name||'-')}</span></div></td>
      <td class="ta-r">${isIn?'':'-'}${fmt(t.amount)}</td>
      <td><small>${t.date}</small></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openModal(${t.id})"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
  if(!pageRows.length){
    const emptyMsg=rows.length?'Tidak ada hasil pencarian':(isIn?'Belum ada pendapatan':'Belum ada pengeluaran');
    tb.innerHTML=`<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>${emptyMsg}</div></td></tr>`;
  }

  const pager=document.getElementById(pagerId);
  const rangeStart=rows.length?startIdx+1:0;
  const rangeEnd=Math.min(startIdx+RINCIAN_PAGE_SIZE,rows.length);
  pager.innerHTML=`
    <span class="pagination-info">${rangeStart}\u2013${rangeEnd} dari ${rows.length}</span>
    <div class="pagination-controls">
      <button class="btn btn-ghost btn-sm" onclick="changeRincianPage('${type}',-1)" ${page<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>
      <span class="pagination-page">Hal ${page}/${totalPages}</span>
      <button class="btn btn-ghost btn-sm" onclick="changeRincianPage('${type}',1)" ${page>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>
    </div>`;
}
function renderRincian(){
  renderRincianPanel('pemasukan');
  renderRincianPanel('pengeluaran');
}
function onRincianSearch(type){
  const isIn=type==='pemasukan';
  const val=document.getElementById(isIn?'rincianInSearch':'rincianOutSearch').value;
  if(isIn){rincianInSearch=val;rincianInPage=1;}else{rincianOutSearch=val;rincianOutPage=1;}
  renderRincianPanel(type);
}
function changeRincianPage(type,delta){
  if(type==='pemasukan')rincianInPage+=delta;else rincianOutPage+=delta;
  renderRincianPanel(type);
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
  
  const topExp=topKategoriData('pengeluaran',data);
  if(doughnutChart){doughnutChart.destroy();doughnutChart=null;}
  if(!chartKosong('chartDoughnut',!topExp.length,'Belum ada pengeluaran')){
    doughnutChart=new Chart(document.getElementById('chartDoughnut'),{
      type:'doughnut',
      data:{labels:topExp.map(x=>x.name),datasets:[{data:topExp.map(x=>x.amount),backgroundColor:topExp.map(x=>x.color),borderWidth:2,borderColor:THEME.surface}]},
      options:opsiDonut()
    });
  }

  const topInc=topKategoriData('pemasukan',data);
  if(doughnutInChart){doughnutInChart.destroy();doughnutInChart=null;}
  if(!chartKosong('chartDoughnutIn',!topInc.length,'Belum ada pemasukan')){
    doughnutInChart=new Chart(document.getElementById('chartDoughnutIn'),{
      type:'doughnut',
      data:{labels:topInc.map(x=>x.name),datasets:[{data:topInc.map(x=>x.amount),backgroundColor:topInc.map(x=>x.color),borderWidth:2,borderColor:THEME.surface}]},
      options:opsiDonut()
    });
  }
}
// Kelompokkan transaksi per kategori untuk donut "kategori terbesar" (dipakai
// untuk pemasukan & pengeluaran). Warna donut mengikuti warna kategori
// (field `color` di tabel categories) supaya konsisten dengan cat-icon yang
// dipakai di tabel-tabel lain.
function topKategoriData(type,data){
  const map={};
  data.filter(t=>t.type===type).forEach(t=>{
    const c=getCat(t.cat_id);
    const key=c?c.id:'lain';
    if(!map[key])map[key]={name:c?c.name:'Lain',amount:0,color:catColor(c)};
    map[key].amount+=Number(t.amount);
  });
  return Object.values(map).sort((a,b)=>b.amount-a.amount).slice(0,5);
}
function opsiDonut(){
  return{
    responsive:true,maintainAspectRatio:false,cutout:'62%',
    plugins:{
      legend:{position:'bottom',labels:{color:THEME.text2,usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:12,font:{size:11}}},
      tooltip:{callbacks:{label:c=>' '+c.label+': '+fmt(c.parsed)}}
    }
  };
}

// ========== INVESTASI ==========
function renderInvestasi(){
  const rows=transactions.filter(t=>t.type==='investasi').map(r=>{
    const calc=calcInvest(r);
    r._modal=calc.modal;r._kini=calc.kini;r._gain=calc.gain;r._pct=calc.pct;
    return r;
  });

  // ----- Summary cards: total modal, nilai kini, total P&L -----
  const totModal=rows.reduce((a,r)=>a+r._modal,0);
  const totKini=rows.reduce((a,r)=>a+r._kini,0);
  const totGain=totKini-totModal;
  const totPct=totModal?(totGain/totModal*100):0;
  const cardsEl=document.getElementById('investCards');
  if(cardsEl){
    const gainColor=totGain>=0?'green':'red';
    cardsEl.innerHTML=`
      <div class="card-stat" style="--aksen:var(--blue)">
        <div class="card-content">
          <div class="card-label"><i class="ti ti-wallet"></i> Total Modal</div>
          <div class="card-value" style="color:var(--blue)">${fmt(totModal)}</div>
        </div>
      </div>
      <div class="card-stat" style="--aksen:var(--purple)">
        <div class="card-content">
          <div class="card-label"><i class="ti ti-coins"></i> Nilai Kini</div>
          <div class="card-value" style="color:var(--purple)">${fmt(totKini)}</div>
        </div>
      </div>
      <div class="card-stat" style="--aksen:var(--${gainColor})">
        <div class="card-content">
          <div class="card-label"><i class="ti ti-trending-${totGain>=0?'up':'down'}"></i> Total P&L</div>
          <div class="card-value" style="color:var(--${gainColor})">${totGain>=0?'+':''}${fmt(totGain)}</div>
          <div class="card-sub" style="color:var(--${gainColor})">${totGain>=0?'+':''}${totPct.toFixed(2)}%</div>
        </div>
      </div>`;
  }

  // ----- Tabel per aset -----
  const html=rows.map(r=>{
    const c=getCat(r.cat_id);
    const m=r.meta&&typeof r.meta==='object'?r.meta:null;
    let detail='';
    if(m){
      if(m.kind==='saham')detail=`${m.kode||''} · ${m.lot||(m.qty/100)} lot`;
      else if(m.kind==='crypto')detail=`${m.qty} ${m.symbol||'koin'}`;
      else if(m.kind==='emas')detail=`${m.qty} gram`;
      else if(m.kind==='obligasi')detail=`${m.qty} unit · kupon ${m.kupon||0}%`;
      else detail=`${m.qty||0} unit`;
    }
    return`<tr>
      <td>${catIcon(c)}</td>
      <td>${escapeHtml(r.description)}${detail?`<br><small style="color:var(--text-3)">${escapeHtml(detail)}</small>`:''}</td>
      <td><small>${r.date}</small></td>
      <td><span class="badge badge-blue">${escapeHtml(c?.name||'-')}</span></td>
      <td class="ta-r">${fmt(r._modal)}</td>
      <td class="ta-r">${fmt(r._kini)}</td>
      <td class="ta-r"><span class="${r._gain>=0?'gain-pos':'gain-neg'}">${r._gain>=0?'+':''}${fmt(r._gain)}<br><small>${r._gain>=0?'+':''}${r._pct.toFixed(2)}%</small></span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openModal(${r.id})"><i class="ti ti-edit"></i></button></td>
    </tr>`;
  }).join('');
  document.getElementById('investTbl').innerHTML=html||'<tr><td colspan="8"><div class="empty"><i class="ti ti-inbox"></i>Belum ada aset</div></td></tr>';

  // ----- Chart komposisi (pakai nilai kini, bukan modal) -----
  const catMap={};
  rows.forEach(r=>{const c=getCat(r.cat_id);const nm=c?c.name:'Lain';catMap[nm]=(catMap[nm]||0)+r._kini;});
  const lbls=Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]);
  if(invChart){invChart.destroy();invChart=null;}
  if(chartKosong('chartInv',!lbls.length,'Belum ada aset untuk ditampilkan'))return;
  invChart=new Chart(document.getElementById('chartInv'),{
    type:'bar',
    data:{labels:lbls,datasets:[{data:lbls.map(k=>catMap[k]),backgroundColor:COLORS.blue,borderRadius:5,barThickness:18}]},
    options:opsiBatang(true)
  });
}

// ========== PINJAMAN ==========
// Metode bunga: anuitas/efektif. Skedul dihitung sekali penuh (bulan 1..n),
// lalu diambil baris sesuai jumlah bulan berjalan untuk dapat sisa pokok
// saat ini — tidak menghitung bunga berjalan harian.
function buildJadwalAnuitas(pokok,bungaPersenTahun,n){
  const r=(Number(bungaPersenTahun)||0)/100/12;
  const angsuran=r===0?pokok/n:pokok*r/(1-Math.pow(1+r,-n));
  const jadwal=[];
  let sisa=pokok;
  for(let bulan=1;bulan<=n;bulan++){
    const bunga=sisa*r;
    let pokokBayar=angsuran-bunga;
    sisa=sisa-pokokBayar;
    if(bulan===n||sisa<0)sisa=0; // rapikan pembulatan di akhir tenor
    jadwal.push({bulan,angsuran,bunga,pokokBayar,sisa});
  }
  return jadwal;
}
// Bulan berjalan dihitung dari tanggal_mulai (dianggap sebagai tanggal
// jatuh tempo angsuran tiap bulan) sampai hari ini, di-clamp ke [0, n].
function bulanBerjalan(tanggalMulai,n){
  const start=new Date(tanggalMulai+'T00:00:00');
  const now=new Date();
  let bulan=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth());
  if(now.getDate()<start.getDate())bulan-=1;
  return Math.max(0,Math.min(bulan,n));
}
function pinjamanStats(p){
  const n=p.jangka_waktu_bulan;
  const jadwal=buildJadwalAnuitas(Number(p.pokok),Number(p.bunga_persen_tahun),n);
  // Sumber kebenaran sisa pokok: jumlah pembayaran yang benar-benar tercatat
  // di pinjaman_pembayaran, bukan lagi tanggal berjalan. bulanBerjalan() tetap
  // dipakai, tapi sekarang hanya untuk mendeteksi keterlambatan (overdueBulan).
  const bulanTerbayar=pinjamanPembayaran.filter(x=>x.pinjaman_id===p.id).length;
  const elapsedByDate=bulanBerjalan(p.tanggal_mulai,n);
  const overdueBulan=Math.max(0,elapsedByDate-bulanTerbayar);
  const angsuranPerBulan=jadwal[0]?jadwal[0].angsuran:0;
  const sisaPokok=bulanTerbayar===0?Number(p.pokok):(jadwal[bulanTerbayar-1]?jadwal[bulanTerbayar-1].sisa:0);
  const sisaBulan=n-bulanTerbayar;
  const progress=n?Math.min(100,(bulanTerbayar/n)*100):0;
  return{angsuranPerBulan,sisaPokok,sisaBulan,bulanTerbayar,overdueBulan,progress};
}
function renderPinjaman(){
  const listEl=document.getElementById('pinjamanList');
  const summaryEl=document.getElementById('pinjamanSummaryCards');
  if(!listEl||!summaryEl)return;

  let totPokok=0,totSisa=0,totAngsuran=0;
  const cardsHtml=pinjamanList.map(p=>{
    const s=pinjamanStats(p);
    totPokok+=Number(p.pokok);
    totSisa+=s.sisaPokok;
    totAngsuran+=s.angsuranPerBulan;
    const lunas=s.sisaBulan<=0;
    const bulanKeBerikutnya=Math.min(s.bulanTerbayar+1,p.jangka_waktu_bulan);
    const badgeTerlambat=(!lunas&&s.overdueBulan>0)?` <span class="badge badge-red">Terlambat ${s.overdueBulan} bulan</span>`:'';
    const tombolBayar=lunas?'':`<button class="btn btn-primary btn-sm btn-block" onclick="bayarAngsuranPinjaman('${p.id}')"><i class="ti ti-cash"></i> Bayar angsuran ke-${bulanKeBerikutnya}</button>`;
    return`<div class="loan-card${lunas?' loan-lunas':''}">
      <div class="loan-card-header">
        <div class="loan-name"><i class="ti ti-building-bank"></i> ${escapeHtml(p.nama)}${badgeTerlambat}</div>
        <div class="loan-actions">
          <button class="btn btn-ghost btn-sm" onclick="openPinjamanModal('${p.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="deletePinjaman('${p.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div class="loan-stats">
        <div class="loan-stat"><span class="loan-stat-label">Angsuran/bulan</span><span class="loan-stat-value">${fmt(s.angsuranPerBulan)}</span></div>
        <div class="loan-stat"><span class="loan-stat-label">Sisa pokok</span><span class="loan-stat-value">${fmt(s.sisaPokok)}</span></div>
        <div class="loan-stat"><span class="loan-stat-label">Sisa tenor</span><span class="loan-stat-value">${lunas?'Lunas':s.sisaBulan+' bulan'}</span></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${s.progress.toFixed(1)}%"></div></div>
      <div class="loan-progress-label">${s.bulanTerbayar} dari ${p.jangka_waktu_bulan} angsuran terbayar</div>
      ${tombolBayar}
    </div>`;
  }).join('');
  listEl.innerHTML=cardsHtml||'<div class="empty"><i class="ti ti-inbox"></i>Belum ada pinjaman</div>';

  summaryEl.innerHTML=`
    <div class="card-stat" style="--aksen:var(--blue)">
      <div class="card-content">
        <div class="card-label"><i class="ti ti-wallet"></i> Total Pokok</div>
        <div class="card-value" style="color:var(--blue)">${fmt(totPokok)}</div>
      </div>
    </div>
    <div class="card-stat" style="--aksen:var(--red)">
      <div class="card-content">
        <div class="card-label"><i class="ti ti-credit-card"></i> Total Sisa Pokok</div>
        <div class="card-value" style="color:var(--red)">${fmt(totSisa)}</div>
      </div>
    </div>
    <div class="card-stat" style="--aksen:var(--amber)">
      <div class="card-content">
        <div class="card-label"><i class="ti ti-calendar-due"></i> Total Angsuran/bulan</div>
        <div class="card-value" style="color:var(--amber)">${fmt(totAngsuran)}</div>
      </div>
    </div>`;
}
async function bayarAngsuranPinjaman(pinjamanId){
  const p=pinjamanList.find(x=>x.id===pinjamanId);
  if(!p)return;
  const n=p.jangka_waktu_bulan;
  const bulanTerbayar=pinjamanPembayaran.filter(x=>x.pinjaman_id===p.id).length;
  if(bulanTerbayar>=n){
    alert('Pinjaman ini sudah lunas.');
    return;
  }
  const jadwal=buildJadwalAnuitas(Number(p.pokok),Number(p.bunga_persen_tahun),n);
  const bulanKe=bulanTerbayar+1;
  const jumlah=jadwal[bulanKe-1]?jadwal[bulanKe-1].angsuran:0;
  if(!confirm(`Catat pembayaran angsuran ke-${bulanKe} untuk "${p.nama}" sebesar ${fmt(jumlah)}?`))return;
  const cat=categories.find(c=>c.type==='pengeluaran'&&c.name==='Cicilan Pinjaman');
  if(!cat){
    alert('Kategori "Cicilan Pinjaman" tidak ditemukan. Silakan buat kategori tersebut dulu di halaman Data kategori.');
    return;
  }
  try{
    const transPayload={date:today(),type:'pengeluaran',cat_id:cat.id,description:`Angsuran ke-${bulanKe} - ${p.nama}`,amount:jumlah,note:'',user_id:currentUser.id,meta:null};
    const{data:transData,error:transError}=await sb.from('transactions').insert([transPayload]).select().single();
    if(transError)throw transError;
    const pembayaranPayload={pinjaman_id:p.id,user_id:currentUser.id,bulan_ke:bulanKe,tanggal_bayar:today(),jumlah,transaction_id:transData.id};
    const{error:pembayaranError}=await sb.from('pinjaman_pembayaran').insert([pembayaranPayload]);
    if(pembayaranError)throw pembayaranError;
    await loadTransactions();
    await loadPinjamanPembayaran();
    renderDashboard();
    renderTables();
    renderPinjaman();
  }catch(e){
    console.error('Bayar angsuran error:',e);
    alert('Gagal mencatat pembayaran: '+e.message);
  }
}
function updatePinjamanPreview(){
  const preview=document.getElementById('pinjamanPreview');
  if(!preview)return;
  const pokok=parseFloat(document.getElementById('pPokok').value)||0;
  const bunga=parseFloat(document.getElementById('pBunga').value)||0;
  const tenor=parseInt(document.getElementById('pTenor').value)||0;
  if(!pokok||!tenor){preview.style.display='none';return;}
  const jadwal=buildJadwalAnuitas(pokok,bunga,tenor);
  const angsuran=jadwal[0]?jadwal[0].angsuran:0;
  const totalBayar=angsuran*tenor;
  const totalBunga=totalBayar-pokok;
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Angsuran per bulan</span><b>${fmt(angsuran)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total dibayar (${tenor} bulan)</span><b>${fmt(totalBayar)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Total bunga</span><b>${fmt(totalBunga)}</b></div>`;
}
function openPinjamanModal(id){
  editPinjamanId=id||null;
  const modal=document.getElementById('pinjamanModalBg');
  const msg=document.getElementById('pinjamanMsg');
  const title=modal.querySelector('.modal-title');
  if(msg)msg.style.display='none';
  if(title)title.innerHTML=`<i class="ti ti-building-bank i-brand" aria-hidden="true"></i>${id?'Edit pinjaman':'Tambah pinjaman'}`;
  if(id){
    const p=pinjamanList.find(x=>x.id===id);
    if(p){
      document.getElementById('pNama').value=p.nama;
      document.getElementById('pPokok').value=p.pokok;
      document.getElementById('pBunga').value=p.bunga_persen_tahun;
      document.getElementById('pTenor').value=p.jangka_waktu_bulan;
      document.getElementById('pTglMulai').value=p.tanggal_mulai;
    }
  }else{
    document.getElementById('pNama').value='';
    document.getElementById('pPokok').value='';
    document.getElementById('pBunga').value='';
    document.getElementById('pTenor').value='';
    document.getElementById('pTglMulai').value=today();
  }
  updatePinjamanPreview();
  setLoading(false);
  modal.classList.add('open');
}
function closePinjamanModal(){
  document.getElementById('pinjamanModalBg').classList.remove('open');
  editPinjamanId=null;
}
async function savePinjaman(){
  if(isLoading)return;
  const nama=document.getElementById('pNama').value.trim();
  const pokok=parseFloat(document.getElementById('pPokok').value);
  const bunga=parseFloat(document.getElementById('pBunga').value)||0;
  const tenor=parseInt(document.getElementById('pTenor').value);
  const tglMulai=document.getElementById('pTglMulai').value;
  const msg=document.getElementById('pinjamanMsg');

  if(!nama||!pokok||pokok<=0||!tenor||tenor<=0||!tglMulai){
    showMsg(msg,'Harap lengkapi semua bidang wajib dengan nilai yang valid');
    return;
  }

  setLoading(true);
  try{
    const payload={nama,pokok,bunga_persen_tahun:bunga,jangka_waktu_bulan:tenor,tanggal_mulai:tglMulai,metode_bunga:'anuitas',user_id:currentUser.id};
    if(editPinjamanId){
      const{error}=await sb.from('pinjaman').update(payload).eq('id',editPinjamanId);
      if(error)throw error;
    }else{
      const{error}=await sb.from('pinjaman').insert([payload]);
      if(error)throw error;
    }
    await loadPinjaman();
    closePinjamanModal();
    renderPinjaman();
  }catch(e){
    console.error('Save pinjaman error:',e);
    showMsg(msg,'Gagal simpan: '+e.message);
  }finally{
    setLoading(false);
  }
}
async function deletePinjaman(id){
  if(!confirm('Hapus data pinjaman ini?'))return;
  try{
    const{error}=await sb.from('pinjaman').delete().eq('id',id);
    if(error)throw error;
    await loadPinjaman();
    renderPinjaman();
  }catch(e){
    console.error('Delete pinjaman error:',e);
    alert('Gagal hapus: '+e.message);
  }
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
  rincianInPage=1;rincianOutPage=1;
  renderDashboard();
}

// ========== INIT ==========
sb.auth.getSession().then(({data:{session}})=>{
  if(session){currentUser=session.user;showApp();}
});
