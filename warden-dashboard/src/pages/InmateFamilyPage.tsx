import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Loading } from '@/components/States';
import { wardenApi } from '@/services/api/wardenApi';
import type { Inmate, Contact } from '@/services/api/wardenApi';

export function InmateFamilyPage() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inmates'|'family'>('inmates');
  const [showAddInmate, setShowAddInmate] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
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
  const addFamily = ()=>{ if(!newFamily.fullName||!newFamily.phoneNumber) return; setContacts(s=>[...s,{ id:`FAM-${Date.now()}`, inmateId:newFamily.inmateId||inmates[0]?.inmateId||'INM-1021', fullName:newFamily.fullName, relationship:newFamily.relationship, phoneNumber:newFamily.phoneNumber, isApproved:false, photoUrl:'https://i.pravatar.cc/100', lastCallDate:new Date().toISOString(), nextScheduledCallDate:null } as Contact]); setNewFamily({fullName:'',relationship:'',phoneNumber:'',inmateId:''}); setShowAddFamily(false); };

  if(loading) return <Loading message="Loading..." />;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Prisoner & Family</h1><p className="text-neutral-600">Manage inmates and family members - Add/Delete</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setTab('inmates')} className={`px-4 py-2 rounded-lg text-sm ${tab==='inmates'?'bg-neutral-900 text-white':'bg-white border'}`}>Prisoners ({inmates.length})</button>
          <button onClick={()=>setTab('family')} className={`px-4 py-2 rounded-lg text-sm ${tab==='family'?'bg-neutral-900 text-white':'bg-white border'}`}>Family ({contacts.length})</button>
        </div>
      </div>

      {tab==='inmates' ? (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Prisoners</h2>
            <button onClick={()=>setShowAddInmate(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">+ Add Prisoner</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-2 px-3 text-sm">Photo</th><th className="text-left py-2 px-3 text-sm">ID</th><th className="text-left py-2 px-3 text-sm">Name</th><th className="text-left py-2 px-3 text-sm">Facility</th><th className="text-left py-2 px-3 text-sm">Status</th><th className="text-left py-2 px-3 text-sm">Action</th></tr></thead>
              <tbody>
                {inmates.map(i=>(
                  <tr key={i.inmateId} className="border-b hover:bg-neutral-50">
                    <td className="py-2 px-3"><img src={i.photoUrl} alt="" className="w-8 h-8 rounded-full" /></td>
                    <td className="py-2 px-3 text-sm font-mono">{i.inmateId}</td>
                    <td className="py-2 px-3 text-sm">{i.firstName} {i.lastName}</td>
                    <td className="py-2 px-3 text-sm">{i.facility} • {i.cellBlock}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-xs">{i.status}</span></td>
                    <td className="py-2 px-3"><button onClick={()=>deleteInmate(i.inmateId)} className="px-3 py-1 bg-error text-white rounded text-xs">Delete</button></td>
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
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Family Members</h2>
            <button onClick={()=>setShowAddFamily(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">+ Add Family</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-2 px-3 text-sm">Photo</th><th className="text-left py-2 px-3 text-sm">Name</th><th className="text-left py-2 px-3 text-sm">Relation</th><th className="text-left py-2 px-3 text-sm">Inmate</th><th className="text-left py-2 px-3 text-sm">Phone</th><th className="text-left py-2 px-3 text-sm">Approved</th><th className="text-left py-2 px-3 text-sm">Action</th></tr></thead>
              <tbody>
                {contacts.map(c=>(
                  <tr key={c.id} className="border-b hover:bg-neutral-50">
                    <td className="py-2 px-3"><img src={c.photoUrl} alt="" className="w-8 h-8 rounded-full" /></td>
                    <td className="py-2 px-3 text-sm">{c.fullName}</td>
                    <td className="py-2 px-3 text-sm">{c.relationship}</td>
                    <td className="py-2 px-3 text-sm font-mono">{c.inmateId}</td>
                    <td className="py-2 px-3 text-sm">{c.phoneNumber}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.isApproved?'bg-success/10 text-success':'bg-amber-100 text-amber-700'}`}>{c.isApproved?'Yes':'Pending'}</span></td>
                    <td className="py-2 px-3"><button onClick={()=>deleteFamily(c.id)} className="px-3 py-1 bg-error text-white rounded text-xs">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showAddFamily && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowAddFamily(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold mb-4">Add Family Member</h3>
                <input placeholder="Full Name" value={newFamily.fullName} onChange={e=>setNewFamily({...newFamily,fullName:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
                <input placeholder="Relationship" value={newFamily.relationship} onChange={e=>setNewFamily({...newFamily,relationship:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
                <input placeholder="Phone" value={newFamily.phoneNumber} onChange={e=>setNewFamily({...newFamily,phoneNumber:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg" />
                <select value={newFamily.inmateId} onChange={e=>setNewFamily({...newFamily,inmateId:e.target.value})} className="w-full mb-3 px-3 py-2 border rounded-lg">
                  <option value="">Select Inmate</option>
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
      )}
    </div>
  );
}
