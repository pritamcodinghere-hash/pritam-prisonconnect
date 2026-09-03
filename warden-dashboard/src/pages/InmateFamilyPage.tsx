import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { Inmate, Contact } from '@/services/api/wardenApi';

export function InmateFamilyPage() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddInmate, setShowAddInmate] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [searchPrisoner, setSearchPrisoner] = useState('');
  const [searchFamily, setSearchFamily] = useState('');
  const [editingInmate, setEditingInmate] = useState<Inmate | null>(null);
  const [editingFamily, setEditingFamily] = useState<Contact | null>(null);
  const [detailPrisoner, setDetailPrisoner] = useState<Inmate | null>(null);
  const [newInmate, setNewInmate] = useState({firstName:'',lastName:'',inmateId:'',facility:'Barrack A', kioskId:''});
  const [newFamily, setNewFamily] = useState({fullName:'',relationship:'',phoneNumber:'',inmateId:''});

  const dummyInmates: (Inmate & {kioskId?:string})[] = [
    { inmateId:'INM-1021', firstName:'Rahul', lastName:'Kumar', prisonId:'PR-01', facility:'Barrack A', cellBlock:'B-1', status:'active', photoUrl:'https://i.pravatar.cc/100?img=10', securityLevel:'medium', sentenceDetails:'2 years', kioskId:'KIOSK-01' } as any,
    { inmateId:'INM-1023', firstName:'Amit', lastName:'Sharma', prisonId:'PR-01', facility:'Barrack A', cellBlock:'B-2', status:'active', photoUrl:'https://i.pravatar.cc/100?img=11', securityLevel:'high', sentenceDetails:'5 years', kioskId:'KIOSK-02' } as any,
  ];
  const dummyContacts: Contact[] = [
    { id:'FAM-201', inmateId:'INM-1021', fullName:'Sunita Kumar', relationship:'Mother', phoneNumber:'9876543210', isApproved:true, photoUrl:'https://i.pravatar.cc/100?img=20', lastCallDate:new Date().toISOString(), nextScheduledCallDate:null },
    { id:'FAM-205', inmateId:'INM-1023', fullName:'Priya Sharma', relationship:'Wife', phoneNumber:'9876543211', isApproved:false, photoUrl:'https://i.pravatar.cc/100?img=21', lastCallDate:new Date().toISOString(), nextScheduledCallDate:null },
  ];

  const load = useCallback(async()=>{
    try{
      const [im, co] = await Promise.all([wardenApi.getInmates().catch(()=>[] as Inmate[]), wardenApi.getContacts().catch(()=>[] as Contact[])]);
      setInmates(im.length?im:dummyInmates);
      setContacts(co.length?co:dummyContacts);
    }catch{
      setInmates(dummyInmates); setContacts(dummyContacts);
    }finally{ setLoading(false); }
  },[]);
  useEffect(()=>{load();},[load]);

  const deleteInmate = (id:string)=> setInmates(s=>s.filter(i=>i.inmateId!==id));
  const updateInmate = () => { if(!editingInmate) return; setInmates(s=> s.map(i=> i.inmateId===editingInmate.inmateId ? editingInmate : i)); setEditingInmate(null); };
  const deleteFamily = (id:string)=> setContacts(s=>s.filter(c=>c.id!==id));
  const updateFamily = () => { if(!editingFamily) return; setContacts(s=> s.map(c=> c.id===editingFamily.id ? editingFamily : c)); setEditingFamily(null); };
  const toggleApproval = (id:string)=> setContacts(s=>s.map(c=> c.id===id ? {...c, isApproved:!c.isApproved} : c));
  const addInmate = ()=>{ if(!newInmate.inmateId||!newInmate.firstName||!newInmate.kioskId) return; setInmates(s=>[...s,{ inmateId:newInmate.inmateId, firstName:newInmate.firstName, lastName:newInmate.lastName, prisonId:'PR-01', facility:newInmate.facility, cellBlock:'B-X', status:'active', photoUrl:'https://i.pravatar.cc/100', securityLevel:'medium', sentenceDetails:'', kioskId:newInmate.kioskId } as any]); setNewInmate({firstName:'',lastName:'',inmateId:'',facility:'Barrack A', kioskId:''}); setShowAddInmate(false); };
  const addFamily = ()=>{ if(!newFamily.fullName||!newFamily.phoneNumber) return; const targetId = newFamily.inmateId || selectedId || inmates[0]?.inmateId || 'INM-1021'; setContacts(s=>[...s,{ id:`FAM-${Date.now()}`, inmateId:targetId, fullName:newFamily.fullName, relationship:newFamily.relationship, phoneNumber:newFamily.phoneNumber, isApproved:false, photoUrl:'https://i.pravatar.cc/100', lastCallDate:new Date().toISOString(), nextScheduledCallDate:null } as Contact]); setNewFamily({fullName:'',relationship:'',phoneNumber:'',inmateId:''}); setShowAddFamily(false); };

  const [prisonerPage, setPrisonerPage] = useState(1);
  const [familyPage, setFamilyPage] = useState(1);
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [relationFilter, setRelationFilter] = useState('all');

  if(loading) return <Loading message="Loading..." />;
  const selected = inmates.find(i=>i.inmateId===selectedId);
  const facilities = Array.from(new Set(inmates.map(i=>i.facility)));
  const relations = Array.from(new Set(contacts.map(c=>c.relationship)));
  const filteredPrisoners = inmates.filter(i=> (!searchPrisoner || `${i.firstName} ${i.lastName} ${i.inmateId} ${i.facility}`.toLowerCase().includes(searchPrisoner.toLowerCase())) && (facilityFilter==='all' || i.facility===facilityFilter));
  const familyOfSelected = selectedId ? contacts.filter(c=>c.inmateId===selectedId) : [];
  const filteredFamilyBase = familyOfSelected.filter(c=> (!searchFamily || `${c.fullName} ${c.relationship} ${c.phoneNumber}`.toLowerCase().includes(searchFamily.toLowerCase())) && (relationFilter==='all' || c.relationship===relationFilter));
  const prisonerTotalPages = Math.max(1, Math.ceil(filteredPrisoners.length/4));
  const familyTotalPages = Math.max(1, Math.ceil(filteredFamilyBase.length/4));
  const pagedPrisoners = filteredPrisoners.slice((prisonerPage-1)*4, prisonerPage*4);
  const filteredFamily = filteredFamilyBase.slice((familyPage-1)*4, familyPage*4);
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Prisoner & Family</h1><p className="text-neutral-500 text-sm">Click prisoner for details & family</p></div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm shadow-sm">👤</span> All Prisoners <span className="px-2.5 py-1 bg-neutral-900 text-white rounded-full text-xs font-bold">{filteredPrisoners.length}</span> {selected && <span className="text-sm font-medium text-primary-600">• {selected.firstName} selected</span>}</h2>
          <button onClick={()=>setShowAddInmate(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm shadow-sm hover:bg-primary-700 font-medium">+ Add Prisoner</button>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={searchPrisoner} onChange={e=>{setSearchPrisoner(e.target.value); setPrisonerPage(1)}} placeholder="Search prisoner..." className="flex-1 px-3 py-2 border-2 border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
          <select value={facilityFilter} onChange={e=>{setFacilityFilter(e.target.value); setPrisonerPage(1)}} className="px-3 py-2 border-2 border-neutral-200 rounded-lg text-sm"><option value="all">All Facilities</option>{facilities.map(f=><option key={f} value={f}>{f}</option>)}</select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Photo</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">ID</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Name</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Facility</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Kiosk</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Action</th></tr></thead>
            <tbody>
              {pagedPrisoners.map(i=>(
                <tr key={i.inmateId} onClick={()=>{setSelectedId(i.inmateId); setDetailPrisoner(i);}} className={`border-b hover:bg-neutral-50 cursor-pointer transition-colors ${selectedId===i.inmateId?'bg-primary-50 ring-1 ring-inset ring-primary-200':''}`}>
                  <td className="py-2.5 px-3"><img src={i.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" /></td>
                  <td className="py-2.5 px-3 text-sm font-mono font-medium">{i.inmateId}</td>
                  <td className="py-2.5 px-3 text-sm font-medium">{i.firstName} {i.lastName} {selectedId===i.inmateId && <span className="ml-2 text-xs text-primary-600 font-bold">←</span>}</td>
                  <td className="py-2.5 px-3 text-sm text-neutral-600">{i.facility} • {i.cellBlock} <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium border ${i.securityLevel==='high'?'bg-error/10 text-error border-error/20':i.securityLevel==='low'?'bg-success/10 text-success border-success/20':'bg-amber-100 text-amber-700 border-amber-200'}`}>{i.securityLevel}</span></td>
                  <td className="py-2.5 px-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${(i as any).kioskId?'bg-primary-600 text-white border-primary-600':'bg-amber-100 text-amber-700 border-amber-200'}`}>{(i as any).kioskId || 'Unassigned'}</span></td>
                  <td className="py-2.5 px-3"><span className="px-2.5 py-1 bg-success/10 text-success rounded-full text-xs font-medium border border-success/20">{i.status}</span></td>
                  <td className="py-2.5 px-3" onClick={e=>e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={()=>setEditingInmate({...i})} className="px-2.5 py-1.5 bg-white border border-primary-600 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-600 hover:text-white transition-colors">Edit</button>
                      <button onClick={()=>deleteInmate(i.inmateId)} className="px-2.5 py-1.5 bg-white border border-error text-error rounded-lg text-xs font-medium hover:bg-error hover:text-white transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prisonerTotalPages>1 && <div className="flex items-center justify-between mt-4 px-1"><span className="text-xs text-neutral-500">Showing {(prisonerPage-1)*4+1}-{Math.min(prisonerPage*4, filteredPrisoners.length)} of {filteredPrisoners.length}</span><div className="flex items-center gap-1"><button disabled={prisonerPage===1} onClick={()=>setPrisonerPage(1)} className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">«</button><button disabled={prisonerPage===1} onClick={()=>setPrisonerPage(p=>p-1)} className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">Prev</button><span className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium">{prisonerPage} / {prisonerTotalPages}</span><button disabled={prisonerPage===prisonerTotalPages} onClick={()=>setPrisonerPage(p=>p+1)} className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">Next</button><button disabled={prisonerPage===prisonerTotalPages} onClick={()=>setPrisonerPage(prisonerTotalPages)} className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-30 hover:bg-neutral-50">»</button></div></div>}
        {showAddInmate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowAddInmate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="font-bold mb-4">Add Prisoner - Assign Kiosk *</h3>
              <input placeholder="Inmate ID (INM-1026) *" value={newInmate.inmateId} onChange={e=>setNewInmate({...newInmate,inmateId:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="First Name *" value={newInmate.firstName} onChange={e=>setNewInmate({...newInmate,firstName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="Last Name" value={newInmate.lastName} onChange={e=>setNewInmate({...newInmate,lastName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <select value={newInmate.kioskId} onChange={e=>setNewInmate({...newInmate,kioskId:e.target.value})} className="w-full mb-3 px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">Select Kiosk * (required)</option>
                <option value="KIOSK-01">KIOSK-01 - Barrack A</option>
                <option value="KIOSK-02">KIOSK-02 - Barrack B</option>
                <option value="KIOSK-03">KIOSK-03 - Barrack C</option>
                <option value="KIOSK-04">KIOSK-04 - Visitor Hall</option>
              </select>
              <input placeholder="Facility" value={newInmate.facility} onChange={e=>setNewInmate({...newInmate,facility:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowAddInmate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={addInmate} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Prisoner Modal */}
      {editingInmate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setEditingInmate(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold mb-4">Edit Prisoner - {editingInmate.inmateId}</h3>
            <input value={editingInmate.firstName} onChange={e=>setEditingInmate({...editingInmate, firstName:e.target.value})} placeholder="First Name" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <input value={editingInmate.lastName} onChange={e=>setEditingInmate({...editingInmate, lastName:e.target.value})} placeholder="Last Name" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <input value={editingInmate.facility} onChange={e=>setEditingInmate({...editingInmate, facility:e.target.value})} placeholder="Facility" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setEditingInmate(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={updateInmate} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Family Modal */}
      {editingFamily && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setEditingFamily(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold mb-4">Edit Family - {editingFamily.fullName}</h3>
            <input value={editingFamily.fullName} onChange={e=>setEditingFamily({...editingFamily, fullName:e.target.value})} placeholder="Full Name" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <input value={editingFamily.relationship} onChange={e=>setEditingFamily({...editingFamily, relationship:e.target.value})} placeholder="Relationship" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <input value={editingFamily.phoneNumber} onChange={e=>setEditingFamily({...editingFamily, phoneNumber:e.target.value})} placeholder="Phone" className="w-full mb-3 px-3 py-2 border rounded-lg" />
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setEditingFamily(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={updateFamily} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View - Prisoner + Family */}
      {detailPrisoner && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={()=>setDetailPrisoner(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-auto p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Prisoner Details</h3>
              <button onClick={()=>setDetailPrisoner(null)} className="text-neutral-500 hover:text-neutral-900 text-xl">✕</button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl mb-6">
              <img src={detailPrisoner.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              <div>
                <p className="font-bold text-lg">{detailPrisoner.firstName} {detailPrisoner.lastName}</p>
                <p className="text-sm text-neutral-500">{detailPrisoner.inmateId} • {detailPrisoner.facility} • {detailPrisoner.cellBlock}</p>
                <p className="text-xs mt-1"><span className="px-2 py-0.5 bg-success/10 text-success rounded-full">{detailPrisoner.status}</span> <span className="ml-2 px-2 py-0.5 bg-neutral-200 rounded-full text-xs">{(detailPrisoner as any).kioskId || 'No kiosk'}</span></p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Family Members ({contacts.filter(c=>c.inmateId===detailPrisoner.inmateId).length})</h4>
              <button onClick={()=>{setNewFamily({...newFamily, inmateId:detailPrisoner.inmateId}); setShowAddFamily(true);}} className="px-3 py-1.5 bg-success text-white rounded-lg text-xs font-medium hover:bg-success-700">+ Add Family</button>
            </div>
            <div className="space-y-3">
              {contacts.filter(c=>c.inmateId===detailPrisoner.inmateId).length===0 ? <p className="text-sm text-neutral-500">No family - click + Add Family above</p> : contacts.filter(c=>c.inmateId===detailPrisoner.inmateId).map(c=>(
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <img src={c.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm font-medium">{c.fullName}</p>
                      <p className="text-xs text-neutral-500">{c.relationship} • {c.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={()=>setEditingFamily({...c})} className="px-2.5 py-1 text-xs border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-600 hover:text-white">Edit</button>
                    <button onClick={()=>deleteFamily(c.id)} className="px-2.5 py-1 text-xs border border-error text-error rounded-lg hover:bg-error hover:text-white">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
