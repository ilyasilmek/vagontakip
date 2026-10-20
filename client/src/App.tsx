import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, CircleUserRound, Cloud, CloudOff, House, LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck, Smartphone, TrainFront, TriangleAlert, Wrench } from 'lucide-react';
import type { CollectionName, DataResponse, OperationalRecord, SafeUser } from '../../shared/types';
import { api, ApiError, cacheClear, cacheRead, cacheWrite } from './api';
import Login, { Brand } from './Login';
import Dashboard from './Dashboard';
import Collection from './Collection';
import RecordEditor from './RecordEditor';
import Admin, { initials } from './Admin';
import Account from './Account';
import Install, { useInstall } from './Install';
import Startup from './Startup';
import Maintenance from './Workshop';
import SimpleWorkEntry from './SimpleWorkEntry';
import { rowValue } from './records';
import { useTheme } from './theme';
import { useStartupAnimation } from './startupPreference';

import { usePageNavigation } from './navigation';
const primaryNavigation = [
  { page: 'dashboard', label: 'Genel bakış', mobile: 'Özet', Icon: LayoutDashboard },
  { page: 'wagons', label: 'Vagonlar', mobile: 'Vagonlar', Icon: TrainFront },
  { page: 'parts', label: 'Parçalar', mobile: 'Parçalar', Icon: Package },
  { page: 'inventory', label: 'Demirbaşlar', mobile: 'Demirbaş', Icon: Wrench },
] as const;

