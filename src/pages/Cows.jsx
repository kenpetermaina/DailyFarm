import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PawPrint, Plus, Search, Pencil, Eye, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { listCows, updateCow } from '../services/cowService';
import { formatDate } from '../utils/dates';
import { Alert, EmptyState, PageHeader, Spinner } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import CowForm from '../components/CowForm';

export function CowAvatar({ cow }) {
  return cow.photo_url
    ? <img className="cow-thumb" src={cow.photo_url} alt={cow.name} />
    : <div className="cow-thumb"><PawPrint size={20} /></div>;
}

export default function Cows() {
  const { farm } = useAuth();
  const { version, notifyChange } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState(null); // cow object, or 'new'
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listCows(farm.id)
      .then((d) => alive && (setCows(d), setError('')))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [farm.id, version]);

  // Dashboard "Add Cow" quick action opens the form directly
  useEffect(() => {
    if (params.get('new')) { setEditing('new'); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cows.filter((c) =>
      (status === 'ALL' || c.status === status) &&
      (!q || c.name.toLowerCase().includes(q) || c.ear_tag.toLowerCase().includes(q) || (c.breed || '').toLowerCase().includes(q)));
  }, [cows, search, status]);

  const onSaved = useCallback((cow, wasEdit) => {
    setEditing(null);
    toast.success(wasEdit ? `${cow.name} was updated.` : `${cow.name} was added to your farm.`);
    notifyChange();
  }, [toast, notifyChange]);

  const toggleStatus = async () => {
    const cow = confirm;
    setBusy(true);
    try {
      await updateCow(cow.id, { status: cow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      toast.success(cow.status === 'ACTIVE' ? `${cow.name} was deactivated. Past records are kept.` : `${cow.name} is active again.`);
      notifyChange();
    } catch (e) { toast.error(e.message); }
    setBusy(false);
    setConfirm(null);
  };

  return (
    <>
      <PageHeader title="Manage Cows" subtitle={`${cows.filter((c) => c.status === 'ACTIVE').length} active · ${cows.length} total`}>
        <button className="btn" onClick={() => setEditing('new')}><Plus size={18} /> Add cow</button>
      </PageHeader>
      {error && <Alert>{error}</Alert>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <div className="field grow">
            <label htmlFor="search">Search</label>
            <div className="input-icon"><Search size={18} />
              <input id="search" className="input" placeholder="Name, ear tag or breed" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="status">Show</label>
            <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All cows</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <Spinner label="Loading cows…" /> : shown.length === 0 ? (
          cows.length === 0 ? (
            <EmptyState icon={PawPrint} title="No cows yet"
              action={<button className="btn" onClick={() => setEditing('new')}><Plus size={18} /> Add your first cow</button>}>
              Add your cows so you can start recording milk.
            </EmptyState>
          ) : <EmptyState icon={Search} title="No cows match your search">Try a different name or filter.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cow</th><th>Ear tag</th><th>Breed</th><th>Born</th><th>Status</th><th /></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cows/${c.id}`} className="cow-cell" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <CowAvatar cow={c} /><b>{c.name}</b>
                        {c.is_sample && <span className="badge badge-sample">Sample</span>}
                      </Link>
                    </td>
                    <td>{c.ear_tag}</td>
                    <td>{c.breed || '—'}</td>
                    <td className="nowrap">{c.date_of_birth ? formatDate(c.date_of_birth) : '—'}</td>
                    <td><span className={`badge ${c.status === 'ACTIVE' ? '' : 'badge-muted'}`}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></td>
                    <td className="actions">
                      <button className="icon-btn" title="View details" aria-label={`View ${c.name}`} onClick={() => navigate(`/cows/${c.id}`)}><Eye size={18} /></button>
                      <button className="icon-btn" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil size={18} /></button>
                      <button className="icon-btn" title={c.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} aria-label={`${c.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} ${c.name}`} onClick={() => setConfirm(c)}><Power size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add a cow' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <CowForm cow={editing === 'new' ? null : editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.status === 'ACTIVE' ? `Deactivate ${confirm.name}?` : `Reactivate ${confirm.name}?`}
          message={confirm.status === 'ACTIVE'
            ? `${confirm.name} will no longer appear when recording milk. All past milk records are kept.`
            : `${confirm.name} will appear again when recording milk.`}
          confirmLabel={confirm.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
          danger={confirm.status === 'ACTIVE'} busy={busy} onConfirm={toggleStatus} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
