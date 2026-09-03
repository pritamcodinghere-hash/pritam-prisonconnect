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
  const [newInmate, setNewInmate] = useState({firstName:'',lastName:'',inmateId:'',facility:'Barrack A'});
  const [newFamily, setNewFamily] = useState({fullName:'',relationship:'',phoneNumber:'',inmateId:''});

  const dummyInmates: Inmate[] = [
    { inmateId:'INM-1021', firstName:'Rahul', lastName:'Kumar', prisonId:'PR-01', facility:'Barrack A', cellBlock:'B-1', status:'active', photoUrl:'https://i.pravatar.cc/100?img=10', securityLevel:'medium', sentenceDetails:'2 years' },
    { inmateId:'INM-1023', firstName:'Amit', lastName:'Sharma', prisonId:'PR-01', facility:'Barrack A', cellBlock:'B-2', status:'active', photoUrl:'https://i.pravatar.cc/100?img=11', securityLevel:'high', sentenceDetails:'5 years' },
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
  const deleteFamily = (id:string)=> setContacts(s=>s.filter(c=>c.id!==id));
  const addInmate = ()=>{ if(!newInmate.inmateId||!newInmate.firstName) return; setInmates(s=>[...s,{ inmateId:newInmate.inmateId, firstName:newInmate.firstName, lastName:newInmate.lastName, prisonId:'PR-01', facility:newInmate.facility, cellBlock:'B-X', status:'active', photoUrl:'https://i.pravatar.cc/100', securityLevel:'medium', sentenceDetails:'' } as Inmate]); setNewInmate({firstName:'',lastName:'',inmateId:'',facility:'Barrack A'}); setShowAddInmate(false); };
  const addFamily = ()=>{ if(!newFamily.fullName||!newFamily.phoneNumber) return; const targetId = newFamily.inmateId || selectedId || inmates[0]?.inmateId || 'INM-1021'; setContacts(s=>[...s,{ id:`FAM-${Date.now()}`, inmateId:targetId, fullName:newFamily.fullName, relationship:newFamily.relationship, phoneNumber:newFamily.phoneNumber, isApproved:false, photoUrl:'https://i.pravatar.cc/100', lastCallDate:new Date().toISOString(), nextScheduledCallDate:null } as Contact]); setNewFamily({fullName:'',relationship:'',phoneNumber:'',inmateId:''}); setShowAddFamily(false); };

  if(loading) return <Loading message="Loading..." />;
  const selected = inmates.find(i=>i.inmateId===selectedId);
  const filteredPrisoners = inmates.filter(i=> !searchPrisoner || `${i.firstName} ${i.lastName} ${i.inmateId} ${i.facility}`.toLowerCase().includes(searchPrisoner.toLowerCase()));
  const familyOfSelected = selectedId ? contacts.filter(c=>c.inmateId===selectedId) : [];
  const filteredFamily = familyOfSelected.filter(c=> !searchFamily || `${c.fullName} ${c.relationship} ${c.phoneNumber}`.toLowerCase().includes(searchFamily.toLowerCase()));
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Prisoner & Family</h1><p className="text-neutral-600">Side by side - Prisoner pe click karo, bagal me uski Family dikhegi</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Block 1 - All Prisoners - click to select - pro */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm">👤</span> All Prisoners <span className="px-2 py-0.5 bg-neutral-100 rounded-full text-xs font-medium">{filteredPrisoners.length}/{inmates.length}</span> {selected && <span className="text-sm font-normal text-primary-600">• {selected.firstName} selected</span>}</h2>
          <button onClick={()=>setShowAddInmate(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm shadow-sm hover:bg-primary-700">+ Add Prisoner</button>
        </div>
        <input value={searchPrisoner} onChange={e=>setSearchPrisoner(e.target.value)} placeholder="Search prisoner..." className="w-full mb-3 px-3 py-2 border-2 border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
        <div className="overflow-x-auto rounded-lg border border-neutral-100">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Photo</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">ID</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Name</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Facility</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Action</th></tr></thead>
            <tbody>
              {filteredPrisoners.map(i=>(
                <tr key={i.inmateId} onClick={()=>setSelectedId(i.inmateId)} className={`border-b hover:bg-neutral-50 cursor-pointer transition-colors ${selectedId===i.inmateId?'bg-primary-50 ring-1 ring-primary-200':''}`}>
                  <td className="py-2.5 px-3"><img src={i.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" /></td>
                  <td className="py-2.5 px-3 text-sm font-mono font-medium">{i.inmateId}</td>
                  <td className="py-2.5 px-3 text-sm font-medium">{i.firstName} {i.lastName} {selectedId===i.inmateId && <span className="ml-2 text-xs text-primary-600 font-semibold">←</span>}</td>
                  <td className="py-2.5 px-3 text-sm text-neutral-600">{i.facility} • {i.cellBlock} <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${i.securityLevel==='high'?'bg-error/10 text-error':i.securityLevel==='low'?'bg-success/10 text-success':'bg-amber-100 text-amber-700'}`}>{i.securityLevel}</span></td>
                  <td className="py-2.5 px-3"><span className="px-2.5 py-1 bg-success/10 text-success rounded-full text-xs font-medium">{i.status}</span></td>
                  <td className="py-2.5 px-3" onClick={e=>e.stopPropagation()}><button onClick={()=>deleteInmate(i.inmateId)} className="px-3 py-1.5 bg-white border border-error text-error rounded-lg text-xs font-medium hover:bg-error hover:text-white transition-colors">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showAddInmate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowAddInmate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="font-bold mb-4">Add Prisoner</h3>
              <input placeholder="Inmate ID (INM-1026)" value={newInmate.inmateId} onChange={e=>setNewInmate({...newInmate,inmateId:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="First Name" value={newInmate.firstName} onChange={e=>setNewInmate({...newInmate,firstName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="Last Name" value={newInmate.lastName} onChange={e=>setNewInmate({...newInmate,lastName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="Facility" value={newInmate.facility} onChange={e=>setNewInmate({...newInmate,facility:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowAddInmate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={addInmate} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Block 2 - Family of Selected Prisoner - side by side - pro */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-success text-white flex items-center justify-center text-sm">👨‍👩‍👧</span> {selected ? `Family of ${selected.firstName} ${selected.lastName}` : 'Family Members'} <span className="px-2 py-0.5 bg-neutral-100 rounded-full text-xs font-medium">{selectedId? familyOfSelected.length : contacts.length}</span></h2>
          <button onClick={()=>setShowAddFamily(true)} disabled={!selectedId} className={`px-4 py-2 rounded-lg text-sm shadow-sm ${selectedId?'bg-success text-white hover:bg-success-700':'bg-neutral-300 text-neutral-500 cursor-not-allowed'}`}>+ Add Family</button>
        </div>
        {!selectedId ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl"><p className="text-neutral-500">Prisoner table me kisi row pe click karo</p><p className="text-xs text-neutral-400 mt-1">uski family yaha side-by-side dikhegi</p></div>
        ) : (
        <>
        <input value={searchFamily} onChange={e=>setSearchFamily(e.target.value)} placeholder="Search family..." className="w-full mb-3 px-3 py-2 border-2 border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-success text-sm" />
        <div className="overflow-x-auto rounded-lg border border-neutral-100">
          <table className="w-full">
            <thead><tr className="border-b bg-neutral-50"><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Photo</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Name</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Relation</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Phone</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Approved</th><th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Action</th></tr></thead>
            <tbody>
              {(searchFamily? filteredFamily : familyOfSelected).length===0 ? <tr><td colSpan={6} className="text-center py-6 text-sm text-neutral-500">No family for {selected?.firstName} - Add karo</td></tr> : (searchFamily? filteredFamily : familyOfSelected).map(c=>(
                <tr key={c.id} className="border-b hover:bg-neutral-50">
                  <td className="py-2.5 px-3"><img src={c.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" /></td>
                  <td className="py-2.5 px-3 text-sm font-medium">{c.fullName}</td>
                  <td className="py-2.5 px-3 text-sm"><span className="px-2 py-1 bg-neutral-100 rounded-full text-xs">{c.relationship}</span></td>
                  <td className="py-2.5 px-3 text-sm font-mono text-xs">{c.phoneNumber}</td>
                  <td className="py-2.5 px-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.isApproved?'bg-success/10 text-success border border-success/20':'bg-amber-100 text-amber-700 border border-amber-200'}`}>{c.isApproved?'Approved':'Pending'}</span></td>
                  <td className="py-2.5 px-3"><button onClick={()=>deleteFamily(c.id)} className="px-3 py-1.5 bg-white border border-error text-error rounded-lg text-xs font-medium hover:bg-error hover:text-white transition-colors">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        {showAddFamily && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowAddFamily(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="font-bold mb-4">Add Family Member</h3>
              <input placeholder="Full Name" value={newFamily.fullName} onChange={e=>setNewFamily({...newFamily,fullName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="Relationship" value={newFamily.relationship} onChange={e=>setNewFamily({...newFamily,relationship:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <input placeholder="Phone" value={newFamily.phoneNumber} onChange={e=>setNewFamily({...newFamily,phoneNumber:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
              <select value={newFamily.inmateId} onChange={e=>setNewFamily({...newFamily,inmateId:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg">
                <option value="">{selectedId ? `Family for ${selected?.firstName} (${selectedId})` : 'Select Inmate'}</option>
                {inmates.map(i=><option key={i.inmateId} value={i.inmateId}>{i.firstName} {i.lastName} ({i.inmateId})</option>)}
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowAddFamily(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={addFamily} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
              </div>
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
