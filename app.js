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
let categories=[],transactions=[],currentType='pemasukan',editId=null,currentUser=null;
let activePeriod='today',activeInvFilter='semua';
let lineChart=null,doughnutChart=null,catChart=null,inCatChart=null,invChart=null;
let selectedCoin=null,livePrices={};

// ========== UTILS ==========
const fmt=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const today=()=>new Date().toISOString().split('T')[0];
const getCat=id=>categories.find(c=>c.id==id);
function catColor(c){return COLORS[c?.color]||'#888'}
function catBg(c){return LIGHT[c?.color]||'#eee'}
function catIcon(c){
  if(!c)return'<div class="cat-icon" style="background:#eee"><i class="ti ti-tag"></i></div>';
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
  const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){msg.textContent=error.message;msg.style.display='block';return;}
  currentUser=data.user;showApp();
}
async function handleRegister(){
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPassword').value;
  const msg=document.getElementById('regMsg');
  msg.style.display='none';
  const{data,error}=await sb.auth.signUp({email,password:pass});
  if(error){msg.textContent=error.message;msg.style.display='block';return;}
  msg.style.color='#16a34a';msg.textContent='Registrasi berhasil! Silakan login.';msg.style.display='block';
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
    const el=document.getElementById(id);
    if(el)el.addEventListener('input',updateGainPreview);
  });
}

// ========== LOAD DATA ==========
async function loadCategories(){
  const{data}=await sb.from('categories').select('*').eq('user_id',currentUser.id).order('name');
  if(data&&data.length>0){categories=data;}else{await seedCategories();}
}
async function seedCategories(){
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
  const{data}=await sb.from('categories').insert(rows).select();
  if(data)categories=data;
}
async function loadTransactions(){
  const{data}=await sb.from('transactions').select('*').eq('user_id',currentUser.id).order('date',{ascending:false});
  transactions=data||[];
}