export default function App() {
  const { theme, changeTheme } = useTheme();
  const { startupAnimation, changeStartupAnimation } = useStartupAnimation();
  const [intro, setIntro] = useState(startupAnimation);
  const finishIntro = useCallback(() => setIntro(false), []);
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [data, setData] = useState<DataResponse | null>(null);
  const { page, navigate: setPage, reset: resetNavigation } = usePageNavigation();
  const [connected, setConnected] = useState(navigator.onLine);
  const [remote, setRemote] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editor, setEditor] = useState<{ collection: CollectionName; record: OperationalRecord | null } | null>(null);
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const [maintenanceDraft, setMaintenanceDraft] = useState<{ wagonNumber: string; wagonId?:string; newWagon?: Record<string,string|number> } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceRefreshKey, setMaintenanceRefreshKey] = useState(0);
  const [installOpen, setInstallOpen] = useState(false);
  const install = useInstall();
  const snapshot = useRef<DataResponse | null>(null);
  const epoch = useRef(0);
  const inflight = useRef<number | null>(null);
  const online = connected && remote;
  const notify = useCallback((message: string) => setToast(message), []);
  const expired = useCallback(() => {
    epoch.current += 1; setUser(null); setData(null); snapshot.current = null; setEditor(null); setMaintenanceDraft(null); setRemote(false); resetNavigation();
    void cacheClear().catch(() => {});
    setError('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  }, [resetNavigation]);

  async function startWagonMaintenance(newWagon?:Record<string,string|number>) {
    if (!online || maintenanceLoading || editor?.collection !== 'wagons' || (!editor.record && !newWagon) || !data?.maintenanceEnabled) return;
    const wagonNumber = newWagon ? String(newWagon.number) : rowValue(editor.record!, 'number');
    const sourceId = editor.record?.id;
    const sessionEpoch = epoch.current;
    setMaintenanceLoading(true);
    try {
      await api(user?.role === 'admin' ? '/workshop' : '/workshop/work-catalog');
      if (epoch.current === sessionEpoch && editorRef.current?.collection === 'wagons' && editorRef.current.record?.id === sourceId) setMaintenanceDraft({wagonNumber,wagonId:sourceId,newWagon});
    } catch(reason) {
      if(reason instanceof ApiError && reason.status===401) expired();
      else notify('Bakım formu açılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {setMaintenanceLoading(false);}
  }

  const refresh = useCallback(async (announce = false) => {
    if (inflight.current === epoch.current || !navigator.onLine) return;
    const currentEpoch = epoch.current;
    inflight.current = currentEpoch; setSyncing(true);
    try {
      const result = await api<DataResponse>('/data');
      if (currentEpoch !== epoch.current) return;
      if (snapshot.current && result.version !== snapshot.current.version && announce) setUpdated(true);
      snapshot.current = result; setData(result); setUser(result.user); setRemote(true); setError('');
      void cacheWrite(result).catch(() => {});
    } catch (reason) {
      if (currentEpoch !== epoch.current) return;
      if (reason instanceof ApiError && reason.status === 401) { expired(); return; }
      if (reason instanceof ApiError && reason.status === 403) { expired(); return; }
      setRemote(false);
      setError(reason instanceof ApiError ? reason.message : 'Sunucuya ulaşılamıyor. Son alınan kayıtları görüntülüyorsunuz. Bağlantı geri geldiğinde tekrar eşitlenecek.');
    } finally { if (inflight.current === currentEpoch) { inflight.current = null; setSyncing(false); } }
  }, [expired]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const session = await api<{ user: SafeUser | null }>('/session');
        if (cancelled) return;
        if (!session.user) { await cacheClear().catch(() => {}); return; }
        setUser(session.user);
        const cached = await cacheRead<DataResponse>().catch(() => null);
        if (cancelled) return;
        if (cached && cached.user.id === session.user.id) { snapshot.current = cached; setData(cached); }
        else await cacheClear().catch(() => {});
        await refresh();
      } catch {
        const cached = await cacheRead<DataResponse>().catch(() => null);
        if (cancelled) return;
        if (cached) { snapshot.current = cached; setData(cached); setUser(cached.user); setRemote(false); }
      } finally { if (!cancelled) setBooting(false); }
    }
    void boot();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    const networkOnline = () => { setConnected(true); if (snapshot.current) void refresh(true); };
    const networkOffline = () => { setConnected(false); setRemote(false); };
    window.addEventListener('online', networkOnline); window.addEventListener('offline', networkOffline);
    const focus = () => { if (document.visibilityState === 'visible' && snapshot.current) void refresh(true); };
    document.addEventListener('visibilitychange', focus);
    return () => { window.removeEventListener('online', networkOnline); window.removeEventListener('offline', networkOffline); document.removeEventListener('visibilitychange', focus); };
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 15000);
    return () => window.clearInterval(interval);
  }, [user?.id, refresh]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page]);
  useEffect(() => { if ((page === 'admin'||page === 'planning') && user?.role !== 'admin') setPage('account'); }, [page, user?.role, setPage]);

  async function login(nextUser: SafeUser) {
    epoch.current += 1; await cacheClear().catch(() => {}); snapshot.current = null;
    setUser(nextUser); setData(null); resetNavigation(); setError(''); setBooting(true);
    await refresh(); setBooting(false);
  }
  async function logout() {
    if (!online) return;
    try {
      await api('/logout', 'POST', {}); epoch.current += 1;
      await cacheClear().catch(() => {}); snapshot.current = null;
      setUser(null); setData(null); setEditor(null); setMaintenanceDraft(null); setRemote(false); resetNavigation(); setError('');
    } catch (reason) { if (reason instanceof ApiError && reason.status === 401) expired(); else notify('Çıkış yapılamadı. Bağlantınızı kontrol edin.'); }
  }
  async function saved(message: string) { setEditor(null); await refresh(); notify(message); }
  const edit = (collection: CollectionName, record: OperationalRecord | null) => setEditor({ collection, record });
  const navigation = primaryNavigation;
  // The request removes maintenance from the desktop sidebar; keep its mobile shortcut in the test pilot.
  const mobileNavigation = data?.maintenanceEnabled ? [...navigation, { page: 'maintenance' as const, mobile: 'Bakım', Icon: Wrench }] : navigation;
  const currentName = page === 'admin' ? 'Yönetim' : page === 'planning' ? 'Planlama' : page === 'account' ? 'Hesabım' : navigation.find(item => item.page === page)?.label || 'Genel bakış';

  if (intro && startupAnimation) return <Startup onDone={finishIntro} />;
  if (booting) return <div className="loading-screen"><Brand /><div className="spinner" /><p>Kayıtlar yükleniyor…</p></div>;
  if (!user) return <>{import.meta.env.VITE_TEST_ENVIRONMENT === 'true' && <div className="notice test-notice">TEST ORTAMI · Kullanıcı adı: testadmin. Canlı girişten ayrıdır.</div>}{error && <div className="login-session-notice" role="status">{error}</div>}<Login onLogin={login} /></>;
  if (!data) return <div className="loading-screen"><Brand /><div className="notice error"><TriangleAlert /><span>{error || 'Kayıtlar alınamadı. İnternet bağlantınızı kontrol edin.'}</span></div><button className="primary" onClick={() => void refresh()} disabled={syncing}><RefreshCw className={syncing ? 'spin' : ''} /> Tekrar dene</button><button className="secondary" onClick={async () => { try { await api('/logout', 'POST', {}); } finally { expired(); } }}>Giriş ekranına dön</button></div>;

  return <div className="app-shell"><aside className="sidebar"><Brand /><div className="nav-caption">ÇALIŞMA ALANI</div><nav className="side-nav" aria-label="Ana gezinme">{navigation.map(({ page: target, label, Icon }) => <button key={target} className={`nav-button ${page === target ? 'active' : ''}`} onClick={() => setPage(target)} aria-current={page === target ? 'page' : undefined}><Icon /> {label}</button>)}{user.role === 'admin' && <button className={`nav-button ${page === 'admin' ? 'active' : ''}`} onClick={() => setPage('admin')} aria-current={page === 'admin' ? 'page' : undefined}><ShieldCheck /> Yönetim</button>}<button className={`nav-button ${page === 'account' ? 'active' : ''}`} onClick={() => setPage('account')} aria-current={page === 'account' ? 'page' : undefined}><CircleUserRound /> Hesabım</button></nav><div className="sidebar-bottom"><div className="sidebar-tip"><Smartphone size={23} /><h3>Telefona kurulum</h3><p>Ana ekrandan kayıtlara erişin.</p><button className="secondary" onClick={() => setInstallOpen(true)}><ArrowDownToLine /> {install.installed ? 'Yükleme bilgisi' : 'Telefona yükle'}</button></div><div className="profile"><div className="avatar">{initials(user.displayName)}</div><div className="profile-name">{user.displayName}<small>{user.role === 'admin' ? 'Yönetici hesabı' : 'Ekip hesabı'}</small></div><button className="icon-button" aria-label="Çıkış yap" disabled={!online} onClick={() => void logout()}><LogOut size={15} /></button></div></div></aside><div className="main-shell">{data.maintenanceEnabled && <div className="test-watermark" aria-hidden="true"><img src="/images/club-watermark.jpg" alt="" /></div>}<header className="topbar"><div className="breadcrumb"><House /> <span>/</span> <strong>{currentName}</strong></div><div className="mobile-brand"><Brand /></div><div className="topbar-right"><span className="topbar-date">{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date())}</span><span className={`sync-state ${online ? '' : 'offline'}`}>{syncing ? <RefreshCw className="spin" /> : online ? <Cloud /> : <CloudOff />}{syncing ? 'Eşitleniyor' : online ? 'Veriler güncel' : 'Çevrimdışı'}</span><button className="mobile-account-icon" onClick={() => setPage('account')} aria-label="Hesabımı aç"><div className="avatar">{initials(user.displayName)}</div></button></div></header><main className="content">
    {data.maintenanceEnabled && <div className="notice test-notice">TEST ORTAMI · Canlı kayıtlarınız etkilenmez. <a href="https://vagontakip.ilyasilmek.workers.dev">Canlı siteye dön</a></div>}
    {!online && <div className="notice" role="status"><CloudOff /><span>Son alınan kayıtları görüntülüyorsunuz. Ekleme ve düzenleme için internet bağlantısı gerekiyor.</span>{connected && <button onClick={() => void refresh()} disabled={syncing}>Yenile</button>}</div>}
    {error && data && connected && <div className="notice error" role="alert"><TriangleAlert /><span>{error}</span><button onClick={() => void refresh()} disabled={syncing}>Tekrar dene</button></div>}
    {updated && <div className="notice update-banner" role="status"><Check /><span>Ekibin son değişiklikleri alındı. Kayıtlarınız güncel.</span><button onClick={() => setUpdated(false)}>Tamam</button></div>}
    {page === 'dashboard' && <Dashboard data={data} online={online} isAdmin={user.role==='admin'} onPlan={()=>setPage('planning')} onNavigate={setPage} onEdit={edit} notify={notify} />}
    {(page === 'wagons' || page === 'parts' || page === 'inventory') && <Collection key={page} collection={page} rows={data[page]} online={online} onEdit={record => edit(page, record)} updatedAt={data.updatedAt} />}
    {page === 'maintenance' && data.maintenanceEnabled && <Maintenance user={user} online={online} onExpired={expired} notify={notify} />}
    {page === 'planning' && data.maintenanceEnabled && user.role==='admin' && <Maintenance planning user={user} online={online} onExpired={expired} notify={notify} />}
    {page === 'admin' && user.role === 'admin' && <Admin online={online} onExpired={expired} notify={notify} />}
    {page === 'account' && <Account startupAnimation={startupAnimation} onStartupAnimationChange={changeStartupAnimation} theme={theme} onThemeChange={changeTheme} onUpdated={setUser} user={user} online={online} onLogout={logout} onExpired={expired} notify={notify} />}
  </main></div><nav className="mobile-bottom" aria-label="Mobil gezinme">{mobileNavigation.map(({ page: target, mobile, Icon }) => <button key={target} className={`mobile-nav-button ${page === target ? 'active' : ''}`} onClick={() => setPage(target)} aria-current={page === target ? 'page' : undefined}><Icon /><span>{mobile}</span></button>)}<button className={`mobile-nav-button ${page === 'admin' || page === 'account' ? 'active' : ''}`} onClick={() => setPage(user.role === 'admin' ? 'admin' : 'account')} aria-current={page === 'admin' || page === 'account' ? 'page' : undefined}>{user.role === 'admin' ? <ShieldCheck /> : <CircleUserRound />}<span>{user.role === 'admin' ? 'Yönetim' : 'Hesabım'}</span></button></nav>{editor && <div inert={!!maintenanceDraft}><RecordEditor {...editor} wagons={data.wagons} onOpenExisting={wagon=>setEditor({collection:'wagons',record:wagon})} onNewMaintenance={data.maintenanceEnabled && editor.collection === 'wagons' && !editor.record ? fields => void startWagonMaintenance(fields) : undefined} maintenanceLoading={maintenanceLoading} maintenanceRefreshKey={maintenanceRefreshKey} onAddMaintenance={data.maintenanceEnabled && editor.collection === 'wagons' && editor.record ? () => void startWagonMaintenance() : undefined} user={user} online={online} onClose={() => setEditor(null)} onSaved={saved} onExpired={expired} onConflict={() => refresh()} /></div>}{maintenanceDraft && <SimpleWorkEntry user={user} wagonNumber={maintenanceDraft.wagonNumber} wagonId={maintenanceDraft.wagonId} newWagon={maintenanceDraft.newWagon} online={online} onExpired={expired} onClose={() => setMaintenanceDraft(null)} onSaved={async () => {setMaintenanceDraft(null); if(maintenanceDraft.newWagon) setEditor(null); await refresh(); setMaintenanceRefreshKey(value => value + 1); notify('Yapılan iş kaydedildi.');}} />}{installOpen && <Install {...install} onClose={() => setInstallOpen(false)} />}{toast && <div className="toast" role="status"><Check /><span>{toast}</span></div>}</div>;
}
