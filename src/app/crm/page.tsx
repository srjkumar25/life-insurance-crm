"use client";
import { useCallback,useEffect,useMemo,useState,FormEvent } from "react";
import { supabase } from "../../lib/supabase/client";
import "./crm.css";

type Row = Record<string, any>;
const tabs=["Overview","Contacts","Calls & Notes","Follow-ups","Policies","References"] as const;
type Tab=typeof tabs[number];
const indianStates=[
 "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];
const date=(v?:string)=>v?new Date(v).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const inr=(v:any)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));

export default function CRMPage(){
 const [tab,setTab]=useState<Tab>("Overview"),[loading,setLoading]=useState(true),[error,setError]=useState(""),[user,setUser]=useState(""),[search,setSearch]=useState(""),[leadStatusFilter,setLeadStatusFilter]=useState<"All"|"Interested"|"Not Interested">("All");
 const [contacts,setContacts]=useState<Row[]>([]),[calls,setCalls]=useState<Row[]>([]),[followups,setFollowups]=useState<Row[]>([]),[policies,setPolicies]=useState<Row[]>([]),[refs,setRefs]=useState<Row[]>([]);
 const [modal,setModal]=useState<Tab|null>(null);
 const [editingPolicy,setEditingPolicy]=useState<Row|null>(null);
 const [editingContact,setEditingContact]=useState<Row|null>(null);
 const [editingReference,setEditingReference]=useState<Row|null>(null);
 const [contactReferences,setContactReferences]=useState<Row|null>(null);
 async function handleLogout() {
  setError("");
  const { error } = await supabase.auth.signOut();
  if (error) {
    setError(error.message);
    return;
  }
  window.location.replace("/login");
 }
 const load=useCallback(async()=>{
  setLoading(true);setError("");const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){window.location.replace("/login");return}
  setUser(auth.user.email||"");
  const [c,l,f,p,r]=await Promise.all([
   supabase.from("crm_contacts").select("*").order("created_at",{ascending:false}),
   supabase.from("crm_call_logs").select("*").order("call_at",{ascending:false}),
   supabase.from("crm_follow_ups").select("*").order("due_at"),
   supabase.from("crm_policies").select("*").order("created_at",{ascending:false}),
   supabase.from("crm_references").select("*").order("created_at",{ascending:false})
  ]);
  const err=c.error||l.error||f.error||p.error||r.error;if(err)setError(err.message);
  setContacts(c.data||[]);setCalls(l.data||[]);setFollowups(f.data||[]);setPolicies(p.data||[]);setRefs(r.data||[]);setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 const name=(id:string)=>contacts.find(c=>c.id===id)?.full_name||"Unknown contact";
 const due=followups.filter(f=>!["Completed","Cancelled"].includes(f.status));
 const today=new Date().toISOString().slice(0,10),dueToday=due.filter(f=>f.due_at.slice(0,10)===today).length,overdue=due.filter(f=>f.due_at.slice(0,10)<today).length;
 const issued=policies.filter(p=>p.policy_status==="Issued"),premium=issued.reduce((s,p)=>s+Number(p.premium_amount||0),0);
 const filtered=useMemo(()=>contacts.filter(c=>{
  const contactReferenceCount=refs.filter(r=>r.referrer_contact_id===c.id).length;
  const status=c.lead_status||"Interested";
  const matchesSearch=`${c.full_name} ${c.mobile} ${c.email||""} ${c.area||c.city||""} ${c.state||""}`.toLowerCase().includes(search.toLowerCase());
  const matchesStatus=leadStatusFilter==="All"||status===leadStatusFilter;
  const shouldHide=status==="Not Interested"&&contactReferenceCount===0;
  return matchesSearch&&matchesStatus&&!shouldHide;
}),[contacts,refs,search,leadStatusFilter]);
 async function save(e:FormEvent<HTMLFormElement>,table:string,close:()=>void){
  e.preventDefault();const fd=new FormData(e.currentTarget);const {data:auth}=await supabase.auth.getUser();if(!auth.user){setError("Please sign in again.");return}
  const val=(k:string)=>String(fd.get(k)||"").trim();let payload:Row={owner_id:auth.user.id};
  if(table==="crm_contacts")payload={...payload,full_name:val("full_name"),mobile:val("mobile"),email:val("email")||null,area:val("area")||null,state:val("state")||null,occupation:val("occupation"),lead_source:null,contact_permission:editingContact?.contact_permission||"Needs confirmation",lead_status:editingContact?.lead_status||"Interested",priority:editingContact?.priority||"Medium",notes:val("notes")||null};
  if(table==="crm_call_logs")payload={...payload,contact_id:val("contact_id"),call_at:val("call_at")?new Date(val("call_at")).toISOString():new Date().toISOString(),outcome:val("outcome"),discussion_notes:val("discussion_notes"),customer_need:val("customer_need")||null,objection_or_question:val("objection_or_question")||null,next_action:val("next_action")||null,next_follow_up_at:val("next_follow_up_at")?new Date(val("next_follow_up_at")).toISOString():null};
  if(table==="crm_follow_ups")payload={...payload,contact_id:val("contact_id"),due_at:new Date(val("due_at")).toISOString(),purpose:val("purpose"),status:"Pending"};
  if(table==="crm_policies")payload={...payload,contact_id:val("contact_id"),policyholder_name:val("policyholder_name"),insurer:val("insurer")||null,plan_name:val("plan_name")||null,policy_number:val("policy_number")||null,policy_status:val("policy_status"),premium_amount:val("premium_amount")?Number(val("premium_amount")):null,premium_frequency:val("premium_frequency")||null,sum_assured:val("sum_assured")?Number(val("sum_assured")):null,application_date:val("application_date")||null,agreed_date:val("agreed_date")||null,issue_date:val("issue_date")||null};
  if(table==="crm_references"){
   const newName=val("new_referred_name");
   const newMobile=val("new_referred_mobile");
   if(!newName){setError("Please enter the referred contact name.");return}
   if(!newMobile){setError("Please enter mobile number for the new referred contact.");return}
   const contactPayload={full_name:newName,mobile:newMobile,email:val("new_referred_email")||null,area:val("new_referred_area")||null,state:val("new_referred_state")||null,occupation:val("new_referred_occupation")||"Others",lead_source:null,lead_status:val("new_referred_lead_status")||"Interested",priority:val("new_referred_priority")||"Medium",notes:val("new_referred_notes")||null};
   let referredId:string;
   if(editingReference && editingReference.referred_contact_id){
    referredId=editingReference.referred_contact_id;
    const {error:contactUpdateError}=await supabase.from("crm_contacts").update(contactPayload).eq("id",referredId).eq("owner_id",auth.user.id);
    if(contactUpdateError){setError(contactUpdateError.message);return}
   }else{
    // Older reference rows may not have a linked contact. Create the contact now,
    // then link it to the existing reference record below.
    const {data:newContact,error:newContactError}=await supabase.from("crm_contacts").insert({owner_id:auth.user.id,...contactPayload,contact_permission: "Needs confirmation"}).select("id").single();
    if(newContactError){setError(newContactError.message);return}
    referredId=newContact.id;
   }
   payload={...payload,referrer_contact_id:val("referrer_contact_id"),referred_contact_id:referredId,permission_to_contact:editingReference?.permission_to_contact||"Pending",reference_status:editingReference?.reference_status||"Received",notes:editingReference?.notes||null};
  }
  const result = table === "crm_policies" && editingPolicy
   ? await supabase.from(table).update(payload).eq("id", editingPolicy.id).eq("owner_id", auth.user.id)
   : table === "crm_contacts" && editingContact
    ? await supabase.from(table).update(payload).eq("id",editingContact.id).eq("owner_id",auth.user.id)
    : table === "crm_references" && editingReference
     ? await supabase.from(table).update(payload).eq("id",editingReference.id).eq("owner_id",auth.user.id)
     : await supabase.from(table).insert(payload);
  if(result.error){setError(result.error.message);return}
  setEditingPolicy(null);setEditingContact(null);setEditingReference(null);close();await load();
 }
 async function updateContactField(contact:Row, field:"lead_status"|"priority", value:string){
  setError("");
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Please sign in again.");return}
  const {error}=await supabase.from("crm_contacts").update({[field]:value}).eq("id",contact.id).eq("owner_id",auth.user.id);
  if(error){setError(error.message);return}
  setContacts(current=>current.map(c=>c.id===contact.id?{...c,[field]:value}:c));
 }
 async function deletePolicy(p:Row){
  const ok=window.confirm(`Delete policy record for ${p.policyholder_name || "this policy"}? This cannot be undone.`);
  if(!ok)return;
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Please sign in again.");return}
  const {error}=await supabase.from("crm_policies").delete().eq("id",p.id).eq("owner_id",auth.user.id);
  if(error){setError(error.message);return}
  await load();
 }
async function complete(id: string) {
  setError("");

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    setError("Please sign in again.");
    return;
  }

  const { error } = await supabase
    .from("crm_follow_ups")
    .update({
      status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", auth.user.id);

  if (error) {
    setError(error.message);
    return;
  }

  await load();
}
 const opts=(items:Row[])=>items.map(c=>({value:c.id,label:`${c.full_name} — ${c.mobile}`}));
 return <main className="app"><aside className="side"><div className="brand"><b>LI</b><span><strong>LifeCare CRM</strong><small>Sales workspace</small></span></div><p className="navlabel">WORKSPACE</p>{tabs.map(t=><button key={t} className={tab===t?"nav active":"nav"} onClick={()=>setTab(t)}>{t}</button>)}<div className="userbox"><small>Signed in</small><b>{user||"Checking session…"}</b></div></aside>
 <section className="main"><header className="top"><div><small>LIFE INSURANCE</small><h1>{tab}</h1></div><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}><button className="btn secondary" onClick={()=>void load()}>Refresh</button><button className="btn secondary" onClick={()=>void handleLogout()}>Logout</button></div></header>
 {error&&<div className="error">{error}</div>}{loading?<p className="empty">Loading CRM…</p>:<>
 {tab==="Overview"&&<div className="content"><div className="hero"><div><small>YOUR SALES OVERVIEW</small><h2>Track every conversation and next step.</h2><p>Contacts, call notes, policy stages and referrals in one place.</p></div><button className="btn white" onClick={()=>{setTab("Contacts");setModal("Contacts")}}>+ Add contact</button></div><div className="metrics">{[[ "Contacts",contacts.length,"All saved contacts"],["Open leads",contacts.filter(c=>!["Policy Issued","Not Interested","Do Not Contact"].includes(c.lead_status)).length,"Still in progress"],["Due today",dueToday,`${overdue} overdue`],["Policies issued",issued.length,"Issued only"],["Issued premium",inr(premium),"Recorded premium total"],["References",refs.length,"Referral records"]].map(([a,b,c])=><div className="metric" key={String(a)}><small>{a}</small><strong>{b}</strong><span>{c}</span></div>)}</div><div className="panel"><h3>Upcoming / overdue follow-ups</h3>{due.slice(0,8).map(f=><div className="row" key={f.id}><div><b>{name(f.contact_id)}</b><small>{f.purpose}</small></div><span className={f.due_at.slice(0,10)<today?"late":"pill"}>{date(f.due_at)}</span><button className="btn secondary" onClick={()=>void complete(f.id)}>Complete</button></div>)}{!due.length&&<p className="empty">No open follow-ups. Add one after your next call.</p>}</div></div>}
 {tab==="Contacts"&&<div className="content"><div className="sectionhead"><div><h2>Contact directory</h2><p>Self contacts and referrals are grouped together.</p></div><button className="btn primary" onClick={()=>{setEditingContact(null);setModal("Contacts")}}>+ New contact</button></div><div className="contact-filters" style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:"16px",flexWrap:"wrap",marginBottom:"18px"}}><input className="search" style={{flex:"0 1 520px",width:"min(520px, 100%)",marginBottom:0}} placeholder="Search name, mobile, email or area…" value={search} onChange={e=>setSearch(e.target.value)}/><label className="field filter-field" style={{flex:"0 1 520px",width:"min(520px, 100%)",marginBottom:0}}><span>Filter by lead status</span><select value={leadStatusFilter} onChange={e=>setLeadStatusFilter(e.target.value as "All"|"Interested"|"Not Interested")}><option value="All">Both (Interested + Not Interested)</option><option value="Interested">Interested</option><option value="Not Interested">Not Interested</option></select></label></div><div className="tablewrap"><table><thead><tr><th>Contact Type</th><th>Name</th><th>Mobile</th><th>Email Id</th><th>Area</th><th>State</th><th>Lead Status</th><th>Priority</th><th>References</th><th>Actions</th><th>Edit</th></tr></thead><tbody>{(() => {
  const incoming=(id:string)=>refs.find(r=>r.referred_contact_id===id);
  const children=(id:string)=>contacts.filter(ch=>incoming(ch.id)?.referrer_contact_id===id);
  const visibleIds=new Set(filtered.map(c=>c.id));
  const renderContact=(c:Row,depth=0,seen=new Set<string>()):any=>{
   if(seen.has(c.id))return null;
   const nextSeen=new Set(seen);nextSeen.add(c.id);
   const contactRefs=refs.filter(r=>r.referrer_contact_id===c.id);
   const parentRef=incoming(c.id);
   const type=parentRef?"Referral":"Self";
   const isVisible=visibleIds.has(c.id);
   const childRows=children(c.id).map(ch=>renderContact(ch,depth+1,nextSeen));
   return <>{isVisible&&<tr key={c.id}><td><span className="pill">{type}</span></td><td style={{paddingLeft:`${16+depth*22}px`}}>{depth>0&&<span aria-hidden="true">↳ </span>}{c.full_name}</td><td>{c.mobile}</td><td>{c.email||"—"}</td><td>{c.area||c.city||"—"}</td><td>{c.state||"—"}</td><td><select aria-label={`Lead status for ${c.full_name}`} value={c.lead_status||"Interested"} onChange={e=>void updateContactField(c,"lead_status",e.target.value)}><option value="Interested">Interested</option><option value="Not Interested">Not Interested</option></select></td><td><select aria-label={`Priority for ${c.full_name}`} value={c.priority||"Medium"} onChange={e=>void updateContactField(c,"priority",e.target.value)}><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></td><td><strong>{contactRefs.length}</strong><small>references given</small></td><td><button type="button" className="btn secondary" onClick={()=>setContactReferences(c)}>View references</button></td><td><button type="button" className="btn secondary" onClick={()=>{setEditingContact(c);setModal("Contacts")}}>Edit</button></td></tr>}{childRows}</>;
  };
  const rootContacts=contacts.filter(c=>!incoming(c.id));
  return rootContacts.map(c=>renderContact(c));
 })()}</tbody></table>{!filtered.length&&<p className="empty">No contacts found.</p>}</div></div>}
 {tab==="Calls & Notes"&&<div className="content"><div className="sectionhead"><div><h2>Conversation history</h2><p>Each call is saved as a separate history item.</p></div><button className="btn primary" onClick={()=>setModal(tab)}>+ Log a call</button></div><div className="panel">{calls.map(c=><div className="history" key={c.id}><b>{name(c.contact_id)} · {c.outcome}</b><small>{date(c.call_at)}</small><p>{c.discussion_notes}</p>{c.next_action&&<small>Next action: {c.next_action}</small>}</div>)}{!calls.length&&<p className="empty">No calls logged yet.</p>}</div></div>}
 {tab==="Follow-ups"&&<div className="content"><div className="sectionhead"><div><h2>Follow-up planner</h2><p>Keep pending, completed and overdue tasks visible.</p></div><button className="btn primary" onClick={()=>setModal(tab)}>+ Schedule follow-up</button></div><div className="panel">{followups.map(f=><div className="row" key={f.id}><div><b>{name(f.contact_id)}</b><small>{f.purpose}</small></div><span className={f.status!=="Completed"&&f.due_at.slice(0,10)<today?"late":"pill"}>{date(f.due_at)} · {f.status}</span>{f.status!=="Completed"&&<button className="btn secondary" onClick={()=>void complete(f.id)}>Complete</button>}</div>)}{!followups.length&&<p className="empty">No follow-ups scheduled.</p>}</div></div>}
 {tab==="Policies"&&<div className="content"><div className="sectionhead"><div><h2>Policy pipeline</h2><p>Agreed is not the same as issued.</p></div><button className="btn primary" onClick={()=>setModal(tab)}>+ Add policy</button></div><div className="tablewrap"><table><thead><tr><th>Policyholder</th><th>Insurer / plan</th><th>Status</th><th>Premium</th><th>Frequency</th><th>Issue date</th><th>Actions</th></tr></thead><tbody>{policies.map(p=><tr key={p.id}><td>{p.policyholder_name}<small>{name(p.contact_id)}</small></td><td>{p.insurer||"—"}<small>{p.plan_name||""}</small></td><td><span className="pill">{p.policy_status}</span></td><td>{p.premium_amount==null?"—":inr(p.premium_amount)}</td><td>{p.premium_frequency||"—"}</td><td>{date(p.issue_date)}</td><td><div className="formactions"><button type="button" className="btn secondary" onClick={()=>{setEditingPolicy(p);setModal("Policies")}}>Edit</button><button type="button" className="btn secondary" onClick={()=>void deletePolicy(p)}>Delete</button></div></td></tr>)}</tbody></table>{!policies.length&&<p className="empty">No policy records yet.</p>}</div></div>}
 {tab==="References"&&<div className="content"><div className="sectionhead"><div><h2>Reference network</h2><p>Confirm permission before contacting a referred person.</p></div><button className="btn primary" onClick={()=>setModal(tab)}>+ Add reference</button></div><div className="tablewrap"><table><thead><tr><th>Referrer</th><th>Referred contact</th><th>Mobile No</th><th>Email Id</th><th>Notes</th></tr></thead><tbody>{refs.map(r=>{const referred=contacts.find(c=>c.id===r.referred_contact_id);return <tr key={r.id}><td>{name(r.referrer_contact_id)}</td><td>{referred?.full_name||"Not linked"}</td><td>{referred?.mobile||"—"}</td><td>{referred?.email||"—"}</td><td>{r.notes||"—"}</td></tr>})}</tbody></table>{!refs.length&&<p className="empty">No references recorded.</p>}</div></div>}
 </>}
 </section>
 {contactReferences&&<Modal title={`References for ${contactReferences.full_name}`} close={()=>setContactReferences(null)}><div className="panel">{refs.filter(r=>r.referrer_contact_id===contactReferences.id).map(r=><div className="history" key={r.id}><b>{r.referred_contact_id?name(r.referred_contact_id):"Unlinked referral"}</b><small>{r.reference_status} · Permission: {r.permission_to_contact}</small>{r.notes&&<p>{r.notes}</p>}</div>)}{!refs.some(r=>r.referrer_contact_id===contactReferences.id)&&<p className="empty">No references have been recorded for this contact.</p>}<div className="formactions"><button type="button" className="btn secondary" onClick={()=>{setContactReferences(null);setTab("References");setModal("References")}}>+ Add reference</button><button type="button" className="btn primary" onClick={()=>setContactReferences(null)}>Close</button></div></div></Modal>}
 {modal&&<Modal title={modal==="Contacts"?(editingContact?"Edit contact":"Add contact"):modal==="Calls & Notes"?"Log a call":modal==="Follow-ups"?"Schedule follow-up":modal==="Policies"?(editingPolicy?"Edit policy record":"Add policy record"):modal==="References"?(editingReference?"Edit reference":"Add reference"):""} close={()=>{setModal(null);setEditingPolicy(null);setEditingContact(null);setEditingReference(null)}}><form onSubmit={e=>void save(e,({"Contacts":"crm_contacts","Calls & Notes":"crm_call_logs","Follow-ups":"crm_follow_ups","Policies":"crm_policies","References":"crm_references"} as Record<string,string>)[modal],()=>setModal(null))}>
 {modal==="Contacts"&&<><Field label="Name" name="full_name" required defaultValue={editingContact?.full_name}/><Field label="Mobile" name="mobile" required defaultValue={editingContact?.mobile}/><Field label="Email Id" name="email" type="email" defaultValue={editingContact?.email}/><Field label="Area" name="area" defaultValue={editingContact?.area||editingContact?.city}/><Select label="State" name="state" options={[{value:"",label:"Select state"},...indianStates]} defaultValue={editingContact?.state||""}/><Select label="Occupation" name="occupation" options={["Job","Business","Freelancer","Consultant","Others"]} defaultValue={editingContact?.occupation}/><Field label="Initial Notes" name="notes" defaultValue={editingContact?.notes}/></>}
 {modal==="Calls & Notes"&&<><Select label="Contact" name="contact_id" options={opts(contacts)} required/><Field label="Call date/time" name="call_at" type="datetime-local"/><Select label="Outcome" name="outcome" options={["No Answer","Connected","Interested","Follow-up Needed","Not Interested","Requested Callback","Agreed","Application Pending","Policy Issued","Do Not Contact"]}/><Field label="Discussion notes" name="discussion_notes" required/><Field label="Customer need / goal" name="customer_need"/><Field label="Objection / question" name="objection_or_question"/><Field label="Next action" name="next_action"/><Field label="Next follow-up date/time" name="next_follow_up_at" type="datetime-local"/></>}
 {modal==="Follow-ups"&&<><Select label="Contact" name="contact_id" options={opts(contacts)} required/><Field label="Due date/time" name="due_at" type="datetime-local" required/><Field label="Purpose" name="purpose" required/></>}
 {modal==="Policies"&&<><Select label="Contact" name="contact_id" options={opts(contacts)} required defaultValue={editingPolicy?.contact_id}/><Field label="Policyholder name" name="policyholder_name" required defaultValue={editingPolicy?.policyholder_name}/><Field label="Insurer" name="insurer" defaultValue={editingPolicy?.insurer}/><Field label="Plan name" name="plan_name" defaultValue={editingPolicy?.plan_name}/><Field label="Policy number" name="policy_number" defaultValue={editingPolicy?.policy_number}/><Select label="Policy status" name="policy_status" options={["Lead","Illustration Shared","Agreed","Application Pending","Underwriting","Issued","Declined","Withdrawn","Lapsed"]} defaultValue={editingPolicy?.policy_status}/><Field label="Premium amount (₹)" name="premium_amount" type="number" defaultValue={editingPolicy?.premium_amount}/><Select label="Premium frequency" name="premium_frequency" options={["Annual","Monthly","Quarterly","Half-Yearly","Single"]} defaultValue={editingPolicy?.premium_frequency}/><Field label="Sum assured (₹)" name="sum_assured" type="number" defaultValue={editingPolicy?.sum_assured}/><Field label="Application date" name="application_date" type="date" defaultValue={editingPolicy?.application_date}/><Field label="Agreed date" name="agreed_date" type="date" defaultValue={editingPolicy?.agreed_date}/><Field label="Issue date" name="issue_date" type="date" defaultValue={editingPolicy?.issue_date}/></>}
  {modal==="References"&&<><Select label="Referred by" name="referrer_contact_id" options={opts(contacts)} required defaultValue={editingReference?.referrer_contact_id}/><p className="empty">{editingReference?"Update the linked referred contact details below.":"Enter the new referred contact details below. The contact will be saved and shown under the selected referrer."}</p><Field label="New referred contact name" name="new_referred_name" required defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.full_name}/><Field label="New referred contact mobile" name="new_referred_mobile" required defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.mobile}/><Field label="New referred contact email" name="new_referred_email" type="email" defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.email}/><Field label="New referred contact area" name="new_referred_area" defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.area}/><Select label="New referred contact state" name="new_referred_state" options={[{value:"",label:"Select state"},...indianStates]} defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.state||""}/><Select label="New referred contact occupation" name="new_referred_occupation" options={["Job","Business","Freelancer","Consultant","Others"]} defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.occupation}/><Select label="New referred contact lead status" name="new_referred_lead_status" options={["Interested","Not Interested"]} defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.lead_status||"Interested"}/><Select label="New referred contact priority" name="new_referred_priority" options={["High","Medium","Low"]} defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.priority||"Medium"}/><Field label="New referred contact initial notes" name="new_referred_notes" defaultValue={contacts.find(c=>c.id===editingReference?.referred_contact_id)?.notes}/></>}
 <div className="formactions"><button type="button" className="btn secondary" onClick={()=>{setModal(null);setEditingPolicy(null);setEditingContact(null);setEditingReference(null)}}>Cancel</button><button type="submit" className="btn primary">{(modal==="Policies"&&editingPolicy)||(modal==="References"&&editingReference)||(modal==="Contacts"&&editingContact)?"Save changes":"Save record"}</button></div></form></Modal>}
 </main>
}
function Field({label,name,type="text",required=false,defaultValue}:{label:string;name:string;type?:string;required?:boolean;defaultValue?:string|number|null}){return <label className="field"><span>{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue??""}/></label>}
function Select({label,name,options,required=false,defaultValue}:{label:string;name:string;options:(string|{value:string;label:string})[];required?:boolean;defaultValue?:string|null}){return <label className="field"><span>{label}</span><select name={name} required={required} defaultValue={defaultValue??(typeof options[0]==="string"?options[0]:options[0]?.value)} >{options.map(o=>{const v=typeof o==="string"?o:o.value;return <option key={v} value={v}>{typeof o==="string"?o:o.label}</option>})}</select></label>}
function Modal({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal"><header><h2>{title}</h2><button type="button" onClick={close}>×</button></header><div className="fields">{children}</div></section></div>}