// ========== LIVE PRICES ==========
async function fetchCryptoPrice(coinId){
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=idr`);
    const d=await r.json();
    return d[coinId]?.idr||0;
  }catch{return 0;}
}
async function fetchGoldPrice(){
  try{
    // Harga emas via exchangerate + gold USD
    const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=idr');
    const d=await r.json();
    // tether-gold = 1 troy oz = 31.1035 gram
    const pricePerOz=d['tether-gold']?.idr||0;
    return pricePerOz/31.1035;
  }catch{return 0;}
}
async function refreshPrices(){
  const btn=document.getElementById('btnRefresh');
  btn.innerHTML='<i class="ti ti-loader"></i> Loading...';
  btn.disabled=true;
  const cryptoTrx=transactions.filter(t=>t.type==='investasi'&&t.coin_id);
  const coinIds=[...new Set(cryptoTrx.map(t=>t.coin_id))];
  for(const id of coinIds){
    livePrices[id]=await fetchCryptoPrice(id);
  }
  const hasSaham=transactions.some(t=>t.type==='investasi'&&getCatType(t.cat_id)==='emas');
  if(hasSaham){livePrices['gold']=await fetchGoldPrice();}
  btn.innerHTML='<i class="ti ti-refresh"></i> Update Harga';
  btn.disabled=false;
  renderInvest();
}

// ========== COIN SEARCH ==========
async function searchCoin(){
  const q=document.getElementById('fCoinSearch').value.trim();
  const dd=document.getElementById('coinDropdown');
  if(q.length<2){dd.style.display='none';return;}
  try{
    const r=await fetch(`https://api.coingecko.com/api/v3/search?query=${q}`);
    const d=await r.json();
    const coins=d.coins?.slice(0,8)||[];
    dd.style.display=coins.length?'block':'none';
    dd.innerHTML=coins.map(c=>`
      <div onclick="selectCoin('${c.id}','${c.symbol}','${c.name}','${c.thumb}')"
        style="padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f1f5f9;font-size:13px">
        <img src="${c.thumb}" width="20" height="20" style="border-radius:50%">
        <span><b>${c.symbol.toUpperCase()}</b> — ${c.name}</span>
      </div>`).join('');
  }catch{dd.style.display='none';}
}
async function selectCoin(id,symbol,name,thumb){
  selectedCoin={id,symbol,name,thumb};
  document.getElementById('coinDropdown').style.display='none';
  document.getElementById('fCoinSearch').value=name;
  const el=document.getElementById('fCoinSelected');
  el.style.display='flex';
  el.innerHTML=`<img src="${thumb}" width="24" style="border-radius:50%"><span><b>${symbol.toUpperCase()}</b> — ${name}</span>`;
  // Fetch harga saat ini
  const price=await fetchCryptoPrice(id);
  if(price)livePrices[id]=price;
  updateCryptoPreview();
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
  if(name==='investasi'){refreshPrices();renderInvest();}
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
function filterInv(f){
  activeInvFilter=f;
  document.querySelectorAll('[id^="finv-"]').forEach(b=>{b.style.borderColor='';b.style.color='';});
  const el=document.getElementById('finv-'+f);
  if(el){el.style.borderColor='#6366f1';el.style.color='#6366f1';}
  renderInvest();
}

// ========== MODAL ==========
function onCatChange(){
  const catId=parseInt(document.getElementById('fCat').value);
  const type=getCatType(catId);
  document.getElementById('sahamExtra').style.display=type==='saham'?'block':'none';
  document.getElementById('cryptoExtra').style.display=type==='crypto'?'block':'none';
  document.getElementById('emasExtra').style.display=type==='emas'?'block':'none';
  document.getElementById('obligasiExtra').style.display=type==='obligasi'?'block':'none';
  document.getElementById('investExtra').style.display=(type==='other'&&currentType==='investasi')?'block':'none';
}

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
    onCatChange();
    const type=getCatType(t.cat_id);
    if(type==='saham'){
      document.getElementById('fKodeSaham').value=t.kode_saham||'';
      document.getElementById('fLot').value=t.lot||'';
      document.getElementById('fAvgPrice').value=t.avg_price||'';
      document.getElementById('fCurPriceSaham').value=t.cur_price||'';
      updateSahamPreview();
    }
    if(type==='crypto'){
      if(t.coin_id){selectedCoin={id:t.coin_id,symbol:t.coin_symbol,name:t.description};}
      document.getElementById('fCoinQty').value=t.units||'';
      document.getElementById('fCoinBuyPrice').value=t.buy_price||'';
    }
    if(type==='emas'){
      document.getElementById('fGoldGram').value=t.gold_gram||'';
      document.getElementById('fGoldBuyPrice').value=t.buy_price||'';
    }
    if(type==='obligasi'){
      document.getElementById('fKuponRate').value=t.kupon_rate||'';
      document.getElementById('fHargaBeliPct').value=t.harga_beli_pct||100;
      document.getElementById('fJumlahUnit').value=t.units||'';
      document.getElementById('fTglBeli').value=t.tgl_beli||'';
      document.getElementById('fTglKuponTerakhir').value=t.tgl_kupon_terakhir||'';
      document.getElementById('fTglJatuhTempo').value=t.tgl_jatuh_tempo||'';
      updateObligasiPreview();
    }
    document.getElementById('modalTitleText').textContent='Edit Transaksi';
  } else {
    setType('pemasukan');
    ['fAmount','fDesc','fNote','fKodeSaham','fLot','fAvgPrice','fCurPriceSaham',
     'fCoinSearch','fCoinQty','fCoinBuyPrice','fGoldGram','fGoldBuyPrice',
     'fKuponRate','fHargaBeliPct','fJumlahUnit','fTglBeli','fTglKuponTerakhir','fTglJatuhTempo'].forEach(id=>{
       const el=document.getElementById(id);if(el)el.value='';
     });
    selectedCoin=null;
    document.getElementById('fDate').value=today();
    document.getElementById('modalTitleText').textContent='Tambah Transaksi';
    ['sahamPreview','cryptoPreview','emasPreview','obligasiPreview','gainPreview'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    const sel=document.getElementById('fCoinSelected');if(sel)sel.style.display='none';
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
  const kode=document.getElementById('fKodeSaham').value||'-';
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
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'#16a34a':'#dc2626'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
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
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Koin</span><b>${selectedCoin.symbol.toUpperCase()} — ${selectedCoin.name}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Jumlah</span><b>${qty}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Beli</span><b>${fmt(buyPrice)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Kini</span><b>${curPrice?fmt(curPrice):'Memuat...'}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Invested</span><b>${fmt(invested)}</b></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Market Value</span><b>${fmt(marketVal)}</b></div>
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'#16a34a':'#dc2626'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
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
    <div style="display:flex;justify-content:space-between"><span>Potential P&L</span><b style="color:${pl>=0?'#16a34a':'#dc2626'}">${pl>=0?'+':''}${fmt(pl)} (${plPct}%)</b></div>
  `;
}
function updateGainPreview(){}

// ========== OBLIGASI ==========
function getTglKuponTerakhir(tglBeli,tglJatuhTempo){
  const beli=new Date(tglBeli);
  const jatuh=new Date(tglJatuhTempo);
  const bulan=jatuh.getMonth()+1;
  const b1=bulan<=6?bulan:bulan-6;
  const b2=bulan<=6?bulan+6:bulan;
  const tgl=jatuh.getDate();
  let kandidat=[];
  for(let y=beli.getFullYear()-1;y<=beli.getFullYear();y++){
    kandidat.push(new Date(y,b1-1,tgl));
    kandidat.push(new Date(y,b2-1,tgl));
  }
  const valid=kandidat.filter(d=>d<=beli).sort((a,b)=>b-a);
  return valid[0]||new Date(beli.getFullYear(),b1-1,tgl);
}
function hitungObligasi(t,tglHitung=new Date()){
  const NOMINAL=1000000,rate=t.kupon_rate||0,units=t.units||1;
  const hargaBeliPct=(t.harga_beli_pct||100)/100;
  const tglBeli=new Date(t.tgl_beli||t.date);
  const tglJatuh=new Date(t.tgl_jatuh_tempo||t.date);
  const tglKuponTerakhir=t.tgl_kupon_terakhir?new Date(t.tgl_kupon_terakhir):getTglKuponTerakhir(tglBeli,tglJatuh);
  const totalModal=hargaBeliPct*NOMINAL*units;
  const kuponHarian=(NOMINAL*rate/100)/365;
  const kuponHarianTotal=kuponHarian*units;
  const hariAccrued=Math.max(0,Math.round((tglBeli-tglKuponTerakhir)/(1000*60*60*24)));
  const kuponPenjual=kuponHarian*hariAccrued*units;
  const hariBerjalan=Math.max(0,Math.round((tglHitung-tglBeli)/(1000*60*60*24)));
  const kuponBerjalan=kuponHarianTotal*hariBerjalan*0.9;
  const capitalGain=(1-hargaBeliPct)*NOMINAL*units;
  const capitalGainPct=((1-hargaBeliPct)*100).toFixed(2);
  const totalKeuntungan=kuponBerjalan+capitalGain;
  const totalKeuntunganPct=totalModal>0?((totalKeuntungan/totalModal)*100).toFixed(2):0;
  const totalHari=Math.max(0,Math.round((tglJatuh-tglBeli)/(1000*60*60*24)));
  const proyeksiReturn=kuponHarianTotal*totalHari*0.9+capitalGain;
  const proyeksiReturnPct=totalModal>0?((proyeksiReturn/totalModal)*100).toFixed(2):0;
  const kuponBerikutnya=new Date(tglKuponTerakhir);
  while(kuponBerikutnya<=tglHitung)kuponBerikutnya.setMonth(kuponBerikutnya.getMonth()+6);
  const hariKuponBerikutnya=Math.round((kuponBerikutnya-tglHitung)/(1000*60*60*24));
  return{totalModal,kuponPenjual,kuponBerjalan,kuponHarian:kuponHarianTotal,capitalGain,capitalGainPct,totalKeuntungan,totalKeuntunganPct,proyeksiReturn,proyeksiReturnPct,units,yield_:rate,hargaBeliPct:hargaBeliPct*100,hariBerjalan,tglKuponTerakhirStr:tglKuponTerakhir.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),kuponBerikutnya:kuponBerikutnya.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),hariKuponBerikutnya,tglJatuhStr:tglJatuh.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),tglBeliStr:tglBeli.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})};
}
function updateObligasiPreview(){
  const rate=parseFloat(document.getElementById('fKuponRate').value)||0;
  const hargaBeliPct=parseFloat(document.getElementById('fHargaBeliPct').value)||100;
  const jumlahUnit=parseFloat(document.getElementById('fJumlahUnit').value)||0;
  const tglBeli=document.getElementById('fTglBeli').value;
  const tglKuponTerakhir=document.getElementById('fTglKuponTerakhir').value;
  const tglJatuh=document.getElementById('fTglJatuhTempo').value;
  const preview=document.getElementById('obligasiPreview');
  if(!rate||!jumlahUnit||!tglBeli||!tglJatuh){preview.style.display='none';return;}
  const NOMINAL=1000000;
  document.getElementById('fAmount').value=Math.round((hargaBeliPct/100)*NOMINAL*jumlahUnit);
  const mock={kupon_rate:rate,units:jumlahUnit,harga_beli_pct:hargaBeliPct,tgl_beli:tglBeli,tgl_jatuh_tempo:tglJatuh,tgl_kupon_terakhir:tglKuponTerakhir||null};
  const h=hitungObligasi(mock);
  preview.style.display='block';
  preview.innerHTML=`
    <div style="font-size:12px;font-weight:700;color:#6366f1;margin-bottom:10px">📋 Kalkulasi Obligasi FR</div>
    <div style="border-bottom:1px solid rgba(99,102,241,.15);padding-bottom:8px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Modal Investasi</span><b>${fmt(h.totalModal)}</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Kupon Penjual (gross)</span><b>${fmt(h.kuponPenjual)}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Kupon Berjalan (net)</span><b style="color:#16a34a">+${fmt(h.kuponBerjalan)}</b></div>
    </div>
    <div style="border-bottom:1px solid rgba(99,102,241,.15);padding-bottom:8px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Kupon Harian</span><b style="color:#16a34a">+${fmt(h.kuponHarian)}/hari</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Capital Gain/Loss</span><b style="color:${h.capitalGain>=0?'#16a34a':'#dc2626'}">${h.capitalGain>=0?'+':''}${fmt(h.capitalGain)} (${h.capitalGainPct}%)</b></div>
      <div style="display:flex;justify-content:space-between"><span><b>Total Keuntungan</b></span><b style="color:${h.totalKeuntungan>=0?'#16a34a':'#dc2626'}">${h.totalKeuntungan>=0?'+':''}${fmt(h.totalKeuntungan)} (${h.totalKeuntunganPct}%)</b></div>
    </div>
    <div style="border-bottom:1px solid rgba(99,102,241,.15);padding-bottom:8px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Unit Obligasi</span><b>${h.units}</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Harga Beli</span><b>${h.hargaBeliPct}%</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Yield</span><b>${h.yield_}%</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Tanggal Pembelian</span><b>${h.tglBeliStr}</b></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Jatuh Tempo</span><b>${h.tglJatuhStr}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Proyeksi Return</span><b style="color:#16a34a">${fmt(h.proyeksiReturn)} (${h.proyeksiReturnPct}%)</b></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#6366f1"><span>🗓️ Kupon berikutnya</span><b>${h.kuponBerikutnya} (${h.hariKuponBerikutnya} hari lagi)</b></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:4px"><span>Kupon terakhir otomatis</span><span>${h.tglKuponTerakhirStr}</span></div>
  `;
}

// ========== SAVE TRANSACTION ==========
async function saveTransaction(){
  const amount=parseFloat(document.getElementById('fAmount').value)||0;
  const date=document.getElementById('fDate').value;
  const description=document.getElementById('fDesc').value.trim();
  const cat_id=parseInt(document.getElementById('fCat').value);
  const note=document.getElementById('fNote').value.trim();
  if(!amount||!date||!description){alert('Lengkapi data terlebih dahulu!');return;}
  const obj={type:currentType,amount,date,description,cat_id,note,user_id:currentUser.id};
  const invType=getCatType(cat_id);
  if(currentType==='investasi'){
    if(invType==='saham'){
      obj.kode_saham=document.getElementById('fKodeSaham').value.trim().toUpperCase();
      obj.lot=parseFloat(document.getElementById('fLot').value)||0;
      obj.avg_price=parseFloat(document.getElementById('fAvgPrice').value)||0;
      obj.cur_price=parseFloat(document.getElementById('fCurPriceSaham').value)||0;
      obj.units=obj.lot;
      obj.buy_price=obj.avg_price;
    } else if(invType==='crypto'&&selectedCoin){
      obj.coin_id=selectedCoin.id;
      obj.coin_symbol=selectedCoin.symbol;
      obj.units=parseFloat(document.getElementById('fCoinQty').value)||0;
      obj.buy_price=parseFloat(document.getElementById('fCoinBuyPrice').value)||0;
      obj.cur_price=livePrices[selectedCoin.id]||0;
    } else if(invType==='emas'){
      obj.gold_gram=parseFloat(document.getElementById('fGoldGram').value)||0;
      obj.buy_price=parseFloat(document.getElementById('fGoldBuyPrice').value)||0;
      obj.cur_price=livePrices['gold']||0;
      obj.units=obj.gold_gram;
    } else if(invType==='obligasi'){
      const NOMINAL=1000000;
      obj.kupon_rate=parseFloat(document.getElementById('fKuponRate').value)||0;
      obj.harga_beli_pct=parseFloat(document.getElementById('fHargaBeliPct').value)||100;
      obj.nominal_per_unit=NOMINAL;
      obj.units=parseFloat(document.getElementById('fJumlahUnit').value)||1;
      obj.buy_price=(obj.harga_beli_pct/100)*NOMINAL;
      obj.cur_price=NOMINAL;
      obj.tgl_beli=document.getElementById('fTglBeli').value||null;
      obj.tgl_jatuh_tempo=document.getElementById('fTglJatuhTempo').value||null;
      obj.tgl_kupon_terakhir=document.getElementById('fTglKuponTerakhir').value||null;
      obj.amount=Math.round((obj.harga_beli_pct/100)*NOMINAL*obj.units);
    }
  }
  if(editId){await sb.from('transactions').update(obj).eq('id',editId);}
  else{await sb.from('transactions').insert(obj);}
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

// ========== AI ANALYSIS ==========
async function analyzeAsset(t){
  const c=getCat(t.cat_id);
  const modal=document.getElementById('analysisModalBg');
  const content=document.getElementById('analysisContent');
  const title=document.getElementById('analysisTitleText');
  title.textContent=`Analisa AI — ${t.description}`;
  content.textContent='⏳ Menganalisa...';
  modal.classList.add('open');
  const invType=getCatType(t.cat_id);
  let prompt='';
  if(invType==='saham'){
    prompt=`Berikan analisa fundamental singkat dan saran investasi untuk saham ${t.kode_saham} (IDX). Sertakan: kondisi bisnis terkini, valuasi, risiko, dan rekomendasi (buy/hold/sell) dengan alasan singkat. Gunakan bahasa Indonesia.`;
  } else if(invType==='crypto'){
    prompt=`Berikan analisa singkat dan saran untuk ${t.description} (${t.coin_symbol}). Sertakan: tren harga terkini, sentimen pasar, risiko, dan rekomendasi. Gunakan bahasa Indonesia.`;
  } else if(invType==='emas'){
    prompt=`Berikan analisa singkat tren harga emas saat ini dan prospek ke depan. Sertakan faktor yang mempengaruhi harga emas dan saran untuk investor emas fisik. Gunakan bahasa Indonesia.`;
  } else if(invType==='obligasi'){
    prompt=`Berikan analisa singkat untuk obligasi FR dengan yield ${t.kupon_rate}% jatuh tempo ${t.tgl_jatuh_tempo}. Sertakan analisa risiko suku bunga, prospek, dan apakah layak di-hold hingga jatuh tempo. Gunakan bahasa Indonesia.`;
  } else {
    prompt=`Berikan analisa singkat untuk investasi: ${t.description} senilai ${fmt(t.amount)}. Gunakan bahasa Indonesia.`;
  }
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        messages:[{role:'user',content:prompt}]
      })
    });
    const d=await r.json();
    content.textContent=d.content?.[0]?.text||'Tidak dapat menganalisa saat ini.';
  }catch(e){
    content.textContent='Error: Tidak dapat terhubung ke AI. Coba lagi nanti.';
  }
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
    <div class="card card-grad grad-pink"><div class="card-label"><i class="ti ti-arrow-down-circle"></i>Total Pemasukan</div><div class="card-value">${fmt(sumIn)}</div><div class="card-sub">${periodSub} · ${ins.length} transaksi</div></div>
    <div class="card card-grad grad-orange"><div class="card-label"><i class="ti ti-arrow-up-circle"></i>Total Pengeluaran</div><div class="card-value">${fmt(sumOut)}</div><div class="card-sub">${periodSub} · ${outs.length} transaksi</div></div>
    <div class="card card-grad grad-blue"><div class="card-label"><i class="ti ti-building-bank"></i>Total Investasi</div><div class="card-value">${fmt(sumInv)}</div><div class="card-sub">${periodSub} · ${invs.length} aset</div></div>
    <div class="card card-grad ${bal>=0?'grad-teal':'grad-rose'}"><div class="card-label"><i class="ti ti-wallet"></i>Saldo Bersih</div><div class="card-value">${fmt(bal)}</div><div class="card-sub">${bal>=0?'Keuangan sehat ✓':'Pengeluaran > Pemasukan'}</div></div>
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
  buildLineChart();buildDoughnut(sumIn,sumOut,sumInv);
}
function buildLineChart(){
  const months={};
  transactions.forEach(t=>{const m=t.date.slice(0,7);if(!months[m])months[m]={in:0,out:0,inv:0};months[m][t.type==='pemasukan'?'in':t.type==='pengeluaran'?'out':'inv']+=Number(t.amount);});
  const labels=Object.keys(months).sort().slice(-6);
  if(lineChart)lineChart.destroy();
  lineChart=new Chart(document.getElementById('chartLine'),{type:'line',data:{labels,datasets:[{label:'Pemasukan',data:labels.map(m=>(months[m]?.in||0)/1e6),borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,.08)',tension:.4},{label:'Pengeluaran',data:labels.map(m=>(months[m]?.out||0)/1e6),borderColor:'#dc2626',backgroundColor:'rgba(220,38,38,.08)',tension:.4},{label:'Investasi',data:labels.map(m=>(months[m]?.inv||0)/1e6),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.08)',tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>v+'jt'}}}}});
}
function buildDoughnut(sumIn,sumOut,sumInv){
  if(doughnutChart)doughnutChart.destroy();
  doughnutChart=new Chart(document.getElementById('chartDoughnut'),{type:'doughnut',data:{labels:['Pemasukan','Pengeluaran','Investasi'],datasets:[{data:[sumIn,sumOut,sumInv],backgroundColor:['#16a34a','#dc2626','#6366f1'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
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
    const ticker=t.kode_saham||t.coin_symbol?.toUpperCase()||'';
    return`<tr><td><div class="cat-row">${catIcon(c)}<span>${c?.name||'-'}</span></div></td><td>${t.description}${ticker?` <span class="badge badge-blue">${ticker}</span>`:''}</td><td style="color:var(--muted)">${t.date}</td><td><span class="badge ${badgeCls}">${t.type}</span></td><td style="color:var(--muted);font-size:12px">${t.note||'-'}</td><td class="${amtCls}" style="text-align:right">${sign}${fmt(t.amount)}</td><td><button class="btn btn-ghost btn-sm" onclick="openModal(${t.id})"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})" style="color:var(--red)"><i class="ti ti-trash"></i></button></td></tr>`;
  }).join('');
}

// ========== INVESTASI ==========
function getInvRow(t){
  const c=getCat(t.cat_id);
  const invType=getCatType(t.cat_id);
  const now=new Date();
  if(invType==='obligasi'&&t.kupon_rate){
    const h=hitungObligasi(t,now);
    return{...t,_modal:h.totalModal,_kini:h.totalModal+h.totalKeuntungan,_gain:h.totalKeuntungan,_pct:h.totalKeuntunganPct,_sub:`Yield ${h.yield_}% | Kupon ${fmt(h.kuponBerjalan)} | ${h.hariKuponBerikutnya}h ke kupon`,_type:'obligasi'};
  }
  if(invType==='saham'){
    const invested=(t.avg_price||t.buy_price||0)*(t.lot||t.units||0)*100;
    const cur=t.cur_price||0;
    const marketVal=cur?(t.lot||t.units||0)*100*cur:invested;
    const gain=marketVal-invested;
    const pct=invested?((gain/invested)*100).toFixed(2):0;
    return{...t,_modal:invested,_kini:marketVal,_gain:gain,_pct:pct,_sub:`${t.kode_saham||''} | ${t.lot||0} lot | Avg ${fmt(t.avg_price||0)}`,_type:'saham'};
  }
  if(invType==='crypto'){
    const curPrice=livePrices[t.coin_id]||t.cur_price||0;
    const invested=(t.buy_price||0)*(t.units||0);
    const marketVal=curPrice*(t.units||0)||invested;
    const gain=marketVal-invested;
    const pct=invested?((gain/invested)*100).toFixed(2):0;
    return{...t,_modal:invested,_kini:marketVal,_gain:gain,_pct:pct,_sub:`${(t.coin_symbol||'').toUpperCase()} | ${t.units||0} koin | Kini ${curPrice?fmt(curPrice):'—'}`,_type:'crypto'};
  }
  if(invType==='emas'){
    const curPrice=livePrices['gold']||t.cur_price||0;
    const invested=(t.buy_price||0)*(t.gold_gram||t.units||0);
    const marketVal=curPrice*(t.gold_gram||t.units||0)||invested;
    const gain=marketVal-invested;
    const pct=invested?((gain/invested)*100).toFixed(2):0;
    return{...t,_modal:invested,_kini:marketVal,_gain:gain,_pct:pct,_sub:`${t.gold_gram||t.units||0}gr | Beli ${fmt(t.buy_price||0)} | Kini ${curPrice?fmt(curPrice):'—'}/gr`,_type:'emas'};
  }
  const modal=Number(t.amount);
  const kini=t.cur_price&&t.units?t.cur_price*t.units:modal;
  const gain=kini-modal;
  const pct=modal?((gain/modal)*100).toFixed(1):0;
  return{...t,_modal:modal,_kini:kini,_gain:gain,_pct:pct,_sub:'',_type:'other'};
}

function renderInvest(){
  let invs=transactions.filter(t=>t.type==='investasi');
  if(activeInvFilter!=='semua'){
    invs=invs.filter(t=>{
      const type=getCatType(t.cat_id);
      if(activeInvFilter==='saham')return type==='saham';
      if(activeInvFilter==='crypto')return type==='crypto';
      if(activeInvFilter==='emas')return type==='emas';
      if(activeInvFilter==='obligasi')return type==='obligasi';
      return true;
    });
  }
  const rows=invs.map(getInvRow);
  const totalModal=rows.reduce((a,r)=>a+r._modal,0);
  const totalKini=rows.reduce((a,r)=>a+r._kini,0);
  const gain=totalKini-totalModal;
  const ret=totalModal?((gain/totalModal)*100).toFixed(2):0;
  document.getElementById('invModal').textContent=fmt(totalModal);
  document.getElementById('invGain').textContent=(gain>=0?'+':'')+fmt(gain);
  document.getElementById('invReturn').textContent=(ret>=0?'+':'')+ret+'%';
  const tb=document.getElementById('invTbl');
  if(!rows.length){tb.innerHTML='<tr><td colspan="6"><div class="empty"><i class="ti ti-inbox"></i>Belum ada investasi</div></td></tr>';return;}
  tb.innerHTML=rows.map(r=>{
    const c=getCat(r.cat_id);
    const typeIcon={saham:'📈',crypto:'₿',emas:'🥇',obligasi:'📋',other:'💼'}[r._type]||'💼';
    return`<tr>
      <td><div class="cat-row">${catIcon(c)}<div><div>${typeIcon} ${r.description}</div><div style="font-size:11px;color:var(--muted)">${r._sub}</div></div></div></td>
      <td><span class="badge badge-blue">${c?.name||'-'}</span></td>
      <td>${fmt(r._modal)}</td>
      <td>${fmt(r._kini)}</td>
      <td style="text-align:right"><span class="${r._gain>=0?'gain-pos':'gain-neg'}">${r._gain>=0?'+':''}${fmt(r._gain)}<br><small>${r._pct}%</small></span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="analyzeAsset(${JSON.stringify(r).replace(/"/g,'&quot;')})" title="Analisa AI"><i class="ti ti-robot"></i></button><button class="btn btn-ghost btn-sm" onclick="openModal(${r.id})"><i class="ti ti-edit"></i></button></td>
    </tr>`;
  }).join('');
  const catMap={};
  rows.forEach(r=>{const c=getCat(r.cat_id);const nm=c?c.name:'Lain';catMap[nm]=(catMap[nm]||0)+r._modal;});
  const lbls=Object.keys(catMap);
  if(invChart)invChart.destroy();
  invChart=new Chart(document.getElementById('chartInv'),{type:'doughnut',data:{labels:lbls,datasets:[{data:lbls.map(k=>catMap[k]),backgroundColor:['#2563eb','#7c3aed','#d97706','#16a34a','#dc2626','#0891b2'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
}

// ========== LAPORAN ==========
function renderLaporan(){
  const outMap={};
  transactions.filter(t=>t.type==='pengeluaran').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';outMap[nm]=(outMap[nm]||0)+Number(t.amount);});
  const outLbls=Object.keys(outMap);
  if(catChart)catChart.destroy();
  catChart=new Chart(document.getElementById('chartCat'),{type:'bar',data:{labels:outLbls,datasets:[{label:'Pengeluaran',data:outLbls.map(k=>outMap[k]/1e6),backgroundColor:'#dc2626',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45}}}}});
  const inMap={};
  transactions.filter(t=>t.type==='pemasukan').forEach(t=>{const c=getCat(t.cat_id);const nm=c?c.name:'Lain';inMap[nm]=(inMap[nm]||0)+Number(t.amount);});
  const inLbls=Object.keys(inMap);
  if(inCatChart)inCatChart.destroy();
  inCatChart=new Chart(document.getElementById('chartInCat'),{type:'bar',data:{labels:inLbls,datasets:[{label:'Pemasukan',data:inLbls.map(k=>inMap[k]/1e6),backgroundColor:'#16a34a',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxRotation:45}}}}});
  const months={};
  transactions.forEach(t=>{const m=t.date.slice(0,7);if(!months[m])months[m]={in:0,out:0,inv:0};months[m][t.type==='pemasukan'?'in':t.type==='pengeluaran'?'out':'inv']+=Number(t.amount);});
  const sorted=Object.keys(months).sort().reverse();
  const tb=document.getElementById('monthlyTbl');
  if(!sorted.length){tb.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-inbox"></i>Belum ada data</div></td></tr>';return;}
  tb.innerHTML=sorted.map(m=>{const d=months[m];const bal=d.in-d.out;return`<tr><td style="font-weight:500">${m}</td><td class="amt-in" style="text-align:right">+${fmt(d.in)}</td><td class="amt-out" style="text-align:right">-${fmt(d.out)}</td><td class="amt-inv" style="text-align:right">${fmt(d.inv)}</td><td style="text-align:right;font-weight:600;color:${bal>=0?'#16a34a':'#dc2626'}">${bal>=0?'+':''}${fmt(bal)}</td></tr>`;}).join('');
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
  await loadCategories();closeCatModal();renderCategories();
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